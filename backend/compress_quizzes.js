// Compressão com Sharp — suporta WebP, PNG, JPEG, GIF
const { Pool } = require('pg');
const sharp = require('sharp');

const DB = 'postgresql://admin:SecurePass_WhatsApp_2026!@129.80.149.224:8080/whatsapp_warming';
const pool = new Pool({ connectionString: DB, ssl: false });

async function compressImage(str) {
  if (typeof str !== 'string' || !str.startsWith('data:image/')) return str;
  try {
    const base64 = str.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    const before = buf.length;
    
    const out = await sharp(buf)
      .resize({ width: 480, withoutEnlargement: true })
      .jpeg({ quality: 40, mozjpeg: true })
      .toBuffer();
    
    const result = `data:image/jpeg;base64,${out.toString('base64')}`;
    const after = out.length;
    const pct = Math.round((1 - after/before) * 100);
    console.log(`    ${Math.round(before/1024)}KB → ${Math.round(after/1024)}KB (-${pct}%)`);
    return after < before ? result : str;
  } catch (e) {
    console.log(`    [SKIP] ${e.message.substring(0,60)}`);
    return str;
  }
}

async function deepCompress(obj) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string' && obj[i].startsWith('data:image/')) {
        obj[i] = await compressImage(obj[i]);
      } else if (typeof obj[i] === 'object' && obj[i]) await deepCompress(obj[i]);
    }
  } else if (typeof obj === 'object' && obj) {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string' && obj[key].startsWith('data:image/')) {
        obj[key] = await compressImage(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key]) await deepCompress(obj[key]);
    }
  }
}

async function main() {
  await pool.query('SET search_path TO quiz_system, public');
  const rows = await pool.query('SELECT id, title, length(config_json) as size FROM quizzes WHERE length(config_json) > 50000 ORDER BY id');
  console.log(`\nComprimindo ${rows.rows.length} quiz(zes) com Sharp (WebP+JPEG+PNG)...\n`);

  for (const row of rows.rows) {
    const kbBefore = Math.round(row.size / 1024);
    console.log(`Quiz ${row.id} | "${row.title}" | ${kbBefore} KB`);
    const full = await pool.query('SELECT config_json FROM quizzes WHERE id=$1', [row.id]);
    const config = JSON.parse(full.rows[0].config_json || '{}');
    await deepCompress(config);
    const newJson = JSON.stringify(config);
    const kbAfter = Math.round(newJson.length / 1024);
    await pool.query('UPDATE quizzes SET config_json=$1, updated_at=NOW() WHERE id=$2', [newJson, row.id]);
    console.log(`\n  ✅ ${kbBefore} KB → ${kbAfter} KB (-${Math.round((1-kbAfter/kbBefore)*100)}%)\n`);
  }

  pool.end();
  console.log('✅ Concluído!');
}

main().catch(e => { console.error(e.message); pool.end(); });
