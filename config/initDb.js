const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();

async function initDb() {
  console.log(`[SpendWise] Initializing database using driver: ${DB_TYPE.toUpperCase()}...`);

  if (DB_TYPE === 'mysql') {
    const mysql = require('mysql2/promise');
    try {
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASS || ''
      });

      const dbName = process.env.MYSQL_NAME || 'spendwise_db';
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await conn.changeUser({ database: dbName });

      const schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema_mysql.sql'), 'utf-8');
      const queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

      for (const query of queries) {
        await conn.query(query);
      }
      await conn.end();
      console.log(`[SpendWise] MySQL database '${dbName}' and tables initialized successfully!`);
    } catch (err) {
      console.error('[SpendWise] MySQL init error:', err.message);
      throw err;
    }
  } else {
    // PostgreSQL
    const { Client } = require('pg');

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

    // 1. Check/create database only on local machine (cloud databases like Neon pre-create the DB)
    if (!dbUrl && !isNeon) {
      const dbName = process.env.DB_NAME || 'spendwise_db';
      const adminClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'dekitshomo',
        database: 'postgres',
        ssl: sslConfig
      });
      try {
        await adminClient.connect();
        const checkRes = await adminClient.query(
          'SELECT 1 FROM pg_database WHERE datname = $1',
          [dbName]
        );
        if (checkRes.rowCount === 0) {
          await adminClient.query(`CREATE DATABASE "${dbName}"`);
          console.log(`[SpendWise] PostgreSQL database '${dbName}' created.`);
        }
      } catch (err) {
        console.warn('[SpendWise] Note during local DB check:', err.message);
      } finally {
        await adminClient.end().catch(() => {});
      }
    }

    // 2. Connect to target database and run schema
    let targetClient;
    let targetName = 'database';
    if (dbUrl) {
      try {
        const u = new URL(dbUrl);
        let database = u.pathname.replace(/^\//, '').split('?')[0].split('&')[0];
        if (!database || (isNeon && database === 'spendwise_db')) database = 'neondb';
        targetClient = new Client({
          host: u.hostname,
          port: parseInt(u.port || '5432', 10),
          database: database,
          user: decodeURIComponent(u.username || 'postgres'),
          password: decodeURIComponent(u.password || ''),
          ssl: sslConfig
        });
        targetName = `Neon / Cloud PostgreSQL (${database})`;
      } catch (err) {
        const cleanUrl = dbUrl.split('?')[0];
        targetClient = new Client({
          connectionString: cleanUrl,
          ssl: sslConfig
        });
        targetName = 'Cloud PostgreSQL';
      }
    } else {
      const dbName = (isNeon && (!process.env.DB_NAME || process.env.DB_NAME === 'spendwise_db')) ? 'neondb' : (process.env.DB_NAME || 'spendwise_db');
      targetClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'dekitshomo',
        database: dbName,
        ssl: sslConfig
      });
      targetName = dbName;
    }

    try {
      await targetClient.connect();
      const schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf-8');
      await targetClient.query(schemaSql);
      console.log(`[SpendWise] PostgreSQL tables and default categories initialized successfully in '${targetName}'!`);
    } catch (err) {
      console.error('[SpendWise] Schema migration error:', err.message);
      throw err;
    } finally {
      await targetClient.end().catch(() => {});
    }
  }
}

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initDb };
