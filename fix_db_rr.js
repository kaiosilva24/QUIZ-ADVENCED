const { getDB } = require('./backend/src/db');
(async () => {
try {
  const db = await getDB();
  await db.run("UPDATE round_robin SET quiz_ids = $1, current_index = 0", ['[6,7]']);
  console.log('Fixed DB!');
  process.exit(0);
} catch(e) { console.error(e); process.exit(1); }
})();
