from fastapi import APIRouter, Depends
from app.presentation.api.security import get_current_user
from app.application.citas import use_cases as citas_svc
from app.application.beneficiarios import use_cases as beneficiarios_svc

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
    except Exception:
        pass

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
    except Exception:
        pass

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
    except Exception:
        pass

    return notificaciones
