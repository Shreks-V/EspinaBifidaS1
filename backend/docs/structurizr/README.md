# Structurizr

El workspace principal vive en `workspace.dsl`.

Este workspace documenta la plataforma como un modelo C4 completo:

- `system-context`: actores y contexto general del sistema.
- `containers`: contenedores principales y sus relaciones.
- `frontend-components`: responsabilidades internas del frontend sin bajar a nivel de código.
- `backend-clean-architecture`: separación interna del backend siguiendo arquitectura limpia.

Uso sugerido:

```bash
structurizr validate -workspace workspace.dsl
structurizr export -workspace workspace.dsl -format plantuml
```

También puedes abrirlo con Structurizr Lite apuntando a este directorio.

Guía de lectura:

- Usa `system-context` para presentar la visión general.
- Usa `containers` para explicar Angular, FastAPI, Oracle y documentos.
- Usa `frontend-components` para explicar la SPA.
- Usa `backend-clean-architecture` para explicar capas y dependencias internas.

Diagramas complementarios para el SDD:

- [../architecture/01-clean-architecture.md](../architecture/01-clean-architecture.md)
- [../architecture/02-patrones-y-decisiones.md](../architecture/02-patrones-y-decisiones.md)
- [../architecture/03-flujos-clave.md](../architecture/03-flujos-clave.md)
