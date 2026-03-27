const { getDB } = require('./src/db');
const fs = require('fs');

async function run() {
  try {
    const db = await getDB();
    const res = await db.query('SELECT config_json FROM quizzes WHERE id = $1', [25]);
    if (res.rows.length > 0) {
      fs.writeFileSync('quiz25_config.json', res.rows[0].config_json);
      console.log('Saved to quiz25_config.json');
    } else {
      console.log('Quiz not found.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
