"""Integración Sprint 2 contra Oracle (opcional)."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = [pytest.mark.s2, pytest.mark.oracle_s2]


@qase_s2_case(
    "[S2] Integración Oracle",
    "hu_s2_oracle_health",
    "Health check con app completa y Oracle",
)
def test_s2_oracle_health(s2_oracle_client):
    r = s2_oracle_client.get("/api/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"
