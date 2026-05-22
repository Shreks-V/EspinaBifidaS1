workspace "Arquitectura de la Plataforma EBIF" "Modelo C4 de la plataforma EBIF, cubriendo el frontend Angular y el backend FastAPI organizados con arquitectura limpia." {

    model {
        staff = person "Usuario Interno" "Personal administrativo, recepción, almacén y área médica que opera la plataforma."
        applicant = person "Solicitante de Pre-registro" "Persona externa que completa el flujo público de pre-registro."

        ebif = softwareSystem "Plataforma EBIF" "Plataforma operativa para la asociación de Espina Bífida." {
            frontend = container "Frontend SPA" "Aplicación de página única para el pre-registro público y los flujos operativos internos." "Angular 21, TypeScript" {
                shell = component "Shell de la Aplicación y Enrutamiento" "Inicializa la SPA, resuelve rutas y separa la navegación pública de la protegida." "Angular standalone app, router"
                authSession = component "Autenticación y Gestión de Sesión" "Gestiona el estado de login, persistencia del JWT, guards de rutas y solicitudes autenticadas." "AuthService, authGuard, authInterceptor"
                apiClient = component "Cliente API" "Cliente HTTP central para la comunicación REST con el backend." "HttpClient, ApiService"
                loginUi = component "Vista de Login" "Pantalla de acceso para usuarios internos con captura de credenciales y manejo de errores de autenticación." "pages/login"
                preregistroUi = component "UI Pública de Pre-registro" "Flujo público de múltiples pasos para pre-registro y carga de documentos con acceso acotado por token." "Angular standalone page"
                navigationUi = component "Navegación y Layout Compartido" "Navbar, footer, menú de usuario, navegación principal, pestañas visibles por ruta y panel de notificaciones." "shared/navbar, shared/footer"
                dashboardUi = component "Vista de Dashboard" "Panel principal con resumen operativo, doctor del día, acciones rápidas y cola de atención." "pages/dashboard"
                beneficiariosUi = component "Vista de Beneficiarios" "Módulo de registro y gestión de beneficiarios, membresías, historial y atención de pre-registros." "pages/beneficiarios"
                citasUi = component "Vista de Citas" "Módulo con pestañas de agenda de citas y médicos, incluyendo filtros, programación y disponibilidad." "pages/citas"
                almacenUi = component "Vista de Almacén" "Módulo de inventario con subáreas de productos, servicios, movimientos y comodatos." "pages/almacen"
                recibosUi = component "Vista de Recibos" "Módulo para cobros, consulta de recibos, pagos parciales, cancelaciones y seguimiento de saldos." "pages/recibos"
                reportesUi = component "Vista de Reportes" "Módulo para generación documental, filtros temporales, indicadores y gráficas de análisis." "pages/reportes"
                sharedUi = component "Componentes UI Compartidos" "Navegación, footer, cards y bloques reutilizables de presentación." "Angular shared components"
            }

            backend = container "API Backend" "API REST que expone capacidades de negocio y coordina las capas de arquitectura limpia." "Python, FastAPI" {
                api = component "Capa de Presentación" "Punto de entrada HTTP con factory de aplicación, composición de rutas, routers de endpoints y contratos de respuesta." "FastAPI app and routers"
                access = component "Control de Acceso y Seguridad de API" "Validación JWT, control por roles, acceso acotado para pre-registro, CORS, límites y middlewares de seguridad." "security.py, middleware"
                appAuth = component "Casos de Uso de Aplicación - Autenticación" "Orquestación de autenticación y obtención del usuario actual." "application/auth"
                appOperations = component "Casos de Uso de Aplicación - Operación" "Orquestación de beneficiarios, citas, doctores, almacén, recibos, reportes y exportaciones." "application/*"
                appPreregistro = component "Casos de Uso de Aplicación - Pre-registro" "Ciclo de vida del pre-registro público, flujo de aprobación y orquestación de documentos." "application/preregistro"
                appNotifications = component "Agregación Transversal de Notificaciones" "Construye una respuesta unificada de notificaciones componiendo señales de múltiples módulos operativos." "presentation/api/routers/notificaciones.py"
                domain = component "Capa de Dominio" "Puertos, entidades, excepciones y reglas de normalización de roles usadas por la capa de aplicación." "domain/*"
                bootstrap = component "Raíz de Composición" "Vincula adaptadores concretos de infraestructura con los casos de uso durante el arranque." "bootstrap.py"
                repositories = component "Adaptadores de Repositorio e Identidad" "Adaptadores de repositorio sobre Oracle y repositorios de autenticación que implementan los puertos del dominio usados por la capa de aplicación." "infrastructure/*/repository.py, infrastructure/auth"
                infraSecurity = component "Adaptadores de Seguridad, Cifrado y Auditoría" "Hash de contraseñas, generación de tokens, protección de datos personales, autenticación fallback y soporte de auditoría." "infrastructure/security, privacy, audit"
                persistence = component "Persistencia y Arranque" "Pool de conexiones Oracle, propagación de sesión, utilidades auxiliares y migraciones de inicio." "infrastructure/persistence, startup"
                documents = component "Adaptador de Almacenamiento de Documentos" "Gestiona documentos subidos en pre-registro y beneficiarios almacenados en el sistema de archivos del servidor." "infrastructure/preregistro, infrastructure/exportaciones"
            }

            database = container "Base de Datos Oracle" "Sistema principal de registro para beneficiarios, citas, doctores, almacén, recibos, reportes y datos de autenticación." "Oracle Database"
            documentStorage = container "Almacenamiento de Documentos" "Almacenamiento en sistema de archivos para documentos cargados consumidos por pre-registro y exportaciones." "Local filesystem"
        }

        staff -> frontend "Lo usa para la operación diaria" "HTTPS"
        applicant -> frontend "Lo usa para el pre-registro público" "HTTPS"
        frontend -> backend "Consume la API REST" "HTTPS/JSON"
        backend -> database "Lee y escribe datos operativos" "Oracle SQL"
        backend -> documentStorage "Almacena y recupera archivos cargados" "Filesystem I/O"

        staff -> shell "Accede al punto de entrada interno de la SPA"
        staff -> loginUi "Inicia sesión para entrar al backoffice"
        applicant -> preregistroUi "Completa el flujo público de pre-registro"
        shell -> loginUi "Carga la vista pública de acceso"
        shell -> authSession "Delega la navegación protegida y el estado de sesión"
        shell -> preregistroUi "Carga el flujo público de pre-registro"
        shell -> dashboardUi "Carga rutas protegidas"
        shell -> beneficiariosUi "Carga rutas protegidas"
        shell -> citasUi "Carga rutas protegidas"
        shell -> almacenUi "Carga rutas protegidas"
        shell -> recibosUi "Carga rutas protegidas"
        shell -> reportesUi "Carga rutas protegidas"
        loginUi -> authSession "Usa para autenticar credenciales"
        navigationUi -> authSession "Usa para mostrar usuario, rol y logout"
        navigationUi -> apiClient "Usa para obtener notificaciones"
        preregistroUi -> sharedUi "Usa piezas comunes de presentación"
        dashboardUi -> navigationUi "Usa"
        dashboardUi -> sharedUi "Usa"
        dashboardUi -> apiClient "Usa"
        beneficiariosUi -> navigationUi "Usa"
        beneficiariosUi -> sharedUi "Usa"
        beneficiariosUi -> apiClient "Usa"
        citasUi -> navigationUi "Usa"
        citasUi -> sharedUi "Usa"
        citasUi -> apiClient "Usa"
        almacenUi -> navigationUi "Usa"
        almacenUi -> sharedUi "Usa"
        almacenUi -> apiClient "Usa"
        recibosUi -> navigationUi "Usa"
        recibosUi -> sharedUi "Usa"
        recibosUi -> apiClient "Usa"
        reportesUi -> navigationUi "Usa"
        reportesUi -> sharedUi "Usa"
        reportesUi -> apiClient "Usa"
        preregistroUi -> apiClient "Usa"
        authSession -> apiClient "Lo usa para llamadas HTTP autenticadas"
        authSession -> backend "Autentica usuarios y valida el contexto de sesión" "HTTPS/JSON"
        apiClient -> backend "Invoca endpoints de la API" "HTTPS/JSON"

        api -> access "Aplica autenticación, validación de roles y políticas de solicitud"
        api -> appAuth "Delega endpoints de autenticación"
        api -> appOperations "Delega endpoints operativos"
        api -> appPreregistro "Delega endpoints públicos y administrativos de pre-registro"
        api -> appNotifications "Expone el endpoint unificado de notificaciones"
        access -> infraSecurity "Usa servicios de tokens y contraseñas"
        appAuth -> domain "Usa reglas y contratos de dominio"
        appOperations -> domain "Usa puertos y modelos de dominio"
        appPreregistro -> domain "Usa puertos y modelos de dominio"
        appNotifications -> appOperations "Lee señales operativas transversales"
        bootstrap -> repositories "Crea instancias de adaptadores"
        bootstrap -> appOperations "Inyecta repositorios"
        bootstrap -> appPreregistro "Inyecta repositorios"
        repositories -> domain "Implementa puertos de repositorio"
        repositories -> persistence "Ejecuta SQL y procedimientos almacenados"
        appAuth -> infraSecurity "Usa validación de contraseñas y emisión de tokens"
        appOperations -> repositories "Usa adaptadores de repositorio enlazados"
        appPreregistro -> repositories "Usa adaptadores de repositorio enlazados"
        appPreregistro -> documents "Almacena y resuelve documentos cargados"
        appOperations -> documents "Consume documentos cargados para exportaciones"
        infraSecurity -> persistence "Usa configuración y contexto de persistencia"
        persistence -> database "Administra conexiones y ejecuta consultas" "Oracle SQL"
        documents -> documentStorage "Persiste archivos binarios"
    }

    views {
        systemContext ebif "system-context" {
            include staff
            include applicant
            include ebif
            autoLayout lr
            title "Plataforma EBIF - Contexto del Sistema"
        }

        container ebif "containers" {
            include staff
            include applicant
            include *
            autoLayout lr
            title "Plataforma EBIF - Vista de Contenedores"
        }

        component frontend "frontend-components" {
            include staff
            include applicant
            include backend
            include *
            autoLayout lr
            title "Frontend EBIF - Componentes Internos"
        }

        component backend "backend-clean-architecture" {
            include database
            include documentStorage
            include *
            autoLayout lr
            title "Backend EBIF - Componentes de Arquitectura Limpia"
        }

        styles {
            element "Person" {
                shape person
                background #0b3c5d
                color #ffffff
            }

            element "Software System" {
                background #1d4e89
                color #ffffff
            }

            element "Container" {
                background #2e7d6f
                color #ffffff
            }

            element "Component" {
                background #d8e2dc
                color #111111
            }

            element "Database" {
                shape cylinder
                background #6c757d
                color #ffffff
            }
        }
    }
}
