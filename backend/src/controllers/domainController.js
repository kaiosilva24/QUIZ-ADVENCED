const { getDB } = require('../db');

async function getDomains(req, res) {
    try {
        const db = await getDB();
        // MVP: ignorando autenticação de usuário no router agora
        const domains = await db.all('SELECT * FROM domains ORDER BY id DESC');
        res.json(domains);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function createDomain(req, res) {
    const { hostname } = req.body;
    try {
        const db = await getDB();
        
        // Simulação hardcoded de usuario com id 1 pra mvp
        const mockUserId = 1; 

        // Garante que o usuario exista para constraint (mvp) em Postgres
        await db.run(`INSERT INTO users (id, email, password_hash) VALUES (1, 'admin@admin.com', 'admin') ON CONFLICT (id) DO NOTHING`);

        const row = await db.get(
            'INSERT INTO domains (user_id, hostname) VALUES ($1, $2) RETURNING id',
            [mockUserId, hostname]
        );
        res.status(201).json({ id: row.id, hostname });
    } catch (error) {
        // PG unique constraint violation code is 23505
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Domain already exists' });
        }
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getDomains,
    createDomain
};
