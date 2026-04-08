# Tienda virtual - portafolio

**Resumen:** aplicación full stack para administrar una tienda: autenticación con JWT y cookies, CRUD de productos y categorías, ventas, caja, reportes con gráficos, usuarios/roles y ajustes. Frontend en Next.js; API REST en Spring Boot con PostgreSQL y Redis.

> Opcional: añade aquí tu nombre, enlace a LinkedIn o al deploy si lo tienes.

Pensada como proyecto de portafolio y referencia técnica en procesos de selección.

## Arquitectura

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript, [MUI](https://mui.com/) (Material + Joy), [Zustand](https://github.com/pmndrs/zustand), [Axios](https://axios-http.com/), Tailwind CSS 4 |
| **Backend** | [Spring Boot](https://spring.io/projects/spring-boot) 4, Java 21, Spring Security, JWT (JJWT), Spring Data JPA |
| **Datos** | PostgreSQL, Redis (sesiones/caché según configuración) |
| **Docs API** | [SpringDoc OpenAPI](https://springdoc.org/) (Swagger UI) |
| **Otros** | Generación de PDF ([OpenPDF](https://github.com/LibrePDF/OpenPDF)), subida de archivos locales |

El frontend proxifica las peticiones a `/api/*` hacia el backend mediante rewrites en `next.config.ts` (`BACKEND_URL`, por defecto `http://127.0.0.1:8080`).

## Funcionalidades (alto nivel)

- **Autenticación**: login, registro, cookies HTTP-only e interceptores Axios ante 401.
- **Dashboard**: resumen y navegación del panel.
- **Productos y categorías**: gestión del catálogo.
- **Ventas y caja**: operaciones de venta y flujo de caja.
- **Reportes**: visualización con gráficos (MUI X Charts).
- **Usuarios y roles**: administración de accesos.
- **Ajustes y notificaciones**: preferencias y avisos.

Las pantallas "coming soon" indican módulos en preparación.

## Requisitos previos

- **Node.js** 20+ (recomendado para Next 16)
- **npm** o compatible
- **JDK 21** y **Maven** (o `./mvnw` incluido en `store-backend`)
- **PostgreSQL** (base por defecto en config: `store_db` en `localhost:5432`)
- **Redis** en `localhost:6379` (valores por variables de entorno)

## Puesta en marcha

```bash
git clone <url-de-tu-repo>
cd tienda-virtual-portafolio
```

### 1. Base de datos y Redis

Crea la base PostgreSQL que uses en `SPRING_DATASOURCE_URL` (por defecto `jdbc:postgresql://localhost:5432/store_db`) y asegura que Redis esté accesible si la aplicación lo requiere en arranque.

### 2. Backend (`store-backend`)

```bash
cd store-backend
```

Copia y ajusta variables si hace falta (por ejemplo crea `.env` o exporta en el sistema):

| Variable | Descripción |
|----------|-------------|
| `SPRING_DATASOURCE_URL` | JDBC PostgreSQL |
| `DB_PASSWORD` | Contraseña del usuario BD |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis |
| `JWT_SECRET` | Secreto firma JWT (obligatorio en producción) |
| `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_DOMAIN` | Cookies de autenticación |

Arranque:

```bash
./mvnw spring-boot-run
# Windows: mvnw.cmd spring-boot-run
```

- API base: `http://localhost:8080/api` (context path `/api`).
- Swagger UI: `http://localhost:8080/api/swagger-ui.html` (ruta según `application.yaml`).

### 3. Frontend (`store-frontend`)

```bash
cd store-frontend
npm install
```

Opcional: archivo `.env.local` con, por ejemplo:

```env
BACKEND_URL=http://127.0.0.1:8080
```

Desarrollo:

```bash
npm run dev
```

Abre `http://localhost:3000`. Las llamadas a `/api` se reenvían al backend configurado en `BACKEND_URL`.

Producción:

```bash
npm run build
npm run start
```

## Estructura del repositorio

```
tienda-virtual-portafolio/
├── store-backend/    # Spring Boot, REST bajo /api
├── store-frontend/   # Next.js, UI del panel
└── README.md
```

## Seguridad

- **Autenticación:** JWT de acceso y refresco; el cliente usa **cookies HTTP-only** para limitar el acceso a tokens desde JavaScript.
- **Backend:** **Spring Security**, filtro de autenticación JWT, validación de DTOs y **revocación de sesión** mediante lista negra de tokens en **Redis**.
- **Transporte:** en entornos reales las APIs y el front deben servirse sobre **HTTPS** para proteger credenciales y datos en tránsito.

## Licencia

Este proyecto se publica bajo la [Licencia MIT](https://opensource.org/licenses/MIT). Puedes usar, copiar, modificar y distribuir el código manteniendo el aviso de copyright y la licencia incluidos.
