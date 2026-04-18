workspace "Arquitectura de la Plataforma EBIF - Version actual" "Modelo C4 de la version actual del proyecto EBIF, acotado a los modulos y componentes realmente presentes en esta copia del frontend Angular y backend FastAPI." {

    model {
        staff = person "Usuario interno" "Personal administrativo, recepcion y area medica que opera la plataforma."
        applicant = person "Solicitante de pre-registro" "Persona externa que completa el flujo publico de pre-registro."

        ebif = softwareSystem "Plataforma EBIF" "Plataforma operativa para la asociacion de Espina Bifida." {
            frontend = container "Frontend SPA" "Aplicacion de pagina unica para login interno, pre-registro publico y modulos operativos visibles en esta version." "Angular 21, TypeScript, Tailwind CSS" {
                shell = component "Shell y enrutamiento" "Punto de entrada de la SPA basado en router-outlet y rutas lazy para separar acceso publico y protegido." "app.component, app.routes"
                authSession = component "Autenticacion y sesion" "Gestiona login, persistencia de JWT, lectura del usuario actual y cierre de sesion." "AuthService, authGuard, authInterceptor"
                apiClient = component "Cliente API" "Cliente HTTP centralizado para consumir endpoints REST del backend." "ApiService, HttpClient"
                loginUi = component "Vista de login" "Pantalla de acceso para usuarios internos." "pages/login"
                preregistroUi = component "Vista publica de pre-registro" "Formulario de pre-registro y gestion acotada de documentos usando token de pre-registro." "pages/pre-registro"
                dashboardUi = component "Vista de dashboard" "Panel inicial protegido con resumen operativo y accesos rapidos." "pages/dashboard"
                beneficiariosUi = component "Vista de beneficiarios" "Gestion de beneficiarios, membresias e historial." "pages/beneficiarios"
                citasUi = component "Vista de citas" "Agenda de citas y operacion relacionada con doctores y disponibilidad." "pages/citas"
                recibosUi = component "Vista de recibos" "Cobros, consulta de recibos y cancelaciones." "pages/recibos"
                navigationUi = component "Navegacion y layout compartido" "Navbar, footer, menu de usuario y panel de notificaciones." "shared/navbar, shared/footer"
                sharedUi = component "Componentes UI compartidos" "Tarjetas KPI y tarjetas de modulo reutilizadas por las vistas internas." "shared/kpi-card, shared/module-card"
            }

            backend = container "API backend" "API REST que expone autenticacion, pre-registro y modulos operativos con una organizacion de arquitectura limpia." "Python, FastAPI" {
                api = component "Capa de presentacion" "Factory de FastAPI, router principal y routers por modulo." "presentation/api"
                access = component "Control de acceso y seguridad" "JWT, roles, token acotado de pre-registro, CORS, rate limiting y middlewares de seguridad." "presentation/api/security.py, app_factory.py"
                appAuth = component "Casos de uso de autenticacion" "Login, obtencion del usuario actual y seed opcional de usuarios." "application/auth"
                appOperations = component "Casos de uso operativos" "Beneficiarios, citas, doctores, almacen, recibos, reportes y exportaciones expuestos por la API actual." "application/beneficiarios, citas, doctores, almacen, recibos, reportes, exportaciones"
                appPreregistro = component "Casos de uso de pre-registro" "Alta, consulta, actualizacion, aprobacion, rechazo y documentos del flujo publico." "application/preregistro"
                appNotifications = component "Agregacion de notificaciones" "Construye la respuesta unificada de notificaciones a partir de citas y membresias." "presentation/api/routers/notificaciones.py"
                domain = component "Capa de dominio" "Puertos, entidades, excepciones y normalizacion de roles usados por aplicacion." "domain/*"
                bootstrap = component "Raiz de composicion" "Cablea repositorios Oracle a los casos de uso durante el arranque." "presentation/api/bootstrap.py, dependencies.py"
                repositories = component "Adaptadores de repositorio e identidad" "Repositorios Oracle para autenticacion y modulos operativos." "infrastructure/*/repository.py, infrastructure/auth"
                infraSecurity = component "Adaptadores de seguridad y soporte" "Hash Argon2, JWT, cifrado de datos personales, usuarios fallback y bitacora." "infrastructure/security, privacy, auth, audit"
                persistence = component "Persistencia y arranque" "Pool Oracle, contexto de sesion, helpers SQL y migraciones de inicio." "infrastructure/persistence, infrastructure/startup"
                documents = component "Adaptador de documentos" "Sube, localiza y sirve documentos de pre-registro y exportaciones desde disco local." "infrastructure/preregistro, infrastructure/exportaciones"
            }

            database = container "Base de datos Oracle" "Repositorio principal de datos operativos y autenticacion consumido por el backend." "Oracle Database" {
                tags "Database"
            }

            documentStorage = container "Almacenamiento de documentos" "Sistema de archivos local del backend para documentos cargados y archivos usados en exportaciones." "Local filesystem"
        }

        staff -> frontend "Lo usa para la operacion diaria" "HTTPS"
        applicant -> frontend "Lo usa para el pre-registro publico" "HTTPS"
        frontend -> backend "Consume la API REST" "HTTPS/JSON"
        backend -> database "Lee y escribe datos operativos" "Oracle SQL"
        backend -> documentStorage "Persiste y recupera archivos" "Filesystem I/O"

        staff -> shell "Accede al punto de entrada interno de la SPA"
        staff -> loginUi "Inicia sesion"
        applicant -> preregistroUi "Completa el flujo publico"
        shell -> loginUi "Carga la ruta publica de acceso"
        shell -> preregistroUi "Carga la ruta publica de pre-registro"
        shell -> dashboardUi "Carga rutas protegidas"
        shell -> beneficiariosUi "Carga rutas protegidas"
        shell -> citasUi "Carga rutas protegidas"
        shell -> recibosUi "Carga rutas protegidas"
        shell -> authSession "Delega validacion de acceso y sesion"
        loginUi -> authSession "Usa para autenticar credenciales"
        preregistroUi -> authSession "Usa token acotado de pre-registro para recursos del formulario"
        preregistroUi -> apiClient "Usa"
        dashboardUi -> navigationUi "Usa"
        dashboardUi -> sharedUi "Usa"
        dashboardUi -> apiClient "Usa"
        beneficiariosUi -> navigationUi "Usa"
        beneficiariosUi -> sharedUi "Usa"
        beneficiariosUi -> apiClient "Usa"
        citasUi -> navigationUi "Usa"
        citasUi -> sharedUi "Usa"
        citasUi -> apiClient "Usa"
        recibosUi -> navigationUi "Usa"
        recibosUi -> sharedUi "Usa"
        recibosUi -> apiClient "Usa"
        navigationUi -> authSession "Usa para mostrar usuario y logout"
        navigationUi -> apiClient "Usa para obtener notificaciones"
        authSession -> apiClient "Lo usa para llamadas autenticadas y con token de pre-registro"
        authSession -> backend "Autentica usuarios y valida contexto de sesion" "HTTPS/JSON"
        apiClient -> backend "Invoca endpoints de la API" "HTTPS/JSON"

        api -> access "Aplica autenticacion, roles, limites y politicas de solicitud"
        api -> appAuth "Delega endpoints de autenticacion"
        api -> appOperations "Delega endpoints operativos"
        api -> appPreregistro "Delega endpoints publicos y administrativos de pre-registro"
        api -> appNotifications "Expone el endpoint unificado de notificaciones"
        access -> infraSecurity "Usa servicios de JWT y contrasenas"
        appAuth -> domain "Usa reglas y contratos de dominio"
        appAuth -> infraSecurity "Usa hash de contrasenas y emision de tokens"
        appAuth -> repositories "Usa repositorio de usuarios Oracle"
        appOperations -> domain "Usa puertos y modelos de dominio"
        appOperations -> repositories "Usa adaptadores de repositorio enlazados"
        appOperations -> documents "Usa documentos locales para exportaciones"
        appPreregistro -> domain "Usa puertos y modelos de dominio"
        appPreregistro -> repositories "Usa repositorio Oracle de pre-registro"
        appPreregistro -> documents "Guarda y recupera documentos cargados"
        appNotifications -> appOperations "Consulta citas y membresias proximas"
        bootstrap -> appOperations "Inyecta repositorios"
        bootstrap -> appPreregistro "Inyecta repositorios"
        bootstrap -> repositories "Crea instancias concretas"
        repositories -> domain "Implementa puertos de repositorio"
        repositories -> persistence "Ejecuta SQL y procedimientos almacenados"
        infraSecurity -> persistence "Usa configuracion y contexto de persistencia cuando aplica"
        persistence -> database "Administra conexiones y consultas" "Oracle SQL"
        documents -> documentStorage "Persiste archivos binarios"
    }

    views {
        systemContext ebif "system-context" {
            include staff
            include applicant
            include ebif
            autoLayout lr
            title "Plataforma EBIF - Contexto del sistema"
        }

        container ebif "containers" {
            include staff
            include applicant
            include *
            autoLayout lr
            title "Plataforma EBIF - Vista de contenedores"
        }

        component frontend "frontend-components" {
            include staff
            include applicant
            include backend
            include *
            autoLayout lr
            title "Frontend EBIF - Componentes actuales"
        }

        component backend "backend-clean-architecture" {
            include database
            include documentStorage
            include *
            autoLayout lr
            title "Backend EBIF - Arquitectura limpia actual"
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
