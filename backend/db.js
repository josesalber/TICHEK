const sql = require('mssql');
require('dotenv').config();

// Cache para conversión de queries
const conversionCache = new Map();

// Configuración optimizada para SQL Server
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10) || 3001,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        abortTransactionOnError: true
    },
    pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 10000,
        createTimeoutMillis: 10000
    },
    requestTimeout: 15000,
    connectionTimeout: 8000
};

// Pool principal de conexiones
let pool;
let isConnecting = false;

/**
 * Obtiene una conexión del pool con manejo de reconexión
 */
const getConnection = async () => {
    try {
        if (pool && pool.connected) {
            return pool;
        }

        if (isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return getConnection();
        }

        isConnecting = true;
        console.log('🔗 Estableciendo conexión con SQL Server...');

        pool = new sql.ConnectionPool(config);
        await pool.connect();

        pool.on('error', err => {
            console.error('❌ Error en conexión SQL:', err);
            pool = null;
        });

        console.log('✅ Conexión a SQL Server establecida');
        return pool;
    } catch (error) {
        console.error('❌ Error al conectar a SQL Server:', error.message);
        throw error;
    } finally {
        isConnecting = false;
    }
};

/**
 * Ejecuta una consulta con parámetros usando sintaxis @parametro
 */
const query = async (queryText, params = {}) => {
    let connection;
    try {
        connection = await getConnection();
        const request = new sql.Request(connection);

        // Asignar timeout según tipo de query
        request.timeout = getQueryTimeout(queryText);

        // Asignar parámetros usando las claves del objeto
        Object.keys(params).forEach(key => {
            const value = params[key];
            request.input(key, getSqlType(value), value);
        });

        // Log en desarrollo
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📝 Ejecutando query: ${queryText.substring(0, 120)}...`);
            if (Object.keys(params).length > 0) {
                console.log(`📋 Parámetros:`, params);
            }
        }

        // IMPORTANTE: Retornar el objeto completo result, no solo recordset
        const result = await request.query(queryText);
        return result; // ← Aquí estaba el problema!

    } catch (error) {
        console.error(`❌ Error en query SQL: ${error.message}`);
        console.error(`📌 Query: ${queryText.substring(0, 150)}`);
        console.error(`📌 Params:`, params);
        throw error;
    }
};

/**
 * Ejecuta una consulta usando sintaxis con placeholders ? (para compatibilidad)
 */
const queryWithPlaceholders = async (queryText, params = []) => {
    try {
        const connection = await getConnection();
        const request = new sql.Request(connection);

        // Asignar timeout según tipo de query
        request.timeout = getQueryTimeout(queryText);

        // Convertir query si es necesario
        const finalQuery = convertToSQLServer(queryText, params);

        // Asignar parámetros
        params.forEach((param, index) => {
            request.input(`param${index}`, getSqlType(param), param);
        });

        // Log en desarrollo
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📝 Ejecutando query: ${finalQuery.substring(0, 120)}...`);
        }

        const result = await request.query(finalQuery);
        return result; // Retornar objeto completo

    } catch (error) {
        console.error(`❌ Error en query SQL: ${error.message}`);
        console.error(`📌 Query: ${queryText.substring(0, 150)}`);
        throw error;
    }
};

/**
 * Determina el tipo SQL adecuado para un parámetro
 */
const getSqlType = (value) => {
    if (value === null || value === undefined) return sql.NVarChar;
    if (typeof value === 'number') {
        return Number.isInteger(value) ? sql.Int : sql.Float;
    }
    if (value instanceof Date) return sql.DateTime;
    if (typeof value === 'boolean') return sql.Bit;
    if (Buffer.isBuffer(value)) return sql.VarBinary;
    return sql.NVarChar;
};

/**
 * Asigna timeout según tipo de query
 */
const getQueryTimeout = (queryText) => {
    const q = queryText.toUpperCase();
    if (q.includes('SELECT COUNT')) return 30000;
    if (q.includes('INSERT') || q.includes('UPDATE') || q.includes('DELETE')) return 45000;
    return 20000;
};

/**
 * Convierte sintaxis MySQL a SQL Server cuando sea necesario
 */
const convertToSQLServer = (queryText, params) => {
    const cacheKey = queryText + params.length;
    if (conversionCache.has(cacheKey)) {
        return conversionCache.get(cacheKey);
    }

    let converted = queryText
        .replace(/`/g, '')  // Elimina backticks
        .replace(/LIMIT (\d+)/gi, 'TOP $1')
        .replace(/NOW\(\)/gi, 'GETDATE()')
        .replace(/TRUE/gi, '1')
        .replace(/FALSE/gi, '0');

    // Reemplazar placeholders ? por @paramN
    let paramIndex = 0;
    converted = converted.replace(/\?/g, () => `@param${paramIndex++}`);

    // Cachear conversión
    if (conversionCache.size < 100) {
        conversionCache.set(cacheKey, converted);
    }

    return converted;
};

/**
 * Verifica el estado de la conexión
 */
const checkHealth = async () => {
    try {
        const result = await query('SELECT 1 AS status');
        return result && result.recordset && result.recordset.length > 0;
    } catch (error) {
        console.error('❌ Health check fallido:', error);
        return false;
    }
};

/**
 * Cierra todas las conexiones
 */
const closeConnections = async () => {
    try {
        if (pool) {
            await pool.close();
            console.log('✅ Conexiones cerradas correctamente');
        }
    } catch (error) {
        console.error('❌ Error al cerrar conexiones:', error);
    }
};

// Manejo de cierre de la aplicación
process.on('SIGINT', async () => {
    await closeConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnections();
    process.exit(0);
});

// Exportación de funciones
module.exports = {
    sql,
    query,
    queryWithPlaceholders,
    getConnection,
    checkHealth,
    closeConnections
};