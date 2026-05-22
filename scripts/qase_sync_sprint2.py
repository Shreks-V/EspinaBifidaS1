#!/usr/bin/env python3
"""Sincroniza suites y casos Sprint 2 en Qase (proyecto FJ26SV) de forma idempotente."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx
import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "pruebas-s2" / "qase_manifest.yaml"
IDS_OUT = ROOT / "pruebas-s2" / "pruebas_s2_qase_ids.json"
API_BASE = os.environ.get("QASE_API_BASE", "https://api.qase.io/v1")


def _token() -> str:
    tok = os.environ.get("QASE_TESTOPS_API_TOKEN", "").strip()
    if not tok:
        print("Falta QASE_TESTOPS_API_TOKEN", file=sys.stderr)
        sys.exit(1)
    return tok


def _headers(token: str) -> dict[str, str]:
    return {"Token": token, "Content-Type": "application/json", "Accept": "application/json"}


def _paginate(client: httpx.Client, path: str, *, limit: int = 100) -> list[dict[str, Any]]:
    offset = 0
    rows: list[dict[str, Any]] = []
    while True:
        r = client.get(path, params={"limit": limit, "offset": offset})
        r.raise_for_status()
        body = r.json()
        chunk = body.get("result", {}).get("entities") or []
        rows.extend(chunk)
        total = body.get("result", {}).get("total") or len(rows)
        offset += limit
        if offset >= total or not chunk:
            break
    return rows


def _ensure_suite(client: httpx.Client, project: str, title: str, cache: dict[str, int]) -> int:
    if title in cache:
        return cache[title]
    for s in _paginate(client, f"{API_BASE}/suite/{project}"):
        if (s.get("title") or "").strip() == title:
            cache[title] = int(s["id"])
            return cache[title]
    r = client.post(f"{API_BASE}/suite/{project}", json={"title": title})
    r.raise_for_status()
    sid = int(r.json()["result"]["id"])
    cache[title] = sid
    print(f"Suite creada: {title} (id={sid})")
    return sid


def _case_title(automation_id: str, title: str) -> str:
    return f"[S2:{automation_id}] {title}"


def _find_case(
    client: httpx.Client,
    project: str,
    suite_id: int,
    automation_id: str,
    title: str,
) -> int | None:
    full = _case_title(automation_id, title)
    for c in _paginate(client, f"{API_BASE}/case/{project}", limit=100):
        if c.get("suite_id") == suite_id and (c.get("title") or "").strip() == full:
            return int(c["id"])
    r = client.get(
        f"{API_BASE}/case/{project}",
        params={"suite_id": suite_id, "search": automation_id, "limit": 100},
    )
    if r.status_code == 200:
        for c in r.json().get("result", {}).get("entities") or []:
            t = (c.get("title") or "")
            if automation_id in t:
                return int(c["id"])
    return None


def _ensure_case(
    client: httpx.Client,
    project: str,
    suite_id: int,
    automation_id: str,
    title: str,
    description: str,
) -> int:
    existing = _find_case(client, project, suite_id, automation_id, title)
    if existing is not None:
        return existing
    payload = {
        "title": _case_title(automation_id, title),
        "description": description,
        "suite_id": suite_id,
        "automation": 1,
        "type": 1,
    }
    r = client.post(f"{API_BASE}/case/{project}", json=payload)
    r.raise_for_status()
    cid = int(r.json()["result"]["id"])
    print(f"Caso creado: {automation_id} (id={cid})")
    return cid


def main() -> None:
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    project = (os.environ.get("QASE_TESTOPS_PROJECT") or manifest.get("project") or "FJ26SV").strip()
    token = _token()

    suite_cache: dict[str, int] = {}
    id_map: dict[str, int] = {}

    with httpx.Client(headers=_headers(token), timeout=60.0) as client:
        for suite_def in manifest.get("suites") or []:
            stitle = suite_def["title"]
            sid = _ensure_suite(client, project, stitle, suite_cache)
            for case in suite_def.get("cases") or []:
                aid = case["automation_id"]
                ctitle = case["title"]
                desc = case.get("description") or f"Sprint 2 automated test ({aid})"
                id_map[aid] = _ensure_case(client, project, sid, aid, ctitle, desc)

    IDS_OUT.write_text(json.dumps(id_map, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Mapa guardado en {IDS_OUT} ({len(id_map)} casos)")


if __name__ == "__main__":
    main()
