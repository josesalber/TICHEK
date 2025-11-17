const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log('🚀 Iniciando servidor...');

// ✅ CORS DINÁMICO MEJORADO (de la versión sin errores)
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];


app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman) o origins permitidos
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'] // ✅ Simplificado
}));

// ✅ Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ RUTA DE SALUD (primera y básica)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString(),
        puerto: process.env.PORT || 3001
    });
});

// ✅ VARIABLES PARA ALMACENAR LAS RUTAS (SIN MONITORES)
let authRoutes, sistemaUsuariosRoutes, tiRoutes, formacionRoutes, usuariosRoutes, solicitudesPublicasRoutes;

// ✅ CARGAR TODAS LAS RUTAS CON LOGS DETALLADOS
console.log('🔄 Cargando rutas...');

try {
    // Cargar authRoutes
    console.log('📁 Cargando authRoutes...');
    authRoutes = require('./routes/authRoutes');
    console.log('✅ authRoutes cargadas');

    // Cargar sistemaUsuariosRoutes
    console.log('📁 Cargando sistemaUsuariosRoutes...');
    sistemaUsuariosRoutes = require('./routes/sistemaUsuariosRoutes');
    console.log('✅ sistemaUsuariosRoutes cargadas');

    // Cargar tiRoutes
    console.log('📁 Cargando tiRoutes...');
    tiRoutes = require('./routes/tiRoutes');
    console.log('✅ tiRoutes cargadas');

    // Cargar formacionRoutes
    console.log('📁 Cargando formacionRoutes...');
    formacionRoutes = require('./routes/formacionRoutes');
    console.log('✅ formacionRoutes cargadas');

    // Cargar usuariosRoutes
    console.log('📁 Cargando usuariosRoutes...');
    usuariosRoutes = require('./routes/usuariosRoutes');
    console.log('✅ usuariosRoutes cargadas');

    // Cargar solicitudesPublicasRoutes
    console.log('📁 Cargando solicitudesPublicasRoutes...');
    solicitudesPublicasRoutes = require('./routes/solicitudesPublicas');
    console.log('✅ solicitudesPublicasRoutes cargadas');

    // ❌ NO CARGAR monitores (como en tu versión)

} catch (error) {
    console.error('❌ Error al cargar rutas:', error.message);
    console.error('📍 Stack:', error.stack); 
    process.exit(1);
}

// ✅ REGISTRAR TODAS LAS RUTAS
console.log('🔗 Registrando rutas...');
app.use('/api/auth', authRoutes);
// Permitir que /api/usuarios use también las rutas de sistemaUsuariosRoutes (PUT, POST, etc)
// Primero rutas de gestión (PUT/POST), luego las de perfil
app.use('/api/usuarios', sistemaUsuariosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/sistemas', sistemaUsuariosRoutes);
app.use('/api/ti', tiRoutes);
app.use('/api/formacion', formacionRoutes);
app.use('/api/solicitudes-publicas', solicitudesPublicasRoutes);
console.log('✅ Todas las rutas registradas');

// ✅ SERVIR ARCHIVOS ESTÁTICOS DESDE /uploads

// Servir archivos estáticos desde /home/titan/uploads/solicitudes
const path = require('path');
const uploadsDirTitan = '/home/titan/uploads/solicitudes';
app.use('/uploads/solicitudes', express.static(uploadsDirTitan));
console.log('✅ Servidor de archivos estáticos configurado en /uploads/solicitudes (-> /home/titan/uploads/solicitudes)');

// ✅ RUTA RAÍZ (SIN MONITORES)
app.get('/', (req, res) => {
    res.json({
        message: 'Sistema Peru Info - Backend',
        version: '2.0.0',
        status: 'OK',
        puerto: process.env.PORT || 3001,
        frontend_url: '172.17.248.8:3004',
        endpoints: [
            '/api/health',
            '/api/auth',
            '/api/usuarios',
            '/api/sistemas',
            '/api/ti',
            '/api/formacion',
            '/uploads (archivos estáticos)'
        ]
    });
});

// ✅ CAPTURAR TODAS LAS DEMÁS RUTAS (SIN MONITORES)
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        availableRoutes: [
            '/api/health',
            '/api/auth',
            '/api/usuarios',
            '/api/sistemas',
            '/api/ti',
            '/api/formacion',
            '/uploads'
        ]
    });
});

// ✅ MANEJO DE ERRORES MEJORADO
app.use((error, req, res, next) => {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// ✅ INICIAR SERVIDOR EN PUERTO 3001
const PORT = process.env.PORT || 3001;

app.listen(PORT, (error) => {
    if (error) {
        console.error('❌ Error al iniciar:', error);
        process.exit(1);
    }

    console.log(`\n🚀 ====================================`);
    console.log(`✅ Backend Sistema Peru Info INICIADO`);
    console.log(`🚀 ====================================`);
    console.log(`🌐 Acceso IP: http://172.17.248.25:${PORT}`);
    console.log(`🎯 Frontend: http://172.17.248.25:3004`);
    console.log(`📊 Base de datos: peruinfo`);
    console.log(`👥 Roles: sistemas, formacion, ti`); // Actualizado
    console.log(`\n📋 Rutas disponibles:`);
    console.log(`   GET  /api/health`);
    console.log(`   POST /api/auth/login`);
    console.log(`   POST /api/auth/registro-inicial`);
    console.log(`   GET  /api/auth/verificar-registro-inicial`);
    console.log(`   GET  /api/usuarios/perfil`);
    console.log(`   POST /api/sistemas/usuarios`);
    console.log(`   GET  /api/sistemas/usuarios`);
    console.log(`   PUT  /api/sistemas/usuarios/actualizar`);
    console.log(`   PUT  /api/sistemas/usuarios/estado`);
    console.log(`   POST /api/ti/...`);
    console.log(`   POST /api/formacion/...`);
    console.log(`\n🟢 Sistema listo para recibir peticiones\n`);
});
