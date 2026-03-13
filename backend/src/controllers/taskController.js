const { getDB } = require('../db');

async function getTasks(req, res) {
    try {
        const db = await getDB();
        const tasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function createTask(req, res) {
    const { title, description, status, priority } = req.body;
    try {
        const db = await getDB();
        const result = await db.query(
            'INSERT INTO tasks (title, description, status, priority) VALUES ($1, $2, $3, $4) RETURNING id',
            [title, description || '', status || 'todo', priority || 'medium']
        );
        res.status(201).json({ id: result.rows[0].id, title });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateTask(req, res) {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;
    try {
        const db = await getDB();
        await db.run(
            'UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4 WHERE id=$5',
            [title, description, status, priority, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteTask(req, res) {
    const { id } = req.params;
    try {
        const db = await getDB();
        await db.run('DELETE FROM tasks WHERE id=$1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
