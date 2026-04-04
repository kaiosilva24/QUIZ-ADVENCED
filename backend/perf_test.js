const { Pool } = require('pg');
const start = Date.now();
const DB = 'postgresql://admin:SecurePass_WhatsApp_2026!@129.80.149.224:8080/whatsapp_warming';
console.log('Connecting...');
const pool = new Pool({ connectionString: DB, ssl: false, connectionTimeoutMillis: 10000 });

pool.query("SET search_path TO quiz_system, public")
  .then(() => pool.query("SELECT id, length(config_json) as json_size, title FROM quizzes ORDER BY id DESC LIMIT 5"))
  .then(r => {
    console.log('DB round-trip: ' + (Date.now() - start) + 'ms');
    if (!r.rows.length) { console.log('No quizzes found'); }
    r.rows.forEach(row => {
      const kb = Math.round(row.json_size / 1024);
      const flag = kb > 500 ? 'GIGANTE' : kb > 100 ? 'Grande' : 'OK';
      console.log('  Quiz ' + row.id + ' | ' + kb + ' KB | ' + flag + ' | ' + (row.title || '?'));
    });
    pool.end();
  })
  .catch(e => { console.error('Erro:', e.message); pool.end(); });
