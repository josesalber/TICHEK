const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Middleware para verificar que el usuario sea de TI
const verificarTI = (req, res, next) => {
    const user = req.user || req.usuario;
    if (!user || user.rol !== 'ti') {
        return res.status(403).json({ message: 'Acceso denegado. Solo usuarios de TI pueden acceder.' });
    }
    req.usuario = user;
    next();
};

// Exportar solicitudes aprobadas/rechazadas a Excel por rango de fechas y profesional
const { exportSolicitudesToExcel } = require('../excelExport');
router.get('/solicitudes/export', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { desde, hasta, campaña } = req.query;
        let where = `WHERE s.estado IN ('aprobada', 'rechazada')`;
        const params = {};
        if (desde) {
            where += ` AND s.fecha_revision >= @desde`;
            params.desde = desde;
        }
        if (hasta) {
            where += ` AND s.fecha_revision <= @hasta`;
            params.hasta = hasta;
        }
        if (campaña) {
            where += ` AND s.campaña = @campaña`;
            params.campaña = campaña;
        }
        const result = await query(`
            SELECT 
                s.dni_asesor, s.nombre_asesor, s.campaña, s.anydesk, s.correo_usuario,
                s.estado, s.windows_actualizado, s.procesador_cumple, s.ram_cumple, s.tiene_antivirus, s.mac_address
            FROM solicitudes_instalacion s
            ${where}
            ORDER BY s.fecha_revision DESC
        `, params);
        await exportSolicitudesToExcel(result.recordset, res);
    } catch (error) {
        console.error('Error al exportar solicitudes:', error);
        res.status(500).json({ message: 'Error interno al exportar solicitudes' });
    }
});

// Utilidad para obtener la fecha/hora de Lima (UTC-5)
function getLimaDate() {
    // Crear fecha actual en UTC
    const now = new Date();
    // Lima está en UTC-5 (sin horario de verano)
    const limaOffset = -5 * 60; // -5 horas en minutos
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const limaTime = new Date(utc + (limaOffset * 60000));
    
    // Formatear como YYYY-MM-DD HH:MM:SS para MySQL
    const year = limaTime.getFullYear();
    const month = String(limaTime.getMonth() + 1).padStart(2, '0');
    const day = String(limaTime.getDate()).padStart(2, '0');
    const hours = String(limaTime.getHours()).padStart(2, '0');
    const minutes = String(limaTime.getMinutes()).padStart(2, '0');
    const seconds = String(limaTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Ruta absoluta para almacenamiento de imágenes (compatible con Windows)
const uploadsDir = process.platform === 'win32' 
    ? path.join(__dirname, '..', 'uploads', 'solicitudes')
    : '/home/titan/uploads/solicitudes';

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Directorio ${uploadsDir} creado`);
}

// Configuración de multer para guardar imágenes en /home/titan/uploads/solicitudes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Multer destination - file.originalname:', file.originalname);
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
        const finalName = uniqueSuffix + '-' + cleanName;
        console.log('Multer filename - original:', file.originalname, 'final:', finalName);
        cb(null, finalName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB por archivo
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    }
});

// 🔒 Todas las rutas usan authenticateToken + verificarTI

// ✅ Obtener solicitudes con filtros
router.get('/solicitudes', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { page = 1, limit = 10, estado, dni_asesor, campaña, desde, hasta } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = { offset, limit: parseInt(limit) };

        if (estado && ['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
            whereClause += ' AND s.estado = @estado';
            params.estado = estado;
        }

        if (dni_asesor) {
            whereClause += ' AND s.dni_asesor LIKE @dni_asesor';
            params.dni_asesor = `%${dni_asesor}%`;
        }

        if (campaña) {
            whereClause += ' AND s.campaña LIKE @campaña';
            params.campaña = `%${campaña}%`;
        }

        // Filtro por fecha_creacion (ya no por fecha_revision)
        if (desde) {
            whereClause += ' AND s.fecha_creacion >= @desde';
            params.desde = desde;
        }
        if (hasta) {
            whereClause += ' AND s.fecha_creacion <= @hasta';
            params.hasta = hasta;
        }

        const queryText = `
            SELECT 
                s.id,
                s.dni_asesor,
                s.nombre_asesor,
                s.campaña,
                s.anydesk,
                s.estado,
                s.fecha_creacion,
                s.fecha_revision,
                s.observaciones,
                s.windows_actualizado,
                s.procesador_cumple,
                s.ram_cumple,
                s.tiene_antivirus,
                s.problemas_anydesk,
                s.problemas_red,
                s.mac_address,
                s.correo_usuario,
                s.revisando_por,
                s.fecha_revision_iniciada,
                u1.nombre + ' ' + u1.apellido as creador_nombre,
                u1.dni as creador_dni,
                u2.nombre + ' ' + u2.apellido as revisor_nombre,
                u3.nombre + ' ' + u3.apellido as revisando_nombre
            FROM solicitudes_instalacion s
            LEFT JOIN usuarios u1 ON s.creado_por = u1.id
            LEFT JOIN usuarios u2 ON s.revisado_por = u2.id
            LEFT JOIN usuarios u3 ON s.revisando_por = u3.id
            ${whereClause}
            ORDER BY 
                CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 2 END,
                s.fecha_creacion ASC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;
        const result = await query(queryText, params);

        const countQuery = `SELECT COUNT(*) as total FROM solicitudes_instalacion s ${whereClause}`;
        const countResult = await query(countQuery, params);
        const total = countResult.recordset[0].total;

        res.json({
            solicitudes: result.recordset,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// ✅ Actualizar solicitud
router.put('/solicitudes/:id', authenticateToken, verificarTI, (req, res, next) => {
    // Log antes de Multer
    console.log('--- INICIO PUT /solicitudes/:id ---');
    console.log('Headers Content-Type:', req.headers['content-type']);
    next();
}, (req, res, next) => {
    // Wrapper para manejar errores de Multer
    upload.array('imagenes', 5)(req, res, (err) => {
        if (err) {
            console.error('Error en Multer:', err);
            return res.status(400).json({ success: false, message: 'Error al subir archivos: ' + err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('Archivos recibidos por Multer:', req.files);
        const { id } = req.params;
        const {
            estado, observaciones,
            windows_actualizado, procesador_cumple, ram_cumple, tiene_antivirus,
            problemas_anydesk, problemas_red,
            mac_address
        } = req.body;

        if (!estado || !['aprobada', 'rechazada'].includes(estado)) {
            return res.status(400).json({ success: false, message: 'Estado inválido' });
        }

        if (estado === 'aprobada') {
            if (
                windows_actualizado === null || procesador_cumple === null ||
                ram_cumple === null || tiene_antivirus === null
            ) {
                return res.status(400).json({ success: false, message: 'Faltan checks técnicos' });
            }

            if (!mac_address) {
                return res.status(400).json({ success: false, message: 'MAC address es obligatorio para aprobar' });
            }

            const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
            if (!macRegex.test(mac_address)) {
                return res.status(400).json({ success: false, message: 'MAC inválido' });
            }
        }

        const solicitudResult = await query(
            'SELECT * FROM solicitudes_instalacion WHERE id = @id',
            { id: parseInt(id) }
        );

        if (solicitudResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'No encontrada' });
        }

        const solicitudAnterior = solicitudResult.recordset[0];
        if (solicitudAnterior.estado !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Solo solicitudes pendientes' });
        }

        // Obtener imágenes ya guardadas
        let imagenesPrevias = [];
        if (solicitudAnterior.imagenes) {
            try {
                imagenesPrevias = JSON.parse(solicitudAnterior.imagenes) || [];
            } catch {
                imagenesPrevias = [];
            }
        }
        // Guardar nombres de imágenes nuevas si se subieron
        let nuevasImagenes = [];
        if (req.files && req.files.length > 0) {
            nuevasImagenes = req.files.map(f => f.filename);
            console.log('Archivos subidos:', nuevasImagenes);
            // Validar que los archivos existan físicamente
            nuevasImagenes.forEach(fn => {
                const fp = path.join(uploadsDir, fn);
                if (!fs.existsSync(fp)) {
                    console.error('Archivo no existe tras subida:', fp);
                }
            });
        }
        // Combinar imágenes previas (que no hayan sido eliminadas) con las nuevas
        // Si el frontend elimina imágenes, debe llamar al endpoint DELETE antes de este PUT
        // Así, imagenesPrevias ya está actualizado
        const imagenesFinal = [...imagenesPrevias, ...nuevasImagenes];
        console.log('Imágenes finales a guardar:', imagenesFinal);

        await query(`
            UPDATE solicitudes_instalacion SET 
                estado = @estado,
                observaciones = @observaciones,
                windows_actualizado = @windows_actualizado,
                procesador_cumple = @procesador_cumple,
                ram_cumple = @ram_cumple,
                tiene_antivirus = @tiene_antivirus,
                problemas_anydesk = @problemas_anydesk,
                problemas_red = @problemas_red,
                mac_address = @mac_address,
                revisado_por = @revisado_por,
                fecha_revision = @fecha_revision,
                imagenes = @imagenes,
                revisando_por = NULL,
                fecha_revision_iniciada = NULL
            WHERE id = @id
        `, {
            id: parseInt(id),
            estado,
            observaciones: observaciones || null,
            windows_actualizado,
            procesador_cumple,
            ram_cumple,
            tiene_antivirus,
            problemas_anydesk: problemas_anydesk === 'true' || problemas_anydesk === true,
            problemas_red: problemas_red === 'true' || problemas_red === true,
            mac_address: mac_address || null,
            revisado_por: req.user.id,
            fecha_revision: getLimaDate(),
            imagenes: JSON.stringify(imagenesFinal)
        });

        await query(`
            INSERT INTO historial_solicitudes (solicitud_id, usuario_id, accion, estado_anterior, estado_nuevo, observaciones)
            VALUES (@solicitud_id, @usuario_id, @accion, @estado_anterior, @estado_nuevo, @observaciones)
        `, {
            solicitud_id: parseInt(id),
            usuario_id: req.user.id,
            accion: estado,
            estado_anterior: solicitudAnterior.estado,
            estado_nuevo: estado,
            observaciones: observaciones || `Revisado por TI`
        });

        res.json({ success: true, message: `Solicitud ${estado}` });

    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});

// ✅ Obtener detalle de una solicitud
router.get('/solicitudes/:id', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                s.*, 
                u1.nombre + ' ' + u1.apellido as creador_nombre,
                u1.dni as creador_dni,
                u2.nombre + ' ' + u2.apellido as revisor_nombre,
                u3.nombre + ' ' + u3.apellido as revisando_nombre
            FROM solicitudes_instalacion s
            LEFT JOIN usuarios u1 ON s.creado_por = u1.id
            LEFT JOIN usuarios u2 ON s.revisado_por = u2.id
            LEFT JOIN usuarios u3 ON s.revisando_por = u3.id
            WHERE s.id = @id
        `, { id: parseInt(id) });

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'No encontrada' });
        }

        res.json({ success: true, solicitud: result.recordset[0] });

    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// ✅ Obtener historial
router.get('/solicitudes/:id/historial', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                h.*, 
                u.nombre + ' ' + u.apellido as usuario_nombre,
                u.rol, u.dni
            FROM historial_solicitudes h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.solicitud_id = @solicitud_id
            ORDER BY h.fecha_accion DESC
        `, { solicitud_id: parseInt(id) });

        res.json({ success: true, historial: result.recordset });

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// Eliminar imagen de una solicitud (TI)
router.delete('/solicitudes/:id/imagen/:filename', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { id, filename } = req.params;
        // Obtener solicitud
        const result = await query('SELECT imagenes FROM solicitudes_instalacion WHERE id = @id', { id: parseInt(id) });
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }
        let imagenes = [];
        if (result.recordset[0].imagenes) {
            imagenes = JSON.parse(result.recordset[0].imagenes);
        }
        // Quitar la imagen del array
        const nuevasImagenes = imagenes.filter(img => img !== filename);
        // Actualizar en la BD
        await query('UPDATE solicitudes_instalacion SET imagenes = @imagenes WHERE id = @id', {
            id: parseInt(id),
            imagenes: JSON.stringify(nuevasImagenes)
        });
        // Eliminar archivo físico solo si existe
        const filePath = path.join(uploadsDir, filename);
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (!err) {
                fs.unlink(filePath, (err2) => {
                    if (err2) {
                        console.warn('No se pudo eliminar archivo físico:', filePath, err2.message);
                    }
                });
            } else {
                // Solo loguear si no existe, no lanzar error
                console.warn('Archivo físico no existe al intentar eliminar:', filePath);
            }
        });
        res.json({ success: true, message: 'Imagen eliminada' });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// ✅ Tomar solicitud para revisión (asignarla al usuario actual)
router.post('/solicitudes/:id/tomar', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que la solicitud existe y está pendiente
        const solicitudResult = await query(
            'SELECT * FROM solicitudes_instalacion WHERE id = @id',
            { id: parseInt(id) }
        );

        if (solicitudResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        const solicitud = solicitudResult.recordset[0];
        
        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Solo se pueden tomar solicitudes pendientes' });
        }

        // Verificar si ya está siendo revisada por otro usuario
        if (solicitud.revisando_por && solicitud.revisando_por !== userId) {
            const revisorResult = await query(
                'SELECT nombre, apellido FROM usuarios WHERE id = @id',
                { id: solicitud.revisando_por }
            );
            const revisorNombre = revisorResult.recordset[0] ? 
                `${revisorResult.recordset[0].nombre} ${revisorResult.recordset[0].apellido}` : 
                'Otro usuario';
            
            return res.status(409).json({ 
                success: false, 
                message: `Esta solicitud está siendo revisada por ${revisorNombre}` 
            });
        }

        // Asignar la solicitud al usuario actual
        await query(`
            UPDATE solicitudes_instalacion 
            SET revisando_por = @userId, fecha_revision_iniciada = @fecha
            WHERE id = @id
        `, {
            id: parseInt(id),
            userId: userId,
            fecha: getLimaDate()
        });

        res.json({ success: true, message: 'Solicitud asignada para revisión' });

    } catch (error) {
        console.error('Error al tomar solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// ✅ Liberar solicitud (desasignarla del usuario actual)
router.post('/solicitudes/:id/liberar', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que la solicitud está asignada al usuario actual
        const solicitudResult = await query(
            'SELECT * FROM solicitudes_instalacion WHERE id = @id AND revisando_por = @userId',
            { id: parseInt(id), userId: userId }
        );

        if (solicitudResult.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o no asignada a ti' 
            });
        }

        // Liberar la solicitud
        await query(`
            UPDATE solicitudes_instalacion 
            SET revisando_por = NULL, fecha_revision_iniciada = NULL
            WHERE id = @id
        `, { id: parseInt(id) });

        res.json({ success: true, message: 'Solicitud liberada' });

    } catch (error) {
        console.error('Error al liberar solicitud:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// Obtener campañas únicas para el filtro
router.get('/campanias', authenticateToken, verificarTI, async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT campaña 
            FROM solicitudes_instalacion 
            WHERE campaña IS NOT NULL AND campaña != ''
            ORDER BY campaña ASC
        `);
        
        const campañas = result.recordset.map(row => row.campaña);
        res.json({ success: true, campañas });
    } catch (error) {
        console.error('Error al obtener campañas:', error);
        res.status(500).json({ message: 'Error al obtener campañas' });
    }
});

// Obtener asesores únicos para el filtro
router.get('/asesores', authenticateToken, verificarTI, async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT dni_asesor, nombre_asesor
            FROM solicitudes_instalacion
            WHERE dni_asesor IS NOT NULL AND nombre_asesor IS NOT NULL AND dni_asesor != ''
            ORDER BY nombre_asesor ASC
        `);
        res.json({ success: true, asesores: result.recordset });
    } catch (error) {
        console.error('Error al obtener asesores:', error);
        res.status(500).json({ message: 'Error al obtener asesores' });
    }
});

// ✅ NUEVAS RUTAS PARA ELIMINACIONES DE USUARIOS

// Obtener historial de eliminaciones con filtros y paginación
router.get('/eliminaciones', authenticateToken, verificarTI, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            desde,
            hasta,
            usuario_eliminado,
            responsable,
            metodo
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = { offset, limit: parseInt(limit) };

        // Filtros
        if (desde) {
            whereClause += ' AND e.fecha_eliminacion >= @desde';
            params.desde = desde + ' 00:00:00';
        }

        if (hasta) {
            whereClause += ' AND e.fecha_eliminacion <= @hasta';
            params.hasta = hasta + ' 23:59:59';
        }

        if (usuario_eliminado) {
            whereClause += ' AND e.usuario_eliminado LIKE @usuario_eliminado';
            params.usuario_eliminado = `%${usuario_eliminado}%`;
        }

        if (responsable) {
            whereClause += ' AND e.responsable_nombre LIKE @responsable';
            params.responsable = `%${responsable}%`;
        }

        if (metodo) {
            whereClause += ' AND e.metodo_aplicado = @metodo';
            params.metodo = metodo;
        }

        // Consulta principal
        const queryText = `
            SELECT 
                e.id,
                e.fecha_eliminacion,
                e.usuario_eliminado,
                e.equipo_hostname,
                e.responsable_nombre,
                e.metodo_aplicado,
                e.observaciones,
                e.fecha_creacion
            FROM eliminaciones_usuarios e
            ${whereClause}
            ORDER BY e.fecha_eliminacion DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const result = await query(queryText, params);

        // Contar total
        const countQuery = `SELECT COUNT(*) as total FROM eliminaciones_usuarios e ${whereClause}`;
        const countResult = await query(countQuery, params);
        const total = countResult.recordset[0].total;

        res.json({
            success: true,
            eliminaciones: result.recordset,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error al obtener eliminaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});


// Exportar eliminaciones a Excel (única versión correcta)
router.get('/eliminaciones/export', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { desde, hasta, usuario_eliminado, responsable, metodo } = req.query;
        let whereClause = 'WHERE 1=1';
        const params = {};

        if (desde) {
            whereClause += ' AND e.fecha_eliminacion >= @desde';
            params.desde = desde;
        }
        if (hasta) {
            whereClause += ' AND e.fecha_eliminacion <= @hasta';
            params.hasta = hasta;
        }
        if (usuario_eliminado) {
            whereClause += ' AND e.usuario_eliminado LIKE @usuario_eliminado';
            params.usuario_eliminado = `%${usuario_eliminado}%`;
        }
        if (responsable) {
            whereClause += ' AND e.responsable_nombre LIKE @responsable';
            params.responsable = `%${responsable}%`;
        }
        if (metodo) {
            whereClause += ' AND e.metodo_aplicado = @metodo';
            params.metodo = metodo;
        }

        // Exportar todos los campos requeridos, sin alias, para que coincidan con el Excel
        const result = await query(`
            SELECT 
                e.id,
                e.fecha_eliminacion,
                e.usuario_eliminado,
                e.equipo_hostname,
                e.responsable_id,
                e.responsable_nombre,
                e.metodo_aplicado,
                e.observaciones
            FROM eliminaciones_usuarios e
            ${whereClause}
            ORDER BY e.fecha_eliminacion DESC
        `, params);

        const { exportEliminacionesToExcel } = require('../excelExport');
        await exportEliminacionesToExcel(result.recordset, res);

    } catch (error) {
        console.error('Error al exportar eliminaciones:', error);
        res.status(500).json({ message: 'Error interno al exportar eliminaciones' });
    }
});

// ✅ RUTAS DE ELIMINACIONES

// Obtener eliminaciones con filtros
router.get('/eliminaciones', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { page = 1, limit = 20, desde, hasta, usuario_eliminado, responsable, metodo } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = { offset, limit: parseInt(limit) };

        if (desde) {
            whereClause += ' AND e.fecha_eliminacion >= @desde';
            params.desde = desde;
        }
        if (hasta) {
            whereClause += ' AND e.fecha_eliminacion <= @hasta';
            params.hasta = hasta;
        }
        if (usuario_eliminado) {
            whereClause += ' AND e.usuario_eliminado LIKE @usuario_eliminado';
            params.usuario_eliminado = `%${usuario_eliminado}%`;
        }
        if (responsable) {
            whereClause += ' AND e.responsable_nombre LIKE @responsable';
            params.responsable = `%${responsable}%`;
        }
        if (metodo) {
            whereClause += ' AND e.metodo_aplicado = @metodo';
            params.metodo = metodo;
        }

        const queryText = `
            SELECT 
                e.id,
                e.fecha_eliminacion,
                e.usuario_eliminado,
                e.equipo_hostname,
                e.responsable_nombre,
                e.metodo_aplicado,
                e.observaciones,
                e.responsable_id
            FROM eliminaciones_usuarios e
            ${whereClause}
            ORDER BY e.fecha_eliminacion DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const result = await query(queryText, params);

        const countQuery = `SELECT COUNT(*) as total FROM eliminaciones_usuarios e ${whereClause}`;
        const countResult = await query(countQuery, params);
        const total = countResult.recordset[0].total;

        res.json({
            success: true,
            eliminaciones: result.recordset,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error al obtener eliminaciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Crear nueva eliminación
router.post('/eliminaciones', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { usuario_eliminado, equipo_hostname, metodo_aplicado, observaciones } = req.body;
        const userId = req.user.id;
        const responsableNombre = `${req.user.nombre} ${req.user.apellido}`;

        // Validaciones básicas
        if (!usuario_eliminado || !equipo_hostname || !metodo_aplicado) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan campos obligatorios' 
            });
        }

        // Validar DNI (6-10 dígitos)
        if (!/^\d{6,10}$/.test(usuario_eliminado)) {
            return res.status(400).json({ 
                success: false, 
                message: 'El usuario eliminado debe tener entre 6 y 10 dígitos' 
            });
        }

        // Obtener fecha/hora de Lima
        function getLimaDate() {
            const now = new Date();
            const limaOffset = -5 * 60;
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const limaTime = new Date(utc + (limaOffset * 60000));
            
            const year = limaTime.getFullYear();
            const month = String(limaTime.getMonth() + 1).padStart(2, '0');
            const day = String(limaTime.getDate()).padStart(2, '0');
            const hours = String(limaTime.getHours()).padStart(2, '0');
            const minutes = String(limaTime.getMinutes()).padStart(2, '0');
            const seconds = String(limaTime.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        // Insertar eliminación
        await query(`
            INSERT INTO eliminaciones_usuarios 
            (fecha_eliminacion, usuario_eliminado, equipo_hostname, responsable_id, responsable_nombre, metodo_aplicado, observaciones)
            VALUES (@fecha, @usuario_eliminado, @equipo_hostname, @responsable_id, @responsable_nombre, @metodo_aplicado, @observaciones)
        `, {
            fecha: getLimaDate(),
            usuario_eliminado,
            equipo_hostname,
            responsable_id: userId,
            responsable_nombre: responsableNombre,
            metodo_aplicado,
            observaciones: observaciones || null
        });

        res.json({
            success: true,
            message: 'Eliminación registrada exitosamente'
        });

    } catch (error) {
        console.error('Error al registrar eliminación:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Exportar eliminaciones a Excel
router.get('/eliminaciones/export', authenticateToken, verificarTI, async (req, res) => {
    try {
        const { desde, hasta, usuario_eliminado, responsable, metodo } = req.query;
        
        let whereClause = 'WHERE 1=1';
        const params = {};

        if (desde) {
            whereClause += ' AND e.fecha_eliminacion >= @desde';
            params.desde = desde;
        }
        if (hasta) {
            whereClause += ' AND e.fecha_eliminacion <= @hasta';
            params.hasta = hasta;
        }
        if (usuario_eliminado) {
            whereClause += ' AND e.usuario_eliminado LIKE @usuario_eliminado';
            params.usuario_eliminado = `%${usuario_eliminado}%`;
        }
        if (responsable) {
            whereClause += ' AND e.responsable_nombre LIKE @responsable';
            params.responsable = `%${responsable}%`;
        }
        if (metodo) {
            whereClause += ' AND e.metodo_aplicado = @metodo';
            params.metodo = metodo;
        }

        // Si no hay filtros, exportar todo (sin paginación)
        const result = await query(`
            SELECT 
                e.id,
                e.fecha_eliminacion,
                e.usuario_eliminado,
                e.equipo_hostname,
                e.responsable_id,
                e.responsable_nombre,
                e.metodo_aplicado,
                e.observaciones
            FROM eliminaciones_usuarios e
            ${whereClause}
            ORDER BY e.fecha_eliminacion DESC
        `, params);

        const { exportEliminacionesToExcel } = require('../excelExport');
        await exportEliminacionesToExcel(result.recordset, res);

    } catch (error) {
        console.error('Error al exportar eliminaciones:', error);
        res.status(500).json({ message: 'Error interno al exportar eliminaciones' });
    }
});

module.exports = router;
