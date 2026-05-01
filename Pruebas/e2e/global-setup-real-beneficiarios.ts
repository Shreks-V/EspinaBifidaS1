/**
 * Solo actúa si E2E_BENEFICIARIOS_BACKEND es real | oracle:
 * login al API FastAPI + GET /beneficiarios y rellena E2E_DETALLE_* con el primer paciente activo.
 * Si ya vinieron E2E_DETALLE_FOLIO y E2E_DETALLE_NOMBRE_MODAL, no toca nada (override manual).
 */
import type { FullConfig } from '@playwright/test';

function backendMode(): string {
  return (process.env['E2E_BENEFICIARIOS_BACKEND'] || '').toLowerCase().trim();
}

function useRealApi(): boolean {
  const m = backendMode();
  return m === 'real' || m === 'oracle';
}

/** Misma base que Angular `environment.apiUrl` típico */
function apiBase(): string {
  const raw = process.env['E2E_API_BASE_URL']?.trim() || 'http://localhost:8000/api';
  return raw.replace(/\/$/, '');
}

function buildNombreModal(b: Record<string, unknown>): string {
  const parts = [b['nombre'], b['apellido_paterno'], b['apellido_materno']]
    .map((x) => (typeof x === 'string' ? x.trim() : x == null ? '' : String(x).trim()))
    .filter(Boolean);
  return parts.join(' ');
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (!useRealApi()) {
    return;
  }

  if (process.env['E2E_DETALLE_FOLIO']?.trim() && process.env['E2E_DETALLE_NOMBRE_MODAL']?.trim()) {
    return;
  }

  const base = apiBase();
  const email = process.env['E2E_LOGIN_EMAIL']?.trim() || 'admin@espinabifida.org';
  const password = process.env['E2E_LOGIN_PASSWORD'] ?? 'admin123';

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, password }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => '');
    throw new Error(
      `global-setup-real-beneficiarios: login ${loginRes.status}. ¿Backend en ${base}? ¿Credenciales? ${body.slice(0, 500)}`,
    );
  }

  const loginJson = (await loginRes.json()) as { access_token?: string };
  const token = loginJson.access_token;
  if (!token) {
    throw new Error('global-setup-real-beneficiarios: login no devolvió access_token');
  }

  const listRes = await fetch(`${base}/beneficiarios?limit=500&offset=0`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!listRes.ok) {
    const body = await listRes.text().catch(() => '');
    throw new Error(
      `global-setup-real-beneficiarios: GET beneficiarios ${listRes.status}: ${body.slice(0, 500)}`,
    );
  }

  const list = (await listRes.json()) as Record<string, unknown>[];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      'global-setup-real-beneficiarios: la lista está vacía (Oracle sin registros activos en esta vista).',
    );
  }

  const row =
    list.find((b) => b['activo'] === 'S') ?? list.find((b) => b['folio']) ?? list[0];
  if (!row?.['folio']) {
    throw new Error('global-setup-real-beneficiarios: registro sin folio.');
  }

  const nombreModal = buildNombreModal(row);
  if (!nombreModal.length) {
    throw new Error('global-setup-real-beneficiarios: no se pudo armar el nombre para el modal.');
  }

  process.env['E2E_DETALLE_FOLIO'] = String(row['folio']);
  process.env['E2E_DETALLE_NOMBRE_MODAL'] = nombreModal;

  if (typeof row['curp'] === 'string' && row['curp'].trim()) {
    process.env['E2E_DETALLE_CURP'] = row['curp'].trim();
  }
  if (typeof row['tipo_sangre'] === 'string' && row['tipo_sangre'].trim()) {
    process.env['E2E_DETALLE_TIPO_SANGRE'] = row['tipo_sangre'].trim();
  }
  if (typeof row['membresia_estatus'] === 'string' && row['membresia_estatus'].trim()) {
    process.env['E2E_DETALLE_MEMBRESIA'] = row['membresia_estatus'].trim();
  }

  const tipos = row['tipos_espina'];
  if (Array.isArray(tipos) && tipos.length) {
    const nombres = tipos
      .map((t) => {
        const o = t as Record<string, unknown>;
        return typeof o['nombre'] === 'string' ? o['nombre'].trim() : '';
      })
      .filter(Boolean);
    if (nombres.length) {
      process.env['E2E_DETALLE_TIPOS_ESPINA'] = nombres.join(',');
    }
  }

  // útil si alguien lee el log
  console.log(`[global-setup-real-beneficiarios] usando folio real ${process.env['E2E_DETALLE_FOLIO']}`);
}
