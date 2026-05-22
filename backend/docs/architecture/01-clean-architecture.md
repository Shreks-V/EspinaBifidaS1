# Clean Architecture

Este diagrama resume la organización lógica del backend bajo arquitectura limpia y muestra la dirección esperada de las dependencias.

```mermaid
flowchart LR
    subgraph Presentacion["Capa de Presentación"]
        API["FastAPI\nRouters + App Factory"]
        ACCESS["Seguridad API\nJWT, roles, middleware"]
    end

    subgraph Aplicacion["Capa de Aplicación"]
        AUTH["Casos de uso\nAutenticación"]
        OPS["Casos de uso\nOperación"]
        PREREG["Casos de uso\nPre-registro"]
        NOTIF["Agregación de\nnotificaciones"]
    end

    subgraph Dominio["Capa de Dominio"]
        PORTS["Puertos / Contratos"]
        RULES["Entidades, reglas,\nexcepciones y roles"]
    end

    subgraph Infraestructura["Capa de Infraestructura"]
        BOOT["Raíz de composición"]
        REPO["Adaptadores de\nrepositorio e identidad"]
        SEC["Adaptadores de seguridad,\ncifrado y auditoría"]
        DOCS["Adaptador de documentos"]
        PERSIST["Persistencia y arranque"]
    end

    DB[("Oracle")]
    FS[("Documentos")]

    API --> ACCESS
    API --> AUTH
    API --> OPS
    API --> PREREG
    API --> NOTIF

    AUTH --> PORTS
    OPS --> PORTS
    PREREG --> PORTS
    AUTH --> RULES
    OPS --> RULES
    PREREG --> RULES

    NOTIF --> OPS

    BOOT --> REPO
    BOOT --> OPS
    BOOT --> PREREG

    REPO -. implementa .-> PORTS
    AUTH --> SEC
    ACCESS --> SEC
    REPO --> PERSIST
    SEC --> PERSIST
    PREREG --> DOCS
    OPS --> DOCS

    PERSIST --> DB
    DOCS --> FS
```

## Lectura recomendada

- La `Presentación` recibe solicitudes HTTP y las delega.
- La `Aplicación` contiene la orquestación de casos de uso.
- El `Dominio` define contratos y reglas de negocio.
- La `Infraestructura` implementa adaptadores concretos.
- Las dependencias importantes apuntan hacia el `Dominio`, no al revés.

## Regla central

La lógica de negocio no debe depender de Oracle, FastAPI ni del sistema de archivos.  
La infraestructura depende del dominio y de la aplicación, no al contrario.
