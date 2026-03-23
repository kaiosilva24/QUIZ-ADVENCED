const { getDB } = require('./src/db');

async function check() {
  const db = await getDB();
  const res = await db.all('SELECT id, title, slug, config_json FROM quizzes ORDER BY id DESC LIMIT 5');
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
check();
