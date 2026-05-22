"""Apply a .sql migration against Oracle.

Usage:
    python db/apply_migration.py db/migrations/001_pre_sp_schema_changes.sql

Splits the file on ';' for plain DDL statements and on '/' for PL/SQL blocks
(CREATE OR REPLACE PROCEDURE/TRIGGER/FUNCTION/PACKAGE). Empty statements and
SQL line comments are ignored.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.infrastructure.persistence.oracle import get_db  # noqa: E402


PLSQL_RE = re.compile(
    r"^\s*(CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE)\b"
    r"|BEGIN\b"
    r"|DECLARE\b)",
    re.IGNORECASE,
)


def strip_line_comments(sql: str) -> str:
    lines = []
    for line in sql.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    return "\n".join(lines)


def split_statements(sql: str) -> list[str]:
    """Split a .sql file into individual executable statements.

    Oracle PL/SQL blocks use '/' on its own line as a terminator.
    Plain DDL/DML uses ';'. We support both in a single file by scanning
    line by line and switching mode when we hit a CREATE PROCEDURE/TRIGGER/etc.
    """
    statements: list[str] = []
    buffer: list[str] = []
    in_plsql = False

    for raw_line in sql.splitlines():
        line = raw_line.rstrip()
        stripped = line.lstrip()

        if not in_plsql and not buffer and (not stripped or stripped.startswith("--")):
            continue

        if not in_plsql and PLSQL_RE.match(line):
            if buffer:
                chunk = "\n".join(buffer).strip()
                if chunk:
                    statements.append(chunk)
                buffer = []
            in_plsql = True
            buffer.append(line)
            continue

        if in_plsql:
            if stripped == "/":
                chunk = "\n".join(buffer).strip()
                if chunk:
                    statements.append(chunk)
                buffer = []
                in_plsql = False
                continue
            buffer.append(line)
            continue

        buffer.append(line)
        if stripped.endswith(";"):
            chunk = "\n".join(buffer).strip().rstrip(";").strip()
            if chunk:
                statements.append(chunk)
            buffer = []

    tail = "\n".join(buffer).strip()
    if tail:
        statements.append(tail.rstrip(";").strip())

    return [s for s in statements if s]


def summary(sql: str) -> str:
    first = sql.strip().splitlines()[0][:90]
    return first


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python db/apply_migration.py <path-to-.sql>")
        return 2

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"ERROR: file not found: {path}")
        return 2

    raw = path.read_text(encoding="utf-8")
    statements = split_statements(raw)
    print(f"Applying {path.name} — {len(statements)} statement(s)\n")

    with get_db() as conn:
        cur = conn.cursor()
        for i, stmt in enumerate(statements, 1):
            head = summary(stmt)
            print(f"[{i}/{len(statements)}] {head}")
            try:
                cur.execute(stmt)
            except Exception as exc:  # noqa: BLE001
                print(f"  FAILED: {exc}")
                conn.rollback()
                return 1
            print("  OK")
        conn.commit()

    print("\nDONE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
