import os
from contextlib import contextmanager

import oracledb

from app.core.config import settings
from app.core.session_context import get_current_user_id

_initialized = False
_pool = None


def _init_client():
    global _initialized
    if not _initialized:
        client_dir = settings.ORACLE_CLIENT_DIR
        if client_dir and os.path.isdir(client_dir):
            oracledb.init_oracle_client(lib_dir=client_dir)
        _initialized = True


def init_pool():
    """Create the connection pool (call once at app startup)."""
    global _pool
    if _pool is not None:
        return
    _init_client()
    _pool = oracledb.create_pool(
        user=settings.ORACLE_USER,
        password=settings.ORACLE_PASSWORD,
        dsn=settings.ORACLE_DSN,
        config_dir=settings.ORACLE_CONFIG_DIR,
        wallet_location=settings.ORACLE_WALLET_DIR,
        wallet_password=settings.ORACLE_WALLET_PASSWORD,
        min=2,
        max=10,
        increment=1,
    )


def close_pool():
    """Close the connection pool (call at app shutdown)."""
    global _pool
    if _pool is not None:
        _pool.close(force=True)
        _pool = None


def get_connection():
    if _pool is not None:
        return _pool.acquire()
    _init_client()
    return oracledb.connect(
        user=settings.ORACLE_USER,
        password=settings.ORACLE_PASSWORD,
        dsn=settings.ORACLE_DSN,
        config_dir=settings.ORACLE_CONFIG_DIR,
        wallet_location=settings.ORACLE_WALLET_DIR,
        wallet_password=settings.ORACLE_WALLET_PASSWORD,
    )


@contextmanager
def get_db():
    conn = get_connection()
    user_id = get_current_user_id()
    if user_id is not None:
        try:
            with conn.cursor() as cur:
                cur.callproc("DBMS_SESSION.SET_IDENTIFIER", [str(user_id)])
        except oracledb.DatabaseError:
            pass
    try:
        yield conn
    finally:
        if user_id is not None:
            try:
                with conn.cursor() as cur:
                    cur.callproc("DBMS_SESSION.CLEAR_IDENTIFIER")
            except oracledb.DatabaseError:
                pass
        conn.close()


def rows_to_dicts(cursor) -> list[dict]:
    columns = [col[0].lower() for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def row_to_dict(cursor) -> dict | None:
    columns = [col[0].lower() for col in cursor.description]
    row = cursor.fetchone()
    if row is None:
        return None
    return dict(zip(columns, row))
