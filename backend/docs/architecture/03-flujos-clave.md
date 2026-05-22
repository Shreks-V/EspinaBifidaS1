# Flujos Clave

## Flujo 1: Login de usuario interno

```mermaid
sequenceDiagram
    actor U as Usuario Interno
    participant F as Frontend SPA
    participant A as Auth/Session
    participant C as Cliente API
    participant B as API Backend
    participant AU as Caso de Uso Auth
    participant S as Adaptador Seguridad
    participant R as Repositorio de Usuarios
    participant DB as Oracle

    U->>F: Ingresa correo y contraseña
    F->>A: login()
    A->>C: POST /api/auth/login
    C->>B: Solicitud HTTP
    B->>AU: Delega autenticación
    AU->>R: buscar usuario
    R->>DB: consulta usuario
    DB-->>R: datos del usuario
    R-->>AU: usuario encontrado
    AU->>S: verificar password
    S-->>AU: password válido
    AU->>S: emitir JWT
    S-->>AU: token
    AU-->>B: respuesta autenticada
    B-->>C: access_token
    C-->>A: token
    A-->>F: sesión iniciada
```

## Flujo 2: Pre-registro y carga de documentos

```mermaid
sequenceDiagram
    actor P as Solicitante
    participant UI as UI Pública de Pre-registro
    participant C as Cliente API
    participant B as API Backend
    participant PR as Caso de Uso Pre-registro
    participant R as Repositorio Oracle
    participant DB as Oracle
    participant D as Adaptador de Documentos
    participant FS as Filesystem

    P->>UI: Llena formulario
    UI->>C: POST /api/preregistro
    C->>B: Solicitud HTTP
    B->>PR: crear_preregistro
    PR->>R: guardar datos
    R->>DB: inserta pre-registro
    DB-->>R: id_paciente
    R-->>PR: pre-registro creado
    PR-->>B: respuesta + token de pre-registro
    B-->>UI: id + preregistro_token

    P->>UI: Sube documento
    UI->>C: POST /api/preregistro/{id}/documentos
    C->>B: solicitud con X-Preregistro-Token
    B->>PR: subir_documento
    PR->>D: guardar archivo
    D->>FS: persiste binario
    FS-->>D: ruta física
    PR->>R: guardar metadatos
    R->>DB: inserta registro documental
    DB-->>R: confirmación
    R-->>PR: metadatos guardados
    PR-->>B: documento registrado
    B-->>UI: documento cargado
```

## Uso en el SDD

- Usa el flujo de `login` para justificar seguridad, sesiones y adapters.
- Usa el flujo de `pre-registro` para explicar el uso de tokens acotados, repositorios y almacenamiento documental.
- Si necesitas más detalle, el siguiente diagrama natural sería `creación de cita` o `exportación de reportes`.
