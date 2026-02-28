import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_initial.sql'), 'utf-8');

pool.query(sql)
  .then(() => { console.log('Миграция выполнена'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
