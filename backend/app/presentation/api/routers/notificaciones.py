import logging
from fastapi import APIRouter, Depends
from app.presentation.api.security import get_current_user
from app.application.citas import use_cases as citas_svc
from app.application.almacen import use_cases as almacen_svc
from app.application.beneficiarios import use_cases as beneficiarios_svc

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get('')
def get_notificaciones(current_user: dict = Depends(get_current_user)):
    """Agrega alertas de todos los módulos en una respuesta unificada."""
    notificaciones = []

    # ── Citas de hoy ──────────────────────────────────────────────────────────
    try:
        hoy = citas_svc.citas_hoy(current_user)
        programadas_hoy = hoy.get('programadas', 0)
        if programadas_hoy > 0:
            notificaciones.append({
                'id': 'citas_hoy',
                'categoria': 'citas',
                'tipo': 'info',
                'titulo': 'Citas de hoy',
                'detalle': f"{programadas_hoy} cita{'s' if programadas_hoy != 1 else ''} programada{'s' if programadas_hoy != 1 else ''} para hoy.",
                'count': programadas_hoy,
                'link': '/citas',
            })
    except Exception as exc:
        logger.warning("notificaciones: error al obtener citas de hoy: %s", exc)

    # ── Citas próximas (7 días) ───────────────────────────────────────────────
    try:
        proximas = citas_svc.citas_proximas(7, current_user)
        count_prox = proximas.get('count', 0)
        if count_prox > 0:
            notificaciones.append({
                'id': 'citas_proximas',
                'categoria': 'citas',
                'tipo': 'info',
                'titulo': 'Próximas citas',
                'detalle': f"{count_prox} cita{'s' if count_prox != 1 else ''} en los próximos 7 días.",
                'count': count_prox,
                'link': '/citas',
            })
    except Exception as exc:
        logger.warning("notificaciones: error al obtener citas próximas: %s", exc)

    # ── Membresías por vencer (30 días) ──────────────────────────────────────
    try:
        membresias = beneficiarios_svc.listar_membresias_proximas_a_vencer(30, current_user, 500, 0)
        count_mem = len(membresias) if isinstance(membresias, list) else 0
        if count_mem > 0:
            count_mem_label = '500+' if count_mem == 500 else str(count_mem)
            notificaciones.append({
                'id': 'membresias_vencer',
                'categoria': 'membresias',
                'tipo': 'warning',
                'titulo': 'Membresías por vencer',
                'detalle': f"{count_mem_label} membresía{'s' if count_mem != 1 else ''} vence{'n' if count_mem != 1 else ''} en los próximos 30 días.",
                'count': count_mem,
                'link': '/registro-usuarios',
            })
    except Exception as exc:
        logger.warning("notificaciones: error al obtener membresías por vencer: %s", exc)

    # ── Almacén: existencias bajas ────────────────────────────────────────────
    try:
        stats = almacen_svc.almacen_stats(current_user)
        stock_bajo = int(stats.get('alertas_stock_bajo', 0))
        caducidad = int(stats.get('alertas_caducidad', 0))

        if stock_bajo > 0:
            notificaciones.append({
                'id': 'stock_bajo',
                'categoria': 'almacen',
                'tipo': 'warning',
                'titulo': 'Inventario en riesgo',
                'detalle': f"{stock_bajo} producto{'s' if stock_bajo != 1 else ''} con existencias bajas.",
                'count': stock_bajo,
                'link': '/almacen',
            })

        if caducidad > 0:
            notificaciones.append({
                'id': 'caducidad',
                'categoria': 'almacen',
                'tipo': 'warning',
                'titulo': 'Productos por caducar',
                'detalle': f"{caducidad} producto{'s' if caducidad != 1 else ''} próximo{'s' if caducidad != 1 else ''} a caducar.",
                'count': caducidad,
                'link': '/almacen',
            })
    except Exception as exc:
        logger.warning("notificaciones: error al obtener stats de almacén: %s", exc)

    return notificaciones
