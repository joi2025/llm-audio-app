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

def update_conversation_cost(conversation_id: int, additional_cost: float):
  """Update the cost of a specific conversation by adding to existing cost."""
  with get_conn() as c:
    c.execute(
      "UPDATE conversations SET cost = cost + ? WHERE id = ?",
      (float(additional_cost), int(conversation_id))
    )
    c.commit()

def get_cost_analytics(days: int = 30):
  """Get cost analytics for the specified number of days."""
  with get_conn() as c:
    # Total cost in period
    cur = c.execute(
      "SELECT SUM(cost) as total_cost FROM conversations WHERE created_at >= datetime('now', ?)",
      (f'-{int(days)} days',)
    )
    total_cost = cur.fetchone()['total_cost'] or 0.0
    
    # Daily breakdown
    cur = c.execute("""
      SELECT 
        DATE(created_at) as date,
        SUM(cost) as daily_cost,
        COUNT(*) as message_count,
        SUM(tokens_in) as total_tokens_in,
        SUM(tokens_out) as total_tokens_out
      FROM conversations 
      WHERE created_at >= datetime('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    """, (f'-{int(days)} days',))
    
    daily_breakdown = [
      {
        'date': r['date'],
        'cost': r['daily_cost'] or 0.0,
        'messages': r['message_count'],
        'tokens_in': r['total_tokens_in'] or 0,
        'tokens_out': r['total_tokens_out'] or 0
      } for r in cur.fetchall()
    ]
    
    # Cost by role (user vs assistant)
    cur = c.execute("""
      SELECT 
        role,
        SUM(cost) as role_cost,
        COUNT(*) as message_count,
        AVG(cost) as avg_cost_per_message
      FROM conversations 
      WHERE created_at >= datetime('now', ?) AND cost > 0
      GROUP BY role
    """, (f'-{int(days)} days',))
    
    role_breakdown = [
      {
        'role': r['role'],
        'cost': r['role_cost'] or 0.0,
        'messages': r['message_count'],
        'avg_cost': r['avg_cost_per_message'] or 0.0
      } for r in cur.fetchall()
    ]
    
    return {
      'total_cost': total_cost,
      'period_days': days,
      'daily_breakdown': daily_breakdown,
      'role_breakdown': role_breakdown
    }

def estimate_tts_cost(character_count: int, voice_model: str = 'tts-1') -> float:
  """Estimate TTS cost based on character count and model."""
  # OpenAI TTS pricing (as of 2024)
  pricing = {
    'tts-1': 0.015,      # $0.015 per 1K characters
    'tts-1-hd': 0.030    # $0.030 per 1K characters  
  }
  
  price_per_1k = pricing.get(voice_model, pricing['tts-1'])
  return (character_count / 1000.0) * price_per_1k

def log_pipeline_cost(user_text, assistant_text, tokens_in, tokens_out, tts_chunks, settings):
    """
    Registra el costo completo del pipeline en la base de datos
    """
    try:
        # Calcular costos individuales
        llm_cost = estimate_llm_cost(tokens_in, tokens_out, settings.get('chat_model', 'gpt-4o-mini'))
        tts_cost = estimate_tts_cost(assistant_text, settings.get('tts_model', 'tts-1'))
        total_cost = llm_cost + tts_cost
        
        # Registrar en logs
        add_log('INFO', f'Pipeline cost: LLM=${llm_cost:.4f}, TTS=${tts_cost:.4f}, Total=${total_cost:.4f}, Chunks={tts_chunks}')
        
        return total_cost
        
    except Exception as e:
        add_log('ERROR', f'Error calculating pipeline cost: {e}')
        return 0.0

def log_moderation_event(event_type, content_type, reason, original_text, safe_text=None, user_id=None):
    """
    Registra eventos de moderación de contenido en la base de datos
    
    Args:
        event_type: 'blocked', 'flagged', 'approved'
        content_type: 'input', 'output'  
        reason: Razón específica del bloqueo/flag
        original_text: Texto original antes de moderación
        safe_text: Texto seguro después de moderación (si aplica)
        user_id: ID del usuario (opcional)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Crear tabla de moderación si no existe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS moderation_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT NOT NULL,
                content_type TEXT NOT NULL,
                reason TEXT,
                original_text TEXT,
                safe_text TEXT,
                user_id TEXT,
                text_length INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insertar evento de moderación
        cursor.execute('''
            INSERT INTO moderation_events 
            (event_type, content_type, reason, original_text, safe_text, user_id, text_length)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_type,
            content_type, 
            reason,
            original_text[:500] if original_text else None,  # Truncar texto largo
            safe_text[:500] if safe_text else None,
            user_id,
            len(original_text) if original_text else 0
        ))
        
        conn.commit()
        conn.close()
        
        # Log adicional para monitoreo
        add_log('MODERATION', f'{event_type.upper()} {content_type}: {reason} - Length: {len(original_text) if original_text else 0}')
        
    except Exception as e:
        add_log('ERROR', f'Error logging moderation event: {e}')

def get_moderation_stats(hours=24):
    """
    Obtiene estadísticas de moderación de las últimas N horas
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Estadísticas generales
        cursor.execute('''
            SELECT 
                event_type,
                content_type,
                COUNT(*) as count,
                AVG(text_length) as avg_length
            FROM moderation_events 
            WHERE timestamp >= datetime('now', '-{} hours')
            GROUP BY event_type, content_type
            ORDER BY count DESC
        '''.format(hours))
        
        stats = cursor.fetchall()
        
        # Top razones de bloqueo
        cursor.execute('''
            SELECT 
                reason,
                COUNT(*) as count
            FROM moderation_events 
            WHERE event_type = 'blocked' 
            AND timestamp >= datetime('now', '-{} hours')
            GROUP BY reason
            ORDER BY count DESC
            LIMIT 10
        '''.format(hours))
        
        top_reasons = cursor.fetchall()
        
        conn.close()
        
        return {
            'stats': [dict(zip([col[0] for col in cursor.description], row)) for row in stats],
            'top_reasons': [dict(zip([col[0] for col in cursor.description], row)) for row in top_reasons]
        }
        
    except Exception as e:
        add_log('ERROR', f'Error getting moderation stats: {e}')
        return {'stats': [], 'top_reasons': []}

def get_cost_analytics(hours=24):
    """
    Obtiene análisis de costos de las últimas N horas
    """
    try:
        with get_conn() as c:
            # Costo total y estadísticas
            cursor = c.execute('''
                SELECT 
                    COUNT(*) as total_interactions,
                    SUM(cost) as total_cost,
                    AVG(cost) as avg_cost,
                    MAX(cost) as max_cost,
                    SUM(tokens_in) as total_tokens_in,
                    SUM(tokens_out) as total_tokens_out
                FROM conversations 
                WHERE created_at >= datetime('now', '-{} hours')
                AND role = 'assistant'
            '''.format(hours))
            
            stats = cursor.fetchone()
            
            # Costos por hora
            cursor = c.execute('''
                SELECT 
                    strftime('%Y-%m-%d %H:00:00', created_at) as hour,
                    COUNT(*) as interactions,
                    SUM(cost) as cost,
                    SUM(tokens_in) as tokens_in,
                    SUM(tokens_out) as tokens_out
                FROM conversations 
                WHERE created_at >= datetime('now', '-{} hours')
                AND role = 'assistant'
                GROUP BY strftime('%Y-%m-%d %H:00:00', created_at)
                ORDER BY hour DESC
            '''.format(hours))
            
            hourly_stats = cursor.fetchall()
            
            # Conversaciones más costosas
            cursor = c.execute('''
                SELECT 
                    id,
                    text,
                    cost,
                    tokens_in,
                    tokens_out,
                    created_at
                FROM conversations 
                WHERE created_at >= datetime('now', '-{} hours')
                AND role = 'assistant'
                AND cost > 0
                ORDER BY cost DESC
                LIMIT 10
            '''.format(hours))
            
            expensive_conversations = cursor.fetchall()
            
            return {
                'summary': {
                    'total_interactions': stats[0] or 0,
                    'total_cost': round(stats[1] or 0.0, 6),
                    'avg_cost': round(stats[2] or 0.0, 6),
                    'max_cost': round(stats[3] or 0.0, 6),
                    'total_tokens_in': stats[4] or 0,
                    'total_tokens_out': stats[5] or 0
                },
                'hourly': [dict(row) for row in hourly_stats],
                'expensive': [dict(row) for row in expensive_conversations]
            }
            
    except Exception as e:
        add_log('ERROR', f'Error getting cost analytics: {e}')
        return {
            'summary': {'total_interactions': 0, 'total_cost': 0.0, 'avg_cost': 0.0, 'max_cost': 0.0, 'total_tokens_in': 0, 'total_tokens_out': 0},
            'hourly': [],
            'expensive': []
        }

def update_conversation_cost(conversation_id, cost):
    """
    Actualiza el costo de una conversación específica
    """
    try:
        with get_conn() as c:
            c.execute(
                "UPDATE conversations SET cost = ? WHERE id = ?",
                (cost, conversation_id)
            )
            c.commit()
            
    except Exception as e:
        add_log('ERROR', f'Error updating conversation cost: {e}')
