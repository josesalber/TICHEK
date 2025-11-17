const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_jwt_2024';

// ✅ FUNCIÓN PARA GENERAR TOKEN CON DURACIÓN CONFIGURADA
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            usuario: user.nombre_usuario || user.dni,
            rol: user.rol
        },
        JWT_SECRET,
        {
            expiresIn: '8h'
        }
    );
};

// ✅ MIDDLEWARE DE AUTENTICACIÓN
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido',
            code: 'NO_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(403).json({
                success: false,
                message: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }

        // ✅ YA NO se bloquea por rol globalmente
        req.user = user;
        next();
    });
};

// ✅ MIDDLEWARE para validar roles permitidos por ruta
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.rol;

        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            console.log(`❌ Acceso denegado. Rol ${userRole} no está en [${allowedRoles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Rol insuficiente.',
                code: 'INSUFFICIENT_ROLE'
            });
        }
    };
};

// ✅ FUNCIONES UTILITARIAS
const isTokenExpired = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return true;
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
};

const getTokenTimeRemaining = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return 0;
        const currentTime = Math.floor(Date.now() / 1000);
        return Math.max(0, decoded.exp - currentTime);
    } catch (error) {
        return 0;
    }
};

module.exports = {
    authenticateToken,
    checkRole,
    generateToken,
    isTokenExpired,
    getTokenTimeRemaining
};
