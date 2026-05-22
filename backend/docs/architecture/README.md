# Diagramas Complementarios para el SDD

Esta carpeta complementa el modelo C4 ubicado en [../structurizr/workspace.dsl](../structurizr/workspace.dsl).

La idea es separar claramente:

- `C4`: arquitectura general del sistema.
- `diagramas complementarios`: arquitectura limpia, patrones de diseño, decisiones de diseño y flujos clave.

Archivos incluidos:

- [01-clean-architecture.md](./01-clean-architecture.md): diagrama por capas para explicar la arquitectura limpia.
- [02-patrones-y-decisiones.md](./02-patrones-y-decisiones.md): diagrama de patrones de diseño y tabla de decisiones.
- [03-flujos-clave.md](./03-flujos-clave.md): diagramas de secuencia para login y pre-registro.

Uso sugerido en el SDD:

1. Presenta primero el C4.
2. Usa `01-clean-architecture.md` para explicar la separación por capas.
3. Usa `02-patrones-y-decisiones.md` para justificar por qué el diseño está hecho así.
4. Usa `03-flujos-clave.md` para mostrar cómo interactúan los elementos en escenarios reales.
