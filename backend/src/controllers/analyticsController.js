const { getDB } = require('../db');
const https = require('https');

// ── Geo lookup via ip-api.com (gratuito, sem auth, 45 req/min) ────────────────
function geoLookup(ip) {
    return new Promise((resolve) => {
        const cleanIp = (ip || '').replace('::ffff:', '').replace('::1', '').split(',')[0].trim();
        if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === 'localhost') {
            return resolve({ city: 'Local', state: 'DEV', country: 'BR' });
        }
        const url = `http://ip-api.com/json/${cleanIp}?lang=pt-BR&fields=status,city,regionName,countryCode`;
        https.get(url.replace('http://', 'http://'), (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const j = JSON.parse(data);
                    resolve(j.status === 'success' ? { city: j.city || '', state: j.regionName || '', country: j.countryCode || '' } : { city: '', state: '', country: '' });
                } catch { resolve({ city: '', state: '', country: '' }); }
            });
        }).on('error', () => resolve({ city: '', state: '', country: '' }));
    });
}

// ── Detecção de origem por referrer / parâmetros da URL ───────────────────────
function detectSource(utmSource, referrer) {
    if (utmSource) {
        const u = utmSource.toLowerCase();
        if (u.includes('instagram') || u === 'ig') return 'instagram';
        if (u.includes('facebook') || u === 'fb') return 'facebook';
        if (u.includes('youtube') || u === 'yt') return 'youtube';
        if (u.includes('google') || u === 'goog') return 'google';
        if (u.includes('tiktok') || u === 'tt') return 'tiktok';
        if (u.includes('whatsapp') || u === 'wpp') return 'whatsapp';
        if (u.includes('email')) return 'email';
        if (u.includes('twitter') || u === 'x') return 'twitter';
        return utmSource.toLowerCase();
    }
    if (referrer) {
        const r = referrer.toLowerCase();
        if (r.includes('instagram') || r.includes('l.instagram')) return 'instagram';
        if (r.includes('facebook') || r.includes('fb.com')) return 'facebook';
        if (r.includes('youtube') || r.includes('youtu.be')) return 'youtube';
        if (r.includes('google')) return 'google';
        if (r.includes('tiktok')) return 'tiktok';
        if (r.includes('t.co') || r.includes('twitter')) return 'twitter';
        if (r.includes('whatsapp') || r.includes('wa.me')) return 'whatsapp';
        if (r) return 'other';
    }
    return 'direct';
}

// POST /api/analytics/track — Registra evento de lead
async function trackEvent(req, res) {
    const { quiz_id, visitor_id, event_type, step_id, answer_value, time_spent_seconds,
            device_type, browser, os, utm_source, utm_medium, utm_campaign, referrer } = req.body;
    try {
        const db = await getDB();
        await db.run(
            'INSERT INTO quiz_events (quiz_id, visitor_id, event_type, step_id, answer_value, time_spent_seconds) VALUES ($1,$2,$3,$4,$5,$6)',
            [quiz_id, visitor_id, event_type, step_id || null, answer_value || null, time_spent_seconds || 0]
        );

        // Captura intelligence somente no evento 'start'
        if (event_type === 'start') {
            const source = detectSource(utm_source, referrer);
            const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
            // Geo lookup async, não bloqueia a resposta
            geoLookup(ip).then(geo => {
                db.run(`
                    INSERT INTO lead_metadata (visitor_id, quiz_id, device_type, browser, os, city, state, country, source, utm_source, utm_medium, utm_campaign, referrer)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                    ON CONFLICT (visitor_id) DO UPDATE SET
                        quiz_id=EXCLUDED.quiz_id, device_type=EXCLUDED.device_type, browser=EXCLUDED.browser, os=EXCLUDED.os,
                        city=EXCLUDED.city, state=EXCLUDED.state, country=EXCLUDED.country,
                        source=EXCLUDED.source, utm_source=EXCLUDED.utm_source, utm_medium=EXCLUDED.utm_medium,
                        utm_campaign=EXCLUDED.utm_campaign, referrer=EXCLUDED.referrer
                `, [
                    visitor_id, quiz_id,
                    device_type || 'unknown', browser || 'unknown', os || 'unknown',
                    geo.city, geo.state, geo.country,
                    source, utm_source || null, utm_medium || null, utm_campaign || null, referrer || null
                ]).catch(e => console.error('[Intel] Erro ao salvar metadata:', e));
            });
        }

        res.status(201).json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/analytics/quiz/:quizId — Detalhes de um quiz específico
async function getQuizAnalytics(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        const [total, finished, stepFunnel, answerCounts, pageviewOnly] = await Promise.all([
            db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type='start'", [quizId]),
            db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE quiz_id=$1 AND event_type='finished'", [quizId]),
            db.all(`SELECT step_id,
                    COUNT(DISTINCT visitor_id) as visitors,
                    ROUND(AVG(max_time), 1) as avg_time_seconds
                 FROM (
                   SELECT step_id, visitor_id, MAX(time_spent_seconds) as max_time
                   FROM quiz_events
                   WHERE quiz_id=$1 AND event_type='step_reached'
                   GROUP BY step_id, visitor_id
                 ) sub
                 GROUP BY step_id ORDER BY visitors DESC`, [quizId]),
            db.all(`SELECT step_id, answer_value, COUNT(*) as count
                 FROM quiz_events
                 WHERE quiz_id=$1 AND event_type='step_reached' AND answer_value IS NOT NULL
                 GROUP BY step_id, answer_value ORDER BY step_id, count DESC`, [quizId]),
            db.get(`SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events
                 WHERE quiz_id=$1 AND event_type='start'
                   AND visitor_id NOT IN (
                     SELECT DISTINCT visitor_id FROM quiz_events
                     WHERE quiz_id=$1 AND event_type='step_reached' AND answer_value IS NOT NULL
                   )`, [quizId])
        ]);
        const answersByStep = {};
        for (const row of answerCounts) {
            if (!answersByStep[row.step_id]) answersByStep[row.step_id] = [];
            answersByStep[row.step_id].push({ answer: row.answer_value, count: parseInt(row.count) });
        }
        res.json({
            total_starts: parseInt(total?.count || 0),
            total_finished: parseInt(finished?.count || 0),
            pageview_only: parseInt(pageviewOnly?.count || 0),
            conversion_rate: parseInt(total?.count || 0) > 0 ? Math.round((parseInt(finished?.count || 0) / parseInt(total?.count || 0)) * 100) : 0,
            step_funnel: stepFunnel.map(s => ({ step_id: s.step_id, visitors: parseInt(s.visitors), avg_time_seconds: parseFloat(s.avg_time_seconds || 0) })),
            answers_by_step: answersByStep
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/analytics/overview
async function getAnalyticsOverview(req, res) {
    try {
        const db = await getDB();
        const [globalStarts, globalFinishes, quizzesStats] = await Promise.all([
             db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='start'"),
             db.get("SELECT COUNT(DISTINCT visitor_id) as count FROM quiz_events WHERE event_type='finished'"),
             db.all(`SELECT q.id, q.title, q.slug,
                        COUNT(DISTINCT CASE WHEN e.event_type = 'start' THEN e.visitor_id END) as starts,
                        COUNT(DISTINCT CASE WHEN e.event_type = 'finished' THEN e.visitor_id END) as finishes,
                        ROUND(AVG(CASE WHEN e.event_type = 'step_reached' THEN e.time_spent_seconds END), 1) as avg_time
                 FROM quizzes q LEFT JOIN quiz_events e ON q.id = e.quiz_id
                 GROUP BY q.id, q.title, q.slug ORDER BY starts DESC`)
        ]);
        const total_leads = parseInt(globalStarts?.count || 0);
        const total_finished = parseInt(globalFinishes?.count || 0);
        res.json({
            overview: { total_leads, total_finished, conversion_rate: total_leads > 0 ? Math.round((total_finished / total_leads) * 100) : 0 },
            quizzes: quizzesStats.map(q => ({
                id: q.id, title: q.title, slug: q.slug,
                starts: parseInt(q.starts || 0), finishes: parseInt(q.finishes || 0),
                avg_time_seconds: parseFloat(q.avg_time || 0),
                conversion_rate: parseInt(q.starts || 0) > 0 ? Math.round((parseInt(q.finishes || 0) / parseInt(q.starts || 0)) * 100) : 0
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/analytics/quiz/:quizId/leads — Jornada por lead + intel
async function getQuizLeads(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        const events = await db.all(`
            SELECT e.visitor_id, e.event_type, e.step_id, e.answer_value, e.time_spent_seconds, e.created_at,
                   m.device_type, m.browser, m.os, m.city, m.state, m.country, m.source, m.utm_campaign
            FROM quiz_events e
            LEFT JOIN lead_metadata m ON e.visitor_id = m.visitor_id
            WHERE e.quiz_id = $1
            ORDER BY e.created_at ASC
        `, [quizId]);

        const leadsMap = {};
        for (const row of events) {
            if (!leadsMap[row.visitor_id]) {
                leadsMap[row.visitor_id] = {
                    visitor_id: row.visitor_id,
                    start_time: null,
                    total_time: 0,
                    finished: false,
                    journey: [],
                    intel: {
                        device_type: row.device_type || null,
                        browser: row.browser || null,
                        os: row.os || null,
                        city: row.city || null,
                        state: row.state || null,
                        country: row.country || null,
                        source: row.source || null,
                        utm_campaign: row.utm_campaign || null
                    }
                };
            }
            const lead = leadsMap[row.visitor_id];
            if (row.event_type === 'start' && !lead.start_time) lead.start_time = row.created_at;
            if (row.event_type === 'finished') lead.finished = true;
            if (row.event_type === 'step_reached' || row.event_type === 'dropped') {
                const existing = lead.journey.find(s => s.step_id === row.step_id);
                if (existing) {
                    if (row.answer_value) existing.answer = row.answer_value;
                    if ((row.time_spent_seconds || 0) > existing.time_spent) existing.time_spent = row.time_spent_seconds || 0;
                } else {
                    lead.journey.push({ step_id: row.step_id, answer: row.answer_value, time_spent: row.time_spent_seconds || 0, timestamp: row.created_at });
                }
            }
        }
        for (const lead of Object.values(leadsMap)) {
            lead.total_time = lead.journey.reduce((sum, s) => sum + s.time_spent, 0);
        }
        res.json(Object.values(leadsMap).sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/analytics/quiz/:quizId/intel — Agregados de dispositivos, origens e localidades
async function getLeadIntelStats(req, res) {
    const { quizId } = req.params;
    try {
        const db = await getDB();
        const [devices, sources, cities] = await Promise.all([
            db.all(`SELECT device_type, COUNT(*) as count FROM lead_metadata WHERE quiz_id=$1 GROUP BY device_type ORDER BY count DESC`, [quizId]),
            db.all(`SELECT source, COUNT(*) as count FROM lead_metadata WHERE quiz_id=$1 GROUP BY source ORDER BY count DESC LIMIT 8`, [quizId]),
            db.all(`SELECT city, state, COUNT(*) as count FROM lead_metadata WHERE quiz_id=$1 AND city IS NOT NULL AND city != '' GROUP BY city, state ORDER BY count DESC LIMIT 8`, [quizId]),
        ]);
        res.json({
            devices: devices.map(d => ({ label: d.device_type || 'unknown', count: parseInt(d.count) })),
            sources: sources.map(s => ({ label: s.source || 'direct', count: parseInt(s.count) })),
            cities: cities.map(c => ({ label: c.city + (c.state ? `, ${c.state}` : ''), count: parseInt(c.count) })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getQuizAnalytics, trackEvent, getAnalyticsOverview, getQuizLeads, getLeadIntelStats };
