import os
import sqlite3
import time
import threading
from datetime import datetime, timedelta
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_PATH = os.path.abspath(os.path.join(DB_DIR, 'app.db'))

SCHEMA = """
-- Base tables
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost REAL DEFAULT 0.0
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level_created ON logs(level, created_at);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
"""

os.makedirs(DB_DIR, exist_ok=True)

_thread_local = threading.local()

def _prepare_connection(conn: sqlite3.Connection) -> sqlite3.Connection:
  # Improve durability/performance for WAL mode
  conn.execute('PRAGMA journal_mode=WAL;')
  conn.execute('PRAGMA synchronous=NORMAL;')
  conn.execute('PRAGMA temp_store=MEMORY;')
  conn.execute('PRAGMA cache_size=-20000;')  # ~20MB page cache
  conn.execute('PRAGMA foreign_keys=ON;')
  conn.row_factory = sqlite3.Row
  return conn

@contextmanager
def get_conn():
  # Lightweight per-call connection; SQLite is fast to open, uses WAL
  conn = _prepare_connection(sqlite3.connect(DB_PATH, check_same_thread=False))
  try:
    yield conn
  finally:
    try:
      conn.close()
    except Exception:
      pass

# Migrations (user_version)
# 0 -> 1: create base tables + indices
def _apply_migrations():
  with get_conn() as c:
    cur = c.execute('PRAGMA user_version')
    ver = cur.fetchone()[0]
    if ver < 1:
      c.executescript(SCHEMA)
      c.execute('PRAGMA user_version=1')
      c.commit()

_apply_migrations()

# Simple settings cache (Redis-like in-memory)
_settings_cache = {
  'data': None,
  'ts': 0.0,
}
_settings_cache_lock = threading.RLock()

def add_message(role: str, text: str, tokens_in=0, tokens_out=0, cost=0.0):
  with get_conn() as c:
    c.execute(
      "INSERT INTO conversations(role, text, tokens_in, tokens_out, cost) VALUES(?,?,?,?,?)",
      (role, text, tokens_in, tokens_out, cost)
    )
    c.commit()

def add_messages_batch(items):
  """Batch insert messages to avoid N+1 writes.
  items: list of dicts with keys role, text, tokens_in, tokens_out, cost
  """
  if not items:
    return
  with get_conn() as c:
    c.executemany(
      "INSERT INTO conversations(role, text, tokens_in, tokens_out, cost) VALUES(?,?,?,?,?)",
      [(
        it.get('role'), it.get('text'),
        int(it.get('tokens_in', 0)), int(it.get('tokens_out', 0)), float(it.get('cost', 0.0))
      ) for it in items]
    )
    c.commit()

def list_messages(limit=100):
  with get_conn() as c:
    cur = c.execute(
      "SELECT id, role, text, created_at, tokens_in, tokens_out, cost FROM conversations ORDER BY created_at DESC, id DESC LIMIT ?",
      (limit,)
    )
    rows = [
      {
        'id': r['id'], 'role': r['role'], 'text': r['text'], 'created_at': r['created_at'],
        'tokens_in': r['tokens_in'], 'tokens_out': r['tokens_out'], 'cost': r['cost']
      } for r in cur.fetchall()
    ]
    return rows

def clear_messages():
  with get_conn() as c:
    c.execute("DELETE FROM conversations")
    c.commit()

def add_log(level: str, message: str):
  with get_conn() as c:
    c.execute("INSERT INTO logs(level, message) VALUES(?,?)", (level, message))
    c.commit()

def list_logs(limit=200):
  with get_conn() as c:
    cur = c.execute(
      "SELECT id, level, message, created_at FROM logs WHERE created_at >= datetime('now', '-120 days') ORDER BY created_at DESC, id DESC LIMIT ?",
      (limit,)
    )
    return [ { 'id': r['id'], 'level': r['level'], 'message': r['message'], 'created_at': r['created_at'] } for r in cur.fetchall() ]

def set_setting(key: str, value: str):
  with get_conn() as c:
    c.execute(
      "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      (key, value)
    )
    c.commit()
  # Update cache
  with _settings_cache_lock:
    data = _settings_cache.get('data') or {}
    data[str(key)] = str(value)
    _settings_cache['data'] = data
    _settings_cache['ts'] = time.time()

def get_settings():
  with _settings_cache_lock:
    if _settings_cache['data'] is not None:
      # Return a shallow copy to avoid external mutation
      return dict(_settings_cache['data'])
  with get_conn() as c:
    cur = c.execute("SELECT key, value FROM settings")
    out = { k: v for k, v in cur.fetchall() }
  with _settings_cache_lock:
    _settings_cache['data'] = dict(out)
    _settings_cache['ts'] = time.time()
  return out

def invalidate_settings_cache():
  with _settings_cache_lock:
    _settings_cache['data'] = None
    _settings_cache['ts'] = 0.0

def cleanup_old_logs(days: int = 30):
  """Delete logs older than given days and run incremental vacuum."""
  with get_conn() as c:
    c.execute("DELETE FROM logs WHERE created_at < datetime('now', ?)", (f'-{int(days)} days',))
    c.execute("PRAGMA optimize;")
    c.commit()

def vacuum():
  with get_conn() as c:
    c.execute("VACUUM")
    c.commit()

# Compatibility wrappers for admin routes
def get_conversations(limit=100):
  """Return recent conversations (alias of list_messages)."""
  return list_messages(limit)

def get_logs(limit=200):
  """Return recent logs (alias of list_logs)."""
  return list_logs(limit)

def clear_conversations():
  """Clear conversations table (alias of clear_messages)."""
  return clear_messages()
