const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// ✅ Ruta: obtener TODAS las solicitudes (solo formacion)
router.get('/solicitudes', authenticateToken, checkRole(['formacion']), async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM solicitudes_instalacion
            ORDER BY fecha_creacion DESC
        `);
        res.json({ success: true, solicitudes: result.recordset });
    } catch (error) {
        console.error('❌ Error al obtener solicitudes:', error);
        res.status(500).json({ message: 'Error al obtener solicitudes' });
    }
});

// ✅ Ruta: obtener solicitudes propias (cualquier rol autenticado)
router.get('/mis-solicitudes', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const result = await query(`
            SELECT s.*, u.nombre + ' ' + u.apellido as revisando_nombre
            FROM solicitudes_instalacion s
            LEFT JOIN usuarios u ON s.revisando_por = u.id
            WHERE s.creado_por = @id
            ORDER BY s.fecha_creacion DESC
        `, { id: user.id });

        res.json({ success: true, solicitudes: result.recordset });
    } catch (error) {
        console.error('❌ Error al obtener mis solicitudes:', error);
        res.status(500).json({ message: 'Error al obtener tus solicitudes' });
    }
});

// ✅ Ruta: crear nueva solicitud (cualquier autenticado)
router.post('/solicitudes', authenticateToken, async (req, res) => {
    try {
        const {
            dni_asesor, nombre_asesor, campaña, anydesk, correo_usuario
        } = req.body;

        const creado_por = req.user?.id;

        if (!dni_asesor || !nombre_asesor || !campaña || !correo_usuario || !creado_por) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        await query(`
            INSERT INTO solicitudes_instalacion (
                dni_asesor, nombre_asesor, campaña, anydesk, correo_usuario,
                estado, creado_por, fecha_creacion
            ) VALUES (
                @dni_asesor, @nombre_asesor, @campaña, @anydesk, @correo_usuario,
                'pendiente', @creado_por, GETDATE()
            )
        `, { dni_asesor, nombre_asesor, campaña, anydesk, correo_usuario, creado_por });

        res.json({ success: true, message: 'Solicitud registrada correctamente' });
    } catch (error) {
        console.error('❌ Error al registrar solicitud:', error);
        res.status(500).json({ message: 'Error al registrar solicitud' });
    }
});

// ✅ Ruta: actualizar estado (solo formacion)
router.put('/solicitudes/:id', authenticateToken, checkRole(['formacion']), async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, comentario } = req.body;

        await query(`
            UPDATE solicitudes_instalacion
            SET estado = @estado,
                comentario = @comentario,
                fecha_revision = GETDATE()
            WHERE id = @id
        `, { id, estado, comentario });

        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error('❌ Error al actualizar solicitud:', error);
        res.status(500).json({ message: 'Error al actualizar solicitud' });
    }
});

// ✅ Ruta: historial por solicitud (igual que TI, para formación)
router.get('/solicitudes/:id/historial', authenticateToken, checkRole(['formacion']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT h.*, u.nombre + ' ' + u.apellido as usuario_nombre, u.rol, u.dni
            FROM historial_solicitudes h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.solicitud_id = @solicitud_id
            ORDER BY h.fecha_accion DESC
        `, { solicitud_id: parseInt(id) });
        res.json({ success: true, historial: result.recordset });
    } catch (error) {
        console.error('❌ Error al obtener historial:', error);
        res.status(500).json({ message: 'Error al obtener historial' });
    }
});

module.exports = router;
