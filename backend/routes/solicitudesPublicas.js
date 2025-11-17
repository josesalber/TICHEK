const express = require('express');
const { query } = require('../db');
const router = express.Router();

// Obtener campañas disponibles (público)
router.get('/campanias', async (req, res) => {
    try {
        console.log('🔍 Obteniendo campañas públicas...');
        const result = await query(`
            SELECT DISTINCT campaña 
            FROM solicitudes_instalacion 
            WHERE campaña IS NOT NULL AND campaña != '' AND campaña != 'null'
            ORDER BY campaña ASC
        `);
        
        console.log('📊 Campañas encontradas:', result.recordset.length);
        const campañas = result.recordset.map(row => row.campaña);
        res.json({ success: true, campañas });
    } catch (error) {
        console.error('❌ Error al obtener campañas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener campañas', error: error.message });
    }
});

// Obtener formadores disponibles (público)
router.get('/formadores', async (req, res) => {
    try {
        console.log('👥 Obteniendo formadores públicos...');
        const result = await query(`
            SELECT DISTINCT 
                u.id,
                u.nombre + ' ' + u.apellido as nombre
            FROM solicitudes_instalacion s
            INNER JOIN usuarios u ON s.creado_por = u.id
            WHERE u.nombre IS NOT NULL AND u.apellido IS NOT NULL 
                AND u.rol = 'formacion'
            ORDER BY u.nombre ASC
        `);
        
        console.log('👨‍🏫 Formadores encontrados:', result.recordset.length);
        res.json({ success: true, formadores: result.recordset });
    } catch (error) {
        console.error('❌ Error al obtener formadores:', error);
        res.status(500).json({ success: false, message: 'Error al obtener formadores', error: error.message });
    }
});

// Obtener solicitudes públicas con filtros
router.get('/', async (req, res) => {
    try {
        const { campanias, formadores, estado } = req.query;
        
        let whereClause = 'WHERE 1=1';
        const params = {};

        // Filtro por campañas (multiselect)
        if (campanias) {
            const campañasList = Array.isArray(campanias) ? campanias : [campanias];
            if (campañasList.length > 0) {
                const placeholders = campañasList.map((_, index) => `@campaña${index}`).join(', ');
                whereClause += ` AND s.campaña IN (${placeholders})`;
                campañasList.forEach((campaña, index) => {
                    params[`campaña${index}`] = campaña;
                });
            }
        }

        // Filtro por formadores (multiselect)
        if (formadores) {
            const formadoresList = Array.isArray(formadores) ? formadores : [formadores];
            if (formadoresList.length > 0) {
                const placeholders = formadoresList.map((_, index) => `@formador${index}`).join(', ');
                whereClause += ` AND (u1.nombre + ' ' + u1.apellido) IN (${placeholders})`;
                formadoresList.forEach((formador, index) => {
                    params[`formador${index}`] = formador;
                });
            }
        }

        // Filtro por estado
        if (estado && ['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
            whereClause += ' AND s.estado = @estado';
            params.estado = estado;
        }

        const result = await query(`
            SELECT 
                s.id,
                s.dni_asesor,
                s.nombre_asesor,
                s.campaña,
                s.estado,
                s.fecha_creacion,
                s.fecha_revision,
                u1.nombre + ' ' + u1.apellido as creador_nombre
            FROM solicitudes_instalacion s
            LEFT JOIN usuarios u1 ON s.creado_por = u1.id
            ${whereClause}
            ORDER BY s.fecha_creacion DESC
        `, params);

        res.json({
            success: true,
            solicitudes: result.recordset
        });

    } catch (error) {
        console.error('Error al obtener solicitudes públicas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
