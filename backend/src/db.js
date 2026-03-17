const { Pool } = require('pg');

let poolInstance = null;

async function getDB() {
    if (poolInstance) return poolInstance;

    const dbPassword = process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '#Nk552446#Nk';

    try {
        poolInstance = new Pool({
            host: 'aws-1-us-east-1.pooler.supabase.com',
            port: 6543,
            database: 'postgres',
            user: 'postgres.eptmqlnqdaljyxdfcuxg',
            password: dbPassword,
            min: 5,
            ssl: { rejectUnauthorized: false }
        });

        // Test connection
        const client = await poolInstance.connect();
        console.log(`[DB] Connected to Supabase PostgreSQL Database`);
        client.release();

        await runMigrations(poolInstance);

        // Map sqlite `.all`, `.get`, `.run`
        poolInstance.all = async (sql, params) => {
            if (!poolInstance) return [];
            const res = await poolInstance.query(sql, params);
            return res.rows;
        };
        poolInstance.get = async (sql, params) => {
            if (!poolInstance) return null;
            const res = await poolInstance.query(sql, params);
            return res.rows[0];
        };
        poolInstance.run = async (sql, params) => {
            if (!poolInstance) return { changes: 0 };
            const res = await poolInstance.query(sql, params);
            return { changes: res.rowCount };
        };

        return poolInstance;
    } catch (error) {
        console.error('[DB] Failed to connect to Supabase:', error.message);
        poolInstance = {
            all: async () => [],
            get: async () => null,
            run: async () => ({ changes: 0 })
        };
        return poolInstance;
    }
}

async function runMigrations(db) {
    console.log('[DB] Running migrations...');

    // Tabela: Users
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin'`);
    // Garante admin padrão (crypto nativo — sem bcryptjs)
    const crypto = require('crypto');
    const adminSalt = 'defaultsalt00000';
    const defHashBuf = await new Promise((res, rej) => crypto.scrypt('admin123', adminSalt, 64, (e, b) => e ? rej(e) : res(b)));
    const defHash = adminSalt + ':' + defHashBuf.toString('hex');
    
    // Se existir usuário com id=1 mas sem username, atualiza ele. Senão, insere.
    const hasAdmin = await db.query(`SELECT id FROM users WHERE username = 'admin'`);
    if (!hasAdmin.rows || hasAdmin.rows.length === 0) {
        await db.query(
            `INSERT INTO users (id, username, email, password_hash, role) VALUES (1, 'admin', 'admin@system.local', $1, 'admin') 
             ON CONFLICT (id) DO UPDATE SET username = 'admin', password_hash = $1, role = 'admin'`,
            [defHash]
        ).catch((e)=>console.error('Erro ao seedar admin:', e));
    }


    // Tabela: Domains
    await db.query(`
        CREATE TABLE IF NOT EXISTS domains (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            hostname TEXT UNIQUE NOT NULL, -- ex: quiz.meudominio.com
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Quizzes
    await db.query(`
        CREATE TABLE IF NOT EXISTS quizzes (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            slug TEXT UNIQUE, -- URL base ex: /meu-quiz
            config_json TEXT NOT NULL DEFAULT '{}', -- Onde fica cores, nos e rotas
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Tabela: Leads/Visitors Tracker
    await db.query(`
        CREATE TABLE IF NOT EXISTS quiz_events (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            visitor_id TEXT NOT NULL, -- UUID de cookie de quem acessa
            event_type TEXT NOT NULL, -- start, step_reached, finished, dropped
            step_id TEXT, -- ID do no em que esta
            answer_value TEXT, -- opcao que escolheu
            time_spent_seconds INTEGER DEFAULT 0, -- Tempo em segundos nessa etapa
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    // Garantir coluna time_spent_seconds em bancos existentes
    await db.query(`ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0`);

    // Performance Indexes for Analytics queries
    await db.query(`CREATE INDEX IF NOT EXISTS idx_quiz_events_quiz_id ON quiz_events(quiz_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_quiz_events_event_type ON quiz_events(event_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_quiz_events_visitor_id ON quiz_events(visitor_id)`);

    // Tabela: Team Tasks
    await db.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'todo', -- todo, in_progress, done
            priority TEXT DEFAULT 'medium', -- low, medium, high
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Round Robin A/B (Configurar quais quizzes rotacionar no domnio raiz)
    await db.query(`
        CREATE TABLE IF NOT EXISTS round_robin (
            id SERIAL PRIMARY KEY,
            quiz_ids TEXT NOT NULL DEFAULT '[]', -- JSON array de quiz IDs em ordem
            current_index INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    // Garante que existe pelo menos 1 registro de configurao
    await db.query(`INSERT INTO round_robin (quiz_ids) SELECT '[]' WHERE NOT EXISTS (SELECT 1 FROM round_robin)`);

    // Tabela: Integrations (chave-valor p/ configs globais)
    await db.query(`
        CREATE TABLE IF NOT EXISTS integrations (
            id SERIAL PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    // Pixel individual por quiz
    await db.query(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT`);

    console.log('[DB] Migrations executed successfully.');
}

module.exports = { getDB };
