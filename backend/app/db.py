import os
import sqlite3
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_PATH = os.path.abspath(os.path.join(DB_DIR, 'app.db'))

SCHEMA = """
PRAGMA journal_mode=WAL;
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
"""

os.makedirs(DB_DIR, exist_ok=True)

@contextmanager
def get_conn():
  conn = sqlite3.connect(DB_PATH)
  try:
    yield conn
  finally:
    conn.close()

# Initialize schema
with get_conn() as c:
  c.executescript(SCHEMA)
  c.commit()

def add_message(role: str, text: str, tokens_in=0, tokens_out=0, cost=0.0):
  with get_conn() as c:
    c.execute("INSERT INTO conversations(role, text, tokens_in, tokens_out, cost) VALUES(?,?,?,?,?)",
              (role, text, tokens_in, tokens_out, cost))
    c.commit()

def list_messages(limit=100):
  with get_conn() as c:
    cur = c.execute("SELECT id, role, text, created_at, tokens_in, tokens_out, cost FROM conversations ORDER BY id DESC LIMIT ?", (limit,))
    rows = [
      {
        'id': r[0], 'role': r[1], 'text': r[2], 'created_at': r[3],
        'tokens_in': r[4], 'tokens_out': r[5], 'cost': r[6]
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
    cur = c.execute("SELECT id, level, message, created_at FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    return [ { 'id': r[0], 'level': r[1], 'message': r[2], 'created_at': r[3] } for r in cur.fetchall() ]

def set_setting(key: str, value: str):
  with get_conn() as c:
    c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))
    c.commit()

def get_settings():
  with get_conn() as c:
    cur = c.execute("SELECT key, value FROM settings")
    return { k:v for k,v in cur.fetchall() }
