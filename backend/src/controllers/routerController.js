const { getDB } = require('../db');

// Cache em memória simples para controlar o Round Robin: { "domain.com": 0 } (index do último quiz)
const roundRobinState = {};

async function handleQuizRouting(req, res) {
    const hostname = req.hostname; 

    console.log(`[Roteador] Requisição recebida para o domínio: ${hostname}`);

    try {
        const db = await getDB();

        // 1. Achar o domínio na base
        const domain = await db.get('SELECT id FROM domains WHERE hostname = $1 AND is_active = TRUE', [hostname]);

        if (!domain) {
            return res.status(404).send('<!DOCTYPE html><html><body><h1>Domínio não configurado ou inativo.</h1></body></html>');
        }

        // 2. Achar os Quizzes Ativos para esse domínio
        const quizzes = await db.all('SELECT id, config_json FROM quizzes WHERE domain_id = $1 AND is_active = TRUE ORDER BY id ASC', [domain.id]);

        if (!quizzes || quizzes.length === 0) {
            return res.status(404).json({ error: 'Nenhum Quiz ativo para este domínio.' });
        }

        // 3. Checar Cookie de Tracking (O User pediu para manter no mesmo quiz se der F5)
        const trackingCookieName = `quiz_assigned_${domain.id}`;
        const assignedQuizId = req.cookies[trackingCookieName];

        let quizToServe = null;

        let nextIndex = 0; // Declare it here so it's in scope for logging
        if (assignedQuizId) {
            // Se o usuário já tem um cookie, tentamos achar o quiz correspondente
            quizToServe = quizzes.find(q => q.id.toString() === assignedQuizId);
        }

        // 4. Se não achou por cookie (novo acesso) faz o Round Robin
        if (!quizToServe) {
            let lastServedIndex = roundRobinState[hostname];
            
            // Iniciar em -1 se nunca acessado
            if (lastServedIndex === undefined) {
                lastServedIndex = -1;
            }

            // Descobrir qual o próximo index na roleta
            nextIndex = lastServedIndex + 1;
            
            // Se passar da quantidade, zera a roleta
            if (nextIndex >= quizzes.length) {
                nextIndex = 0;
            }

            // Atualiza memória
            roundRobinState[hostname] = nextIndex;
            quizToServe = quizzes[nextIndex];

            // Seta o Cookie no navegador do cara para as próximas visitas
            res.cookie(trackingCookieName, quizToServe.id.toString(), {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias em milisegundos
                httpOnly: true, // Impedir acesso via Javascript frontend
                // secure: true // Requer HTTPS ativo. Iremos ativar depois.
            });

            console.log(`[Roteador] Novo Visitante -> Domínio: ${hostname} -> Servindo Quiz ID: ${quizToServe.id} (Roleta Index: ${nextIndex})`);
        } else {
             console.log(`[Roteador] Visitante com Cookie -> Domínio: ${hostname} -> Resgatou Quiz ID: ${quizToServe.id}`);
        }

        // 5. Devolver o JSON formatado para o front renderizar
        res.setHeader('Content-Type', 'application/json');
        return res.json({
            quiz_id: quizToServe.id,
            config: JSON.parse(quizToServe.config_json || '{}')
        });

    } catch (error) {
        console.error('[Roteador] ERRO:', error);
        res.status(500).json({ error: 'Erro interno do servidor Roteador.' });
    }
}

module.exports = {
    handleQuizRouting
};
