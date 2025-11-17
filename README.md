# 🚀 TiCheck - Sistema de Gestión de Tickets

Sistema integral para la gestión de solicitudes de instalación de equipos técnicos, diseñado para optimizar el flujo de trabajo entre los departamentos de Formación y TI.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [API Endpoints](#api-endpoints)
- [Base de Datos](#base-de-datos)
- [Características de Seguridad](#características-de-seguridad)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## ✨ Características

### 🎯 Funcionalidades Principales

- **Gestión de Solicitudes**: Creación, revisión, aprobación/rechazo de solicitudes de instalación
- **Sistema de Roles**: Acceso diferenciado para usuarios de Formación, TI y Sistemas
- **Autenticación 2FA**: Seguridad adicional con autenticación de dos factores usando TOTP
- **Historial Completo**: Tracking de todas las acciones realizadas en cada solicitud
- **Sistema de Cola**: Las solicitudes más antiguas se priorizan automáticamente (FIFO)
- **Gestión de Imágenes**: Subida y visualización de evidencias fotográficas
- **Exportación a Excel**: Generación de reportes en formato XLSX
- **Paginación Inteligente**: Navegación eficiente en grandes volúmenes de datos
- **Filtros Avanzados**: Búsqueda por DNI, campaña, estado, fecha, etc.
- **Notificaciones en Tiempo Real**: Feedback visual para todas las acciones
- **Sistema de Cache**: Almacenamiento local para continuación de revisiones
- **Control de Concurrencia**: Prevención de conflictos cuando múltiples usuarios revisan solicitudes

### 👥 Módulos por Rol

#### 📚 Formación
- Crear solicitudes de instalación para asesores
- Ver solicitudes públicas sin autenticación
- Consultar estado de solicitudes creadas

#### 💻 TI (Tecnología de Información)
- Tomar solicitudes en cola para revisión
- Verificar requisitos técnicos (Windows, CPU, RAM, Antivirus)
- Identificar problemas (AnyDesk, Red)
- Aprobar o rechazar solicitudes
- Registrar eliminaciones de usuarios
- Exportar reportes
- Ver estadísticas del departamento

#### ⚙️ Sistemas
- Gestión completa de usuarios
- Creación y edición de cuentas
- Asignación de roles
- Configuración de autenticación 2FA
- Gestión de usuarios autorizados para 2FA

## 🛠 Tecnologías

### Frontend (ticheck/)

#### Core
- **React 19.1.0** - Biblioteca de interfaz de usuario
- **React Router DOM 7.6.2** - Enrutamiento y navegación
- **React Scripts 5.0.1** - Configuración y scripts de desarrollo

#### Estilos y UI
- **Tailwind CSS 3.3.5** - Framework de utilidades CSS
- **PostCSS 8.5.4** - Procesamiento de CSS
- **Autoprefixer 10.4.21** - Compatibilidad CSS entre navegadores
- **Lucide React 0.525.0** - Librería de iconos moderna

#### Utilidades
- **Axios 1.9.0** - Cliente HTTP para peticiones API
- **date-fns 4.1.0** - Manipulación de fechas
- **jwt-decode 4.0.0** - Decodificación de tokens JWT
- **browser-image-compression 2.0.2** - Compresión de imágenes en el navegador
- **qrcode 1.5.4** - Generación de códigos QR para 2FA

#### Visualización de Datos
- **Recharts 3.0.2** - Gráficos y estadísticas interactivas

#### Testing
- **@testing-library/react 16.3.0** - Pruebas de componentes React
- **@testing-library/jest-dom 6.6.3** - Matchers personalizados para Jest
- **@testing-library/user-event 13.5.0** - Simulación de eventos de usuario

### Backend (tichek_back/)

#### Core
- **Node.js 24.2.0** - Entorno de ejecución JavaScript
- **Express 4.18.2** - Framework web para Node.js
- **dotenv 16.5.0** - Gestión de variables de entorno

#### Base de Datos
- **mssql 11.0.1** - Driver para Microsoft SQL Server
- **mysql2 3.14.1** - Driver para MySQL/MariaDB
- **mariadb 3.4.2** - Driver nativo para MariaDB

#### Seguridad
- **bcrypt 6.0.0** - Hashing de contraseñas
- **jsonwebtoken 9.0.2** - Generación y verificación de JWT
- **cors 2.8.5** - Control de acceso entre orígenes

#### Archivos y Datos
- **multer 2.0.1** - Manejo de subida de archivos
- **exceljs 4.4.0** - Generación de archivos Excel
- **xlsx 0.18.5** - Lectura/escritura de archivos Excel

#### Utilidades
- **axios 1.9.0** - Cliente HTTP para peticiones externas
- **node-fetch 3.3.2** - API Fetch para Node.js

## 📁 Estructura del Proyecto

```
ticheck/
├── public/                    # Archivos públicos
│   ├── index.html            # HTML principal
│   ├── manifest.json         # Manifest de la aplicación
│   └── robots.txt            # Configuración de robots
├── src/
│   ├── components/           # Componentes React
│   │   ├── common/          # Componentes reutilizables
│   │   │   ├── ContenedorNotificaciones.jsx
│   │   │   └── Notificacion.jsx
│   │   ├── formacion/       # Módulo de Formación
│   │   │   └── PanelFormacion.jsx
│   │   ├── sistemas/        # Módulo de Sistemas
│   │   │   └── usuarios/
│   │   │       ├── CrearUsuario.jsx
│   │   │       ├── EditarUsuario.jsx
│   │   │       └── GestionUsuarios.jsx
│   │   └── ti/              # Módulo de TI
│   │       ├── ConfigurarAuthenticator.jsx
│   │       ├── EstadisticasTI.jsx
│   │       ├── GestionAutorizados2FA.jsx
│   │       ├── GestionSolicitudes.jsx
│   │       ├── HistorialEliminaciones.jsx
│   │       ├── MesSelector.jsx
│   │       ├── PanelTI.jsx
│   │       └── RegistroEliminacion.jsx
│   ├── hooks/               # Custom React Hooks
│   │   └── useNotificacion.js
│   ├── utils/               # Utilidades
│   │   ├── authInterceptor.js
│   │   └── colorPalette.js
│   ├── App.jsx              # Componente principal
│   ├── App.css              # Estilos principales
│   ├── index.js             # Punto de entrada
│   ├── index.css            # Estilos globales
│   └── ProtectedRoute.jsx   # Componente de rutas protegidas
├── build/                   # Archivos compilados (producción)
├── package.json            # Dependencias y scripts
├── tailwind.config.js      # Configuración de Tailwind
└── postcss.config.js       # Configuración de PostCSS

tichek_back/
├── controllers/            # Controladores de lógica de negocio
├── middleware/            # Middlewares personalizados
│   └── authMiddleware.js  # Autenticación JWT
├── routes/                # Rutas de la API
│   ├── authRoutes.js      # Autenticación y login
│   ├── formacionRoutes.js # Rutas de Formación
│   ├── sistemaUsuariosRoutes.js # Gestión de usuarios
│   ├── solicitudesPublicas.js   # Consultas públicas
│   ├── tiRoutes.js        # Rutas de TI
│   └── usuariosRoutes.js  # Perfil y usuarios
├── scripts/               # Scripts SQL
│   ├── add_2fa_columns.sql
│   ├── add_problemas_columns.sql
│   ├── create_eliminaciones_table.sql
│   └── remove_2fa_columns.sql
├── uploads/               # Archivos subidos
│   └── solicitudes/       # Imágenes de solicitudes
├── check_table.js         # Verificación de tablas
├── create_table.js        # Creación de tablas
├── db.js                  # Configuración de base de datos
├── excelExport.js         # Exportación a Excel
├── package.json           # Dependencias del backend
├── remove_2fa_columns.js  # Script de migración
└── server.js              # Servidor principal
```

## 📦 Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **SQL Server** o **MariaDB/MySQL**
- **Git** (opcional, para clonar el repositorio)

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/ticheck.git
cd ticheck
```

### 2. Instalar Dependencias del Frontend

```bash
cd ticheck
npm install
```

### 3. Instalar Dependencias del Backend

```bash
cd ../tichek_back
npm install
```

## ⚙️ Configuración

### Frontend (.env)

Crear archivo `.env` en la carpeta `ticheck/`:

```env
REACT_APP_BACKEND=http://localhost:3001
```

### Backend (.env)

Crear archivo `.env` en la carpeta `tichek_back/`:

```env
# Servidor
PORT=3001
NODE_ENV=production

# Base de Datos SQL Server
DB_SERVER=localhost
DB_DATABASE=nombre_base_datos
DB_USER=usuario_db
DB_PASSWORD=contraseña_db
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_cambiala

# Configuración de CORS
CORS_ORIGIN=http://localhost:3000
```

### Configuración de Base de Datos

Ejecutar los scripts SQL en orden:

```bash
# 1. Crear tablas principales
node create_table.js

# 2. Agregar columnas de 2FA (si no existen)
# Ejecutar: scripts/add_2fa_columns.sql

# 3. Agregar columnas de problemas (si no existen)
# Ejecutar: scripts/add_problemas_columns.sql

# 4. Crear tabla de eliminaciones (si no existe)
# Ejecutar: scripts/create_eliminaciones_table.sql
```

## 🚀 Uso

### Desarrollo

#### Iniciar Backend
```bash
cd tichek_back
node server.js
```

El servidor estará disponible en `http://localhost:3001`

#### Iniciar Frontend
```bash
cd ticheck
npm start
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

#### Build del Frontend
```bash
cd ticheck
npm run build
```

Los archivos compilados estarán en `ticheck/build/`

#### Ejecutar Backend en Producción
```bash
cd tichek_back
NODE_ENV=production node server.js
```

## 🔌 API Endpoints

### Autenticación

```http
POST   /api/auth/login              # Iniciar sesión
POST   /api/auth/login/2fa          # Verificar código 2FA
POST   /api/auth/registro-inicial   # Registro inicial (admin)
```

### Usuarios

```http
GET    /api/usuarios/perfil         # Obtener perfil del usuario
GET    /api/usuarios                # Listar usuarios (sistemas)
POST   /api/usuarios                # Crear usuario (sistemas)
PUT    /api/usuarios/:id            # Actualizar usuario (sistemas)
DELETE /api/usuarios/:id            # Eliminar usuario (sistemas)
```

### Solicitudes (TI)

```http
GET    /api/ti/solicitudes          # Listar solicitudes con filtros
GET    /api/ti/solicitudes/:id      # Obtener detalle de solicitud
PUT    /api/ti/solicitudes/:id      # Aprobar/rechazar solicitud
POST   /api/ti/solicitudes/:id/tomar    # Tomar solicitud para revisión
POST   /api/ti/solicitudes/:id/liberar  # Liberar solicitud
GET    /api/ti/solicitudes/:id/historial # Ver historial
DELETE /api/ti/solicitudes/:id/imagen/:filename # Eliminar imagen
GET    /api/ti/solicitudes/export   # Exportar a Excel
```

### Solicitudes (Formación)

```http
GET    /api/formacion/solicitudes   # Listar solicitudes creadas
POST   /api/formacion/solicitudes   # Crear nueva solicitud
GET    /api/formacion/solicitudes/:id # Ver detalle
```

### Solicitudes Públicas

```http
GET    /api/solicitudes-publicas    # Consultar sin autenticación
```

### Eliminaciones

```http
GET    /api/ti/eliminaciones        # Listar eliminaciones
POST   /api/ti/eliminaciones        # Registrar eliminación
GET    /api/ti/eliminaciones/export # Exportar a Excel
```

### Catálogos

```http
GET    /api/ti/campanias            # Obtener campañas únicas
GET    /api/ti/asesores             # Obtener asesores únicos
```

### Autenticación 2FA

```http
POST   /api/sistemas/usuarios/2fa/generar    # Generar código QR 2FA
POST   /api/sistemas/usuarios/2fa/activar    # Activar 2FA
POST   /api/sistemas/usuarios/2fa/desactivar # Desactivar 2FA
GET    /api/sistemas/usuarios/autorizados-2fa # Listar autorizados
POST   /api/sistemas/usuarios/autorizados-2fa # Autorizar usuario
DELETE /api/sistemas/usuarios/autorizados-2fa/:id # Revocar autorización
```

## 🗄️ Base de Datos

### Tablas Principales

#### `usuarios`
- `id` (INT, PK)
- `dni` (VARCHAR)
- `nombre` (VARCHAR)
- `apellido` (VARCHAR)
- `rol` (VARCHAR: 'formacion', 'ti', 'sistemas')
- `contraseña` (VARCHAR, hashed)
- `twofa_secret` (VARCHAR)
- `twofa_enabled` (BIT)
- `fecha_creacion` (DATETIME)

#### `solicitudes_instalacion`
- `id` (INT, PK)
- `dni_asesor` (VARCHAR)
- `nombre_asesor` (VARCHAR)
- `campaña` (VARCHAR)
- `anydesk` (VARCHAR)
- `correo_usuario` (VARCHAR)
- `estado` (VARCHAR: 'pendiente', 'aprobada', 'rechazada')
- `windows_actualizado` (BIT)
- `procesador_cumple` (BIT)
- `ram_cumple` (BIT)
- `tiene_antivirus` (BIT)
- `problemas_anydesk` (BIT)
- `problemas_red` (BIT)
- `mac_address` (VARCHAR)
- `observaciones` (TEXT)
- `imagenes` (TEXT, JSON)
- `creado_por` (INT, FK)
- `revisado_por` (INT, FK)
- `revisando_por` (INT, FK)
- `fecha_creacion` (DATETIME)
- `fecha_revision` (DATETIME)
- `fecha_revision_iniciada` (DATETIME)

#### `historial_solicitudes`
- `id` (INT, PK)
- `solicitud_id` (INT, FK)
- `usuario_id` (INT, FK)
- `accion` (VARCHAR)
- `estado_anterior` (VARCHAR)
- `estado_nuevo` (VARCHAR)
- `observaciones` (TEXT)
- `fecha_accion` (DATETIME)

#### `eliminaciones_usuarios`
- `id` (INT, PK)
- `fecha_eliminacion` (DATETIME)
- `usuario_eliminado` (VARCHAR)
- `equipo_hostname` (VARCHAR)
- `responsable_id` (INT, FK)
- `responsable_nombre` (VARCHAR)
- `metodo_aplicado` (VARCHAR)
- `observaciones` (TEXT)
- `fecha_creacion` (DATETIME)

#### `usuarios_autorizados_2fa`
- `id` (INT, PK)
- `dni` (VARCHAR)
- `nombre_completo` (VARCHAR)
- `autorizador_id` (INT, FK)
- `autorizador_nombre` (VARCHAR)
- `fecha_autorizacion` (DATETIME)

## 🔒 Características de Seguridad

### Autenticación
- **JWT (JSON Web Tokens)**: Tokens con expiración de 8 horas
- **Bcrypt**: Hash seguro de contraseñas con salt rounds
- **2FA (Two-Factor Authentication)**: TOTP con QR Code usando Speakeasy
- **Lista de Autorizados**: Control de usuarios habilitados para 2FA

### Autorización
- **Middleware de Autenticación**: Verificación de tokens en todas las rutas protegidas
- **Control de Roles**: Acceso diferenciado por rol de usuario
- **Verificación de Permisos**: Validación de permisos en cada endpoint

### Protección de Datos
- **Validación de Entrada**: Sanitización de datos del usuario
- **Prevención de Inyección SQL**: Uso de parámetros preparados
- **CORS Configurado**: Control de acceso entre orígenes
- **Variables de Entorno**: Credenciales y secretos fuera del código

### Control de Concurrencia
- **Sistema de Bloqueo**: Prevención de revisiones simultáneas
- **Timestamps**: Tracking de fecha de inicio de revisión
- **Liberación Automática**: Mecanismo de timeout para solicitudes bloqueadas

## 📊 Flujo de Trabajo

### Proceso de Solicitud

1. **Formación** crea una solicitud con datos del asesor
2. La solicitud entra en cola (estado: `pendiente`)
3. **TI** toma la solicitud (se asigna automáticamente)
4. **TI** verifica requisitos técnicos y sube evidencias
5. **TI** aprueba o rechaza la solicitud
6. Sistema registra en historial y actualiza estado
7. Solicitud disponible para consulta en estado final

### Flujo de Autenticación 2FA

1. Usuario inicia sesión con DNI y contraseña
2. Sistema verifica si tiene 2FA habilitado
3. Usuario debe estar en lista de autorizados
4. Genera código TOTP de 6 dígitos
5. Usuario ingresa código desde su aplicación (Google Authenticator, Authy, etc.)
6. Sistema valida y otorga acceso

## 🎨 Interfaz de Usuario

### Diseño Responsivo
- **Mobile First**: Optimizado para dispositivos móviles
- **Breakpoints**: Adaptación automática a diferentes tamaños de pantalla
- **Touch Friendly**: Controles táctiles optimizados

### Componentes Modernos
- **Modals**: Ventanas emergentes para detalles y edición
- **Notificaciones**: Feedback visual tipo toast
- **Tablas Paginadas**: Navegación eficiente de datos
- **Filtros Dinámicos**: Búsqueda en tiempo real
- **Botones Interactivos**: Estados hover, active, disabled
- **Iconografía**: Lucide React para iconos consistentes

### Tema de Colores
- **Primario**: Azul (#3B82F6)
- **Éxito**: Verde (#10B981)
- **Peligro**: Rojo (#EF4444)
- **Advertencia**: Amarillo/Ámbar (#F59E0B)
- **Neutral**: Grises (#6B7280)

## 🧪 Testing

```bash
# Ejecutar tests del frontend
cd ticheck
npm test

# Ejecutar tests con cobertura
npm test -- --coverage
```

## 📈 Rendimiento

- **Lazy Loading**: Carga diferida de componentes
- **Memoización**: Optimización de re-renders con React.memo
- **Compresión de Imágenes**: Reducción automática de tamaño (max 1MB)
- **Paginación**: Carga incremental de datos
- **Cache Local**: LocalStorage para datos de sesión y progreso

## 🐛 Debugging

### Variables de Entorno de Desarrollo

```env
# Habilitar logs detallados
DEBUG=true

# Desactivar HTTPS en desarrollo
DB_ENCRYPT=false
```

### Logs del Servidor

El backend registra eventos importantes:
- Conexiones a base de datos
- Errores de autenticación
- Subida de archivos
- Operaciones CRUD

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convenciones de Código

- **JavaScript/React**: ESLint + Prettier
- **Naming**: camelCase para variables, PascalCase para componentes
- **Commits**: Mensajes descriptivos en presente ("Add feature" no "Added feature")
- **Comentarios**: Documentar lógica compleja

## 📝 Changelog

### Version 1.0.0 (2025-11-17)

#### Agregado
- Sistema completo de gestión de solicitudes
- Autenticación con JWT y 2FA
- Módulos de Formación, TI y Sistemas
- Exportación a Excel
- Sistema de historial y auditoría
- Control de concurrencia para revisiones
- Gestión de imágenes con compresión
- Sistema de notificaciones
- Paginación y filtros avanzados
- Registro de eliminaciones de usuarios

#### Mejorado
- Orden de cola FIFO (más antiguas primero)
- Diseño de interfaz con Tailwind CSS
- Validaciones de formularios
- Manejo de errores

## 📄 Licencia

Este proyecto es de código cerrado. Todos los derechos reservados.

## 👨‍💻 Autor

**Enrique Salber**
- GitHub: [@enriquesalber](https://github.com/enriquesalber)

## 🙏 Agradecimientos

- Equipo de TI de Konecta Perú
- Departamento de Formación
- Área de Sistemas

## 📞 Soporte

Para soporte técnico o consultas:
- Email: ti@empresa.com
- Teléfono: +51 XXX XXX XXX

---

⭐ **Desarrollado con ❤️ por el equipo de TI**
