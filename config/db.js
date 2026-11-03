const dotenv = require('dotenv');
dotenv.config();

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();

let dbClient = null;
let activeDriver = DB_TYPE;

if (DB_TYPE === 'mysql') {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_NAME || 'spendwise_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
  });

  dbClient = {
    driver: 'mysql',
    rawPool: pool,
    async query(sql, params = []) {
      // Convert $1, $2... to ? if present
      const convertedSql = sql.replace(/\$\d+/g, '?');
      const [rows] = await pool.query(convertedSql, params);
      return rows;
    },
    async one(sql, params = []) {
      const rows = await this.query(sql, params);
      if (!rows || rows.length === 0) throw new Error('No data returned from the query.');
      return rows[0];
    },
    async oneOrNone(sql, params = []) {
      const rows = await this.query(sql, params);
      return rows && rows.length > 0 ? rows[0] : null;
    },
    async any(sql, params = []) {
      return await this.query(sql, params);
    },
    async none(sql, params = []) {
      await this.query(sql, params);
      return null;
    }
  };
} else {
  // PostgreSQL (default and active on local environment)
  const pgp = require('pg-promise')({
    capSQL: true,
    error(err, e) {
      if (e.cn) {
        console.error('PostgreSQL Database connection error:', err.message || err);
      }
    }
  });

  function buildPostgresConfig() {
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl && process.env.DB_HOST && (process.env.DB_HOST.startsWith('postgres://') || process.env.DB_HOST.startsWith('postgresql://'))) {
      dbUrl = process.env.DB_HOST;
    }

    const isNeon = Boolean(
      (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) ||
      (dbUrl && dbUrl.includes('neon.tech'))
    );

    const isSsl = process.env.DB_SSL === 'true' ||
      process.env.DB_SSL === '1' ||
      isNeon ||
      Boolean(process.env.RENDER) ||
      (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) ||
      (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST));

    const sslConfig = isSsl ? { rejectUnauthorized: false } : false;

    if (dbUrl) {
      try {
        const u = new URL(dbUrl);
        let database = u.pathname.replace(/^\//, '');
        if (!database) database = isNeon ? 'neondb' : 'spendwise_db';
        return {
          host: u.hostname,
          port: parseInt(u.port || '5432', 10),
          database: database,
          user: decodeURIComponent(u.username || 'postgres'),
          password: decodeURIComponent(u.password || ''),
          ssl: sslConfig,
          connectionTimeoutMillis: 15000,
          query_timeout: 30000,
          max: 20
        };
      } catch (err) {
        const cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]+/g, '');
        return {
          connectionString: cleanUrl,
          ssl: sslConfig,
          connectionTimeoutMillis: 15000,
          query_timeout: 30000,
          max: 20
        };
      }
    }

    const requestedDbName = process.env.DB_NAME;
    const resolvedDbName = (isNeon && (!requestedDbName || requestedDbName === 'spendwise_db'))
      ? 'neondb'
      : (requestedDbName || 'spendwise_db');

    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: resolvedDbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'dekitshomo',
      ssl: sslConfig,
      connectionTimeoutMillis: 15000,
      query_timeout: 30000,
      max: 20
    };
  }

  const connectionConfig = buildPostgresConfig();
  const pgInstance = pgp(connectionConfig);

  dbClient = {
    driver: 'postgres',
    rawPool: pgInstance,
    pgp,
    async query(sql, params = []) {
      // If query has '?' placeholders, convert to $1, $2...
      let pIdx = 1;
      const convertedSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      return await pgInstance.query(convertedSql, params);
    },
    async one(sql, params = []) {
      let pIdx = 1;
      const convertedSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      return await pgInstance.one(convertedSql, params);
    },
    async oneOrNone(sql, params = []) {
      let pIdx = 1;
      const convertedSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      return await pgInstance.oneOrNone(convertedSql, params);
    },
    async any(sql, params = []) {
      let pIdx = 1;
      const convertedSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      return await pgInstance.any(convertedSql, params);
    },
    async none(sql, params = []) {
      let pIdx = 1;
      const convertedSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      return await pgInstance.none(convertedSql, params);
    }
  };
}

module.exports = {
  db: dbClient,
  activeDriver
};
