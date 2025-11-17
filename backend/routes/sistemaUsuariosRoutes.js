const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../db');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// ✅ CREAR NUEVO USUARIO (SOLO TI)
router.post('/usuarios', authenticateToken, checkRole(['ti']), async (req, res) => {
    try {
        const { dni, nombre, apellido, contraseña, rol } = req.body;

        // Validaciones básicas
        if (!dni || !nombre || !apellido || !contraseña || !rol) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        // Validar DNI formato (6-8 dígitos)
        if (!/^\d{6,8}$/.test(dni)) {
            return res.status(400).json({
                success: false,
                message: 'DNI debe tener entre 6 y 8 dígitos'
            });
        }

        // Validar rol (solo formacion o ti)
        if (!['formacion', 'ti'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol debe ser "formacion" o "ti"'
            });
        }

        // Verificar DNI único
        const dniExiste = await query('SELECT id FROM usuarios WHERE dni = @dni', { dni });
        if (dniExiste.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un usuario con este DNI'
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Crear usuario
        const resultado = await query(`
            INSERT INTO usuarios 
                (dni, nombre, apellido, contraseña, rol)
            OUTPUT INSERTED.id
            VALUES (@dni, @nombre, @apellido, @contraseña, @rol)
        `, {
            dni,
            nombre,
            apellido,
            contraseña: hashedPassword,
            rol
        });

        const usuarioId = resultado.recordset[0].id;

        console.log(`✅ Usuario creado: ${nombre} ${apellido} (${rol}) - ID: ${usuarioId}`);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            usuario: {
                id: usuarioId,
                dni,
                nombre,
                apellido,
                rol
            }
        });

    } catch (error) {
        console.error('❌ Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario',
            error: error.message
        });
    }
});

// ✅ OBTENER TODOS LOS USUARIOS (SOLO TI PUEDE VER)
router.get('/usuarios', authenticateToken, checkRole(['ti']), async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id, dni, nombre, apellido, rol,
                activo
            FROM usuarios 
            ORDER BY id DESC
        `);

        console.log(`✅ ${result.recordset.length} usuarios obtenidos`);
        res.json({
            success: true,
            usuarios: result.recordset
        });
    } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
});

// ✅ ACTUALIZAR USUARIO (SOLO TI PUEDE ACTUALIZAR)
router.put('/usuarios/:id', authenticateToken, checkRole(['ti']), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, contraseña, rol, activo } = req.body;

        console.log('🔧 Recibiendo actualización para usuario ID:', id);
        console.log('📋 Datos recibidos:', { nombre, apellido, rol, activo });

        // Validaciones básicas
        if (!id || !nombre || !apellido || !rol) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios (incluyendo ID)'
            });
        }

        // Verificar que el usuario existe
        const usuarioExiste = await query('SELECT id FROM usuarios WHERE id = @id', { id });
        if (usuarioExiste.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Validar rol
        if (!['formacion', 'ti'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol debe ser "formacion" o "ti"'
            });
        }

        // Construir query de actualización
        let updateQuery = `
            UPDATE usuarios 
            SET nombre = @nombre, 
                apellido = @apellido, 
                rol = @rol, 
                activo = @activo
        `;
        let params = {
            id,
            nombre,
            apellido,
            rol,
            activo: activo !== undefined ? activo : true
        };

        // Si se proporciona nueva contraseña, incluirla
        if (contraseña && contraseña.trim() !== '') {
            const hashedPassword = await bcrypt.hash(contraseña, 10);
            updateQuery += ', contraseña = @contraseña';
            params.contraseña = hashedPassword;
        }

        updateQuery += ' WHERE id = @id';

        console.log('🔄 Ejecutando query:', updateQuery);
        await query(updateQuery, params);

        console.log(`✅ Usuario ${id} actualizado: ${nombre} ${apellido} (${rol})`);
        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario'
        });
    }
});

// ✅ CAMBIAR ESTADO DE USUARIO (ACTIVAR/DESACTIVAR)
router.put('/usuarios/:id/estado', authenticateToken, checkRole(['ti']), async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (!id || typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'ID y estado son requeridos'
            });
        }

        await query(`
            UPDATE usuarios 
            SET activo = @activo
            WHERE id = @id
        `, { activo, id });

        console.log(`✅ Usuario ${id} ${activo ? 'activado' : 'desactivado'}`);
        res.json({
            success: true,
            message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`
        });

    } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del usuario'
        });
    }
});

module.exports = router;