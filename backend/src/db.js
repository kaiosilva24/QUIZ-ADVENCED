const { Pool } = require('pg');

let poolInstance = null;

async function getDB() {
    if (poolInstance) return poolInstance;

    // A senha contém '#', o que quebra o parse da URL. Precisa ser feito o URL encode.
    const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
    const connectionString = `postgresql://postgres.eptmqlnqdaljyxdfcuxg:${encodedPassword}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;

    try {
        poolInstance = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false } // Supabase requires SSL
        });

        // Test connection
        const client = await poolInstance.connect();
        console.log(`[DB] Connected to Supabase PostgreSQL Database`);
        client.release();

        await runMigrations(poolInstance);

        // Map sqlite `.all`, `.get`, `.run` to simplify adapter change for controllers
        poolInstance.all = async (sql, params) => {
            const res = await poolInstance.query(sql, params);
            return res.rows;
        };
        poolInstance.get = async (sql, params) => {
            const res = await poolInstance.query(sql, params);
            return res.rows[0];
        };
        poolInstance.run = async (sql, params) => {
            const res = await poolInstance.query(sql, params);
            // Sqlite returns { lastID, changes }, pg doesn't have lastID directly unless RETURNING is used, but we map changes
            return { changes: res.rowCount };
        };

        return poolInstance;
    } catch (error) {
        console.error('[DB] Failed to connect to Supabase:', error);
        throw error;
    }
}

async function runMigrations(db) {
    console.log('[DB] Running migrations...');

    // Tabela: Users
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

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

    // Tabela: Quizzes (Agora armazenando o Grafo JSON do Quiz)
    await db.query(`
        CREATE TABLE IF NOT EXISTS quizzes (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            config_json TEXT NOT NULL DEFAULT '{}', -- Onde fica cores, nos e rotas
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Leads/Visitors Tracker (Monitorar progresso no funil do Roteador)
    await db.query(`
        CREATE TABLE IF NOT EXISTS quiz_events (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            visitor_id TEXT NOT NULL, -- UUID de cookie de quem acessa
            event_type TEXT NOT NULL, -- start, step_reached, finished, dropped
            step_id TEXT, -- ID do nó em que está
            answer_value TEXT, -- Opção que escolheu
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tabela: Team Tasks (Para controle interno)
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

    console.log('[DB] Migrations executed successfully.');
}

module.exports = { getDB };
