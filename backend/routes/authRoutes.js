const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_seguro';

// ✅ LOGIN PARA FORMACIÓN Y TI
router.post('/login', async (req, res) => {
    try {
        const { dni, contraseña } = req.body;

        // Validaciones básicas
        if (!dni || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'DNI y contraseña son requeridos'
            });
        }

        // Validar formato DNI (8 dígitos)
        // Validar formato DNI (6 a 8 dígitos)
        if (!/^\d{6,8}$/.test(dni)) {
            return res.status(400).json({
                success: false,
                message: 'DNI debe tener entre 6 y 8 dígitos'
            });
        }

        // Buscar usuario en la base de datos
        const result = await query(`
            SELECT id, dni, nombre, apellido, contraseña, rol, activo 
            FROM usuarios 
            WHERE dni = @dni
        `, { dni });

        if (!result || !result.recordset || result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'DNI o contraseña incorrectos'
            });
        }

        const usuario = result.recordset[0];

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(403).json({
                success: false,
                message: 'Usuario inactivo. Contacta al administrador.'
            });
        }

        // Validar roles permitidos (solo formacion y ti)
        if (!['formacion', 'ti'].includes(usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: 'Rol de usuario no válido para este sistema'
            });
        }

        // Verificar contraseña
        const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);

        if (!contraseñaValida) {
            return res.status(401).json({
                success: false,
                message: 'DNI o contraseña incorrectos'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                dni: usuario.dni,
                rol: usuario.rol,
                nombre: usuario.nombre,
                apellido: usuario.apellido
            },
            JWT_SECRET,
            { expiresIn: '8h' } // Token expira en 8 horas
        );

        // Respuesta exitosa (sin enviar contraseña)
        res.json({
            success: true,
            token,
            usuario: {
                id: usuario.id,
                dni: usuario.dni,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                rol: usuario.rol
            },
            message: 'Inicio de sesión exitoso'
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ✅ REGISTRO INICIAL (SOLO PARA PRIMER USUARIO ADMIN TI)
router.post('/registro-inicial', async (req, res) => {
    try {
        const { dni, nombre, apellido, contraseña } = req.body;

        // Validaciones básicas
        if (!dni || !nombre || !apellido || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        // Validar DNI
        if (!/^\d{6,8}$/.test(dni)) {
            return res.status(400).json({
                success: false,
                message: 'DNI debe tener entre 6 y 8 dígitos'
            });
        }

        // Validar contraseña
        if (contraseña.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar si ya hay usuarios registrados - CON VALIDACIÓN MEJORADA
        console.log('📝 Verificando usuarios existentes...');
        const usuariosResult = await query('SELECT COUNT(*) as total FROM usuarios');

        // Verificar que la consulta retorne datos válidos
        if (!usuariosResult || !usuariosResult.recordset || !usuariosResult.recordset[0]) {
            console.error('❌ Error: La consulta no retornó datos válidos');
            return res.status(500).json({
                success: false,
                message: 'Error al verificar usuarios existentes'
            });
        }

        const totalUsuarios = usuariosResult.recordset[0].total;
        console.log(`✅ Total de usuarios encontrados: ${totalUsuarios}`);

        if (totalUsuarios > 0) {
            return res.status(403).json({
                success: false,
                message: 'Ya hay usuarios registrados en el sistema'
            });
        }

        // Verificar si el DNI ya existe
        const dniExiste = await query('SELECT id FROM usuarios WHERE dni = @dni', { dni });
        if (dniExiste && dniExiste.recordset && dniExiste.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un usuario con este DNI'
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 12);

        // Crear usuario inicial (con rol TI)
        const resultado = await query(`
            INSERT INTO usuarios 
                (dni, nombre, apellido, contraseña, rol, activo)
            OUTPUT INSERTED.id
            VALUES (@dni, @nombre, @apellido, @contraseña, @rol, @activo)
        `, {
            dni: dni.trim(),
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            contraseña: hashedPassword,
            rol: 'ti',
            activo: 1
        });

        if (!resultado || !resultado.recordset || !resultado.recordset[0]) {
            throw new Error('No se pudo crear el usuario');
        }

        const usuarioId = resultado.recordset[0].id;

        res.status(201).json({
            success: true,
            message: 'Usuario administrador TI creado exitosamente',
            usuario: {
                id: usuarioId,
                dni,
                nombre,
                apellido,
                rol: 'ti'
            }
        });

    } catch (error) {
        console.error('❌ Error en registro inicial:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ✅ VERIFICAR SI EL SISTEMA ESTÁ LISTO PARA REGISTRO INICIAL
router.get('/verificar-registro-inicial', async (req, res) => {
    try {
        console.log('📝 Ejecutando query: SELECT COUNT(*) as total FROM usuarios...');
        const result = await query('SELECT COUNT(*) as total FROM usuarios');

        // Validar que la consulta retorne datos válidos
        if (!result) {
            console.error('❌ Error: result es null o undefined');
            throw new Error('La consulta no retornó resultados');
        }

        if (!result.recordset) {
            console.error('❌ Error: result.recordset es undefined');
            console.log('📋 Estructura de result:', JSON.stringify(result, null, 2));
            throw new Error('La consulta no retornó recordset');
        }

        if (!result.recordset[0]) {
            console.error('❌ Error: result.recordset[0] es undefined');
            console.log('📋 recordset length:', result.recordset.length);
            throw new Error('La consulta no retornó filas');
        }

        const totalUsuarios = result.recordset[0].total;
        console.log(`✅ Total usuarios: ${totalUsuarios}`);

        const hayUsuarios = totalUsuarios > 0;

        res.json({
            success: true,
            disponible: !hayUsuarios,
            total: totalUsuarios,
            mensaje: !hayUsuarios
                ? 'Puedes crear el usuario administrador TI inicial'
                : 'Sistema ya tiene usuarios registrados'
        });

    } catch (error) {
        console.error('❌ Error al verificar registro inicial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar disponibilidad de registro',
            disponible: false,
            error: error.message
        });
    }
});

// ✅ ENDPOINT PARA DEBUG DE CONEXIÓN DB
router.get('/debug-db', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');
        const result = await query('SELECT @@VERSION as version, GETDATE() as fecha');

        console.log('📋 Raw result:', JSON.stringify(result, null, 2));

        res.json({
            success: true,
            message: 'Conexión DB exitosa',
            result: result,
            hasRecordset: !!result.recordset,
            recordsetLength: result.recordset ? result.recordset.length : 0
        });
    } catch (error) {
        console.error('❌ Error en debug-db:', error);
        res.status(500).json({
            success: false,
            message: 'Error en conexión DB',
            error: error.message
        });
    }
});

module.exports = router;