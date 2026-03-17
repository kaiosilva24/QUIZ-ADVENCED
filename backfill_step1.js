/**
 * Backfill: insere step_reached para o PRIMEIRO step de cada quiz
 * para leads que só têm evento 'start' (abandonaram na página 1 antes do fix).
 */
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.eptmqlnqdaljyxdfcuxg',
  password: process.env.DB_PASSWORD || '#Nk552446#Nk',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Pega todos os quizzes e o ID do primeiro step de cada quiz
    const quizzes = await client.query(`SELECT id, config_json FROM quizzes`);
    
    let totalFixed = 0;
    
    for (const quiz of quizzes.rows) {
      let config;
      try { config = JSON.parse(quiz.config_json || '{}'); } catch { continue; }
      const firstStep = config?.steps?.[0];
      if (!firstStep?.id) {
        console.log(`Quiz ${quiz.id}: sem steps configurados, pulando.`);
        continue;
      }
      
      const firstStepId = firstStep.id;
      
      // Encontra leads que iniciaram este quiz mas NUNCA chegaram no primeiro step
      const leadsWithoutStep1 = await client.query(`
        SELECT DISTINCT visitor_id, created_at
        FROM quiz_events
        WHERE quiz_id = $1 AND event_type = 'start'
          AND visitor_id NOT IN (
            SELECT DISTINCT visitor_id FROM quiz_events
            WHERE quiz_id = $1 AND event_type = 'step_reached' AND step_id = $2
          )
        ORDER BY created_at
      `, [quiz.id, firstStepId]);
      
      if (leadsWithoutStep1.rows.length === 0) {
        console.log(`Quiz ${quiz.id}: todos os leads já têm step_reached para step 1. OK.`);
        continue;
      }
      
      console.log(`Quiz ${quiz.id}: backfilling ${leadsWithoutStep1.rows.length} leads para step '${firstStepId}'...`);
      
      for (const lead of leadsWithoutStep1.rows) {
        await client.query(`
          INSERT INTO quiz_events (quiz_id, visitor_id, event_type, step_id, answer_value, time_spent_seconds, created_at)
          VALUES ($1, $2, 'step_reached', $3, NULL, 0, $4)
        `, [quiz.id, lead.visitor_id, firstStepId, lead.created_at]);
        totalFixed++;
      }
    }
    
    console.log(`\n✅ Backfill concluído! ${totalFixed} eventos inseridos.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e.message); pool.end(); });
