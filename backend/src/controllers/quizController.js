const { getDB } = require('../db');

async function getQuizzesByDomain(req, res) {
    const { domainId } = req.params;
    try {
        const db = await getDB();
        const quizzes = await db.all('SELECT * FROM quizzes WHERE domain_id = $1 ORDER BY id DESC', [domainId]);
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function createQuiz(req, res) {
    const { domain_id, title, config_json } = req.body;
    try {
        const db = await getDB();
        // Em pg precisamos usar um call raw pro pool retornar as rows inseridas, já que alteramos .run em db.js
        const result = await db.query(
            'INSERT INTO quizzes (domain_id, title, config_json) VALUES ($1, $2, $3) RETURNING id',
            [domain_id, title, config_json || '{}']
        );
        res.status(201).json({ id: result.rows[0].id, title });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateQuiz(req, res) {
    const { id } = req.params;
    const { title, config_json, is_active } = req.body;
    try {
        const db = await getDB();
        await db.run(
            'UPDATE quizzes SET title=$1, config_json=$2, is_active=$3 WHERE id=$4',
            [title, config_json, is_active !== undefined ? is_active : true, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteQuiz(req, res) {
    const { id } = req.params;
    try {
        const db = await getDB();
        await db.run('DELETE FROM quizzes WHERE id=$1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getQuizzesByDomain,
    createQuiz,
    updateQuiz,
    deleteQuiz
};
