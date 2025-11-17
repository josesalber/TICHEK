const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

// ✅ OBTENER PERFIL DEL USUARIO LOGEADO
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Obteniendo perfil del usuario ID:', req.user.id);

        const result = await query(`
            SELECT 
                id, dni, nombre, apellido, rol, activo
            FROM usuarios 
            WHERE id = @id
        `, { id: req.user.id });

        if (result.recordset.length === 0) {
            console.log('❌ Usuario no encontrado ID:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuario = result.recordset[0];
        console.log('✅ Perfil obtenido para:', usuario.nombre, usuario.apellido);

        // Verificar que el usuario esté activo
        if (!usuario.activo) {
            return res.status(403).json({
                success: false,
                message: 'Usuario inactivo. Contacta al administrador TI.'
            });
        }

        // Respuesta con datos básicos del perfil
        res.json({
            success: true,
            usuario: {
                id: usuario.id,
                dni: usuario.dni,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                rol: usuario.rol,
                activo: usuario.activo
                // creado_en: usuario.creado_en // <-- eliminado porque no existe la columna
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil de usuario',
            error: error.message
        });
    }
});

// ✅ ACTUALIZAR CONTRASEÑA (PARA EL USUARIO LOGEADO)
router.put('/actualizar-contrasena', authenticateToken, async (req, res) => {
    try {
        const { contraseñaActual, nuevaContraseña } = req.body;
        const userId = req.user.id;

        // Validaciones básicas
        if (!contraseñaActual || !nuevaContraseña) {
            return res.status(400).json({
                success: false,
                message: 'Ambas contraseñas son requeridas'
            });
        }

        if (nuevaContraseña.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Obtener usuario actual
        const result = await query(`
            SELECT contraseña FROM usuarios WHERE id = @id
        `, { id: userId });

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual
        const contraseñaValida = await bcrypt.compare(
            contraseñaActual,
            result.recordset[0].contraseña
        );

        if (!contraseñaValida) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);

        // Actualizar contraseña
        await query(`
            UPDATE usuarios 
            SET contraseña = @contraseña, 
                actualizado_en = GETDATE()
            WHERE id = @id
        `, {
            contraseña: hashedPassword,
            id: userId
        });

        console.log(`✅ Contraseña actualizada para usuario ID: ${userId}`);
        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al actualizar contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar contraseña',
            error: error.message
        });
    }
});

module.exports = router;