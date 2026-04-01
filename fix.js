const { getDB } = require('./backend/src/db');
const { deepCompressObj } = require('./backend/src/utils/imageUtils');

async function fixDB() {
  try {
    const db = await getDB();
    console.log('Fetching quiz 1...');
    const r = await db.get('SELECT config_json FROM quizzes WHERE id = 1');
    const json = JSON.parse(r.config_json);
    const oldLen = r.config_json.length;
    console.log('Original length:', (oldLen/1024/1024).toFixed(2), 'MB');
    
    console.log('Compressing...');
    await deepCompressObj(json);
    
    const newStr = JSON.stringify(json);
    const newLen = newStr.length;
    console.log('New length:', (newLen/1024/1024).toFixed(2), 'MB');
    
    if (newLen < oldLen) {
        console.log('Updating DB...');
        await db.run('UPDATE quizzes SET config_json = $1 WHERE id = 1', [newStr]);
        console.log('DB Updated.');
    } else {
        console.log('No reduction.');
    }
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  }
}

fixDB();
