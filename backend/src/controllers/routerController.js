const { getDB } = require('../db');

async function handleQuizRouting(req, res) {
    const slug = req.params.slug;

    console.log(`[Roteador] Requisição recebida para o slug: ${slug}`);

    try {
        const db = await getDB();

        let quiz = await db.get('SELECT id, config_json FROM quizzes WHERE slug = $1 AND is_active = TRUE', [slug]);

        if (!quiz && slug.startsWith('quiz-')) {
            const id = slug.replace('quiz-', '');
            if (!isNaN(id)) {
                quiz = await db.get('SELECT id, config_json FROM quizzes WHERE id = $1 AND is_active = TRUE', [id]);
            }
        }

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz não encontrado ou inativo.' });
        }

        // Parse do JSON para enviar bonitinho pro front
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            quiz_id: quiz.id,
            config: JSON.parse(quiz.config_json || '{}')
        });

    } catch (error) {
        console.error('[Roteador] Erro no roteamento por slug:', error);
        return res.status(500).json({ error: 'Erro interno no Roteador' });
    }
}

module.exports = {
    handleQuizRouting
};
