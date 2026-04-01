const { Pool } = require('pg');

let poolInstance = null;

async function getDB() {
    if (poolInstance) return poolInstance;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const connectionString = process.env.DATABASE_URL || 'postgresql://admin:SecurePass_WhatsApp_2026!@129.80.149.224:8080/whatsapp_warming';

            const pool = new Pool({
                connectionString,
                ssl: false, // Desabilitado caso o Oracle não force SSL (se precisar ligar: { rejectUnauthorized: false })
                min: 0,
                max: 10,
                connectionTimeoutMillis: 60000,
                idleTimeoutMillis: 60000,
            });

            // Força todas as conexões do pool a usarem o schema correto.
            // NOTE: This runs before the client is released to the pool,
            // so there is no risk of concurrent queries on the same client.
            pool.on('connect', (client) => {
                client.query('SET search_path TO quiz_system, public')
                    .catch(e => console.error('[DB] Schema set failed:', e.message));
            });

            // Test connection
            const client = await pool.connect();
            
            // Garante que o schema existe
            await client.query('CREATE SCHEMA IF NOT EXISTS quiz_system').catch(e => console.error('[DB] Create schema falhou:', e.message));

            console.log(`[DB] Connected to Oracle PostgreSQL Database`);
            client.release();

            await runMigrations(pool);

            // Map sqlite-style convenience methods
            pool.all = async (sql, params) => { const res = await pool.query(sql, params); return res.rows; };
            pool.get = async (sql, params) => { const res = await pool.query(sql, params); return res.rows[0]; };
            pool.run = async (sql, params) => { const res = await pool.query(sql, params); return { changes: res.rowCount }; };

            poolInstance = pool;
            return poolInstance;
        } catch (error) {
            console.error(`[DB] Attempt ${attempt}/3 failed: ${error.message} | code: ${error.code} | hint: ${error.hint}`);
            if (attempt < 3) {
                console.log(`[DB] Retrying in 5s...`);
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }

    console.error('[DB] All connection attempts failed. Running with empty DB fallback.');
    poolInstance = null; // permite nova tentativa na próxima requisição
    return {
        all: async () => [],
        get: async () => null,
        run: async () => ({ changes: 0 }),
        query: async () => ({ rows: [], rowCount: 0 })
    };
}

async function runMigrations(db) {
    console.log('[DB] Running migrations...');

    // Helper tolerante: loga o erro mas não trava o servidor
    const safe = async (sql) => {
        try {
            await db.query(sql);
        } catch(e) {
            console.warn('[DB] Migration skipped:', e.message?.substring(0, 120));
        }
    };

    // Tabela: Users
    await safe(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await safe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
    await safe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin'`);
    // Garante admin padrão (crypto nativo — sem bcryptjs)
    const crypto = require('crypto');
    const adminSalt = 'defaultsalt00000';
    const defHashBuf = await new Promise((res, rej) => crypto.scrypt('admin123', adminSalt, 64, (e, b) => e ? rej(e) : res(b)));
    const defHash = adminSalt + ':' + defHashBuf.toString('hex');
    
    // Se existir usuário com id=1 mas sem username, atualiza ele. Senão, insere.
    try {
        const hasAdmin = await db.query(`SELECT id FROM users WHERE username = 'admin'`);
        if (!hasAdmin.rows || hasAdmin.rows.length === 0) {
            await db.query(
                `INSERT INTO users (id, username, email, password_hash, role) VALUES (1, 'admin', 'admin@system.local', $1, 'admin') 
                 ON CONFLICT (id) DO UPDATE SET username = 'admin', password_hash = $1, role = 'admin'`,
                [defHash]
            );
        }
    } catch(e) { console.warn('[DB] Admin seed skipped:', e.message?.substring(0, 80)); }

    // Tabela: Domains
    await safe(`
        CREATE TABLE IF NOT EXISTS domains (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            hostname TEXT UNIQUE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Quizzes
    await safe(`
        CREATE TABLE IF NOT EXISTS quizzes (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            slug TEXT UNIQUE,
            config_json TEXT NOT NULL DEFAULT '{}',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await safe(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await safe(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT`);

    // Tabela: Leads/Visitors Tracker
    await safe(`
        CREATE TABLE IF NOT EXISTS quiz_events (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            visitor_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            step_id TEXT,
            answer_value TEXT,
            time_spent_seconds INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await safe(`ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0`);
    await safe(`CREATE INDEX IF NOT EXISTS idx_quiz_events_quiz_id ON quiz_events(quiz_id)`);
    await safe(`CREATE INDEX IF NOT EXISTS idx_quiz_events_event_type ON quiz_events(event_type)`);
    await safe(`CREATE INDEX IF NOT EXISTS idx_quiz_events_visitor_id ON quiz_events(visitor_id)`);

    // Tabela: Team Tasks
    await safe(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'todo',
            priority TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Round Robin A/B
    await safe(`
        CREATE TABLE IF NOT EXISTS round_robin (
            id SERIAL PRIMARY KEY,
            quiz_ids TEXT NOT NULL DEFAULT '[]',
            current_index INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await safe(`INSERT INTO round_robin (quiz_ids) SELECT '[]' WHERE NOT EXISTS (SELECT 1 FROM round_robin)`);

    // Tabela: Integrations
    await safe(`
        CREATE TABLE IF NOT EXISTS integrations (
            id SERIAL PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Media Visitor Progress
    await safe(`
        CREATE TABLE IF NOT EXISTS media_visitor_progress (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            step_id TEXT,
            block_id TEXT NOT NULL,
            visitor_id TEXT NOT NULL,
            media_type TEXT,
            watched_seconds TEXT NOT NULL DEFAULT '[]',
            duration INTEGER DEFAULT 0,
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(block_id, visitor_id)
        );
    `);

    // Tabela: Media Retention
    await safe(`
        CREATE TABLE IF NOT EXISTS media_retention (
            quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            block_id TEXT NOT NULL,
            second_mark INTEGER NOT NULL,
            unique_views INTEGER DEFAULT 0,
            PRIMARY KEY (block_id, second_mark)
        );
    `);

    // Tabela: Lead Metadata
    await safe(`
        CREATE TABLE IF NOT EXISTS lead_metadata (
            visitor_id TEXT PRIMARY KEY,
            quiz_id INTEGER,
            device_type TEXT,
            browser TEXT,
            os TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            source TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            referrer TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await safe(`CREATE INDEX IF NOT EXISTS idx_lead_metadata_quiz ON lead_metadata(quiz_id)`);

    console.log('[DB] Migrations executed successfully.');
}

module.exports = { getDB };
