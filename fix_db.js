const fs = require('fs');
let content = fs.readFileSync('backend/src/db.js', 'utf8');
const insert = `
    // Tabela: Round Robin A/B
    await db.run(\`
        CREATE TABLE IF NOT EXISTS round_robin (
            id SERIAL PRIMARY KEY,
            quiz_ids TEXT NOT NULL DEFAULT '[]',
            current_index INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    \`);
    await db.run(\`INSERT INTO round_robin (quiz_ids) SELECT '[]' WHERE NOT EXISTS (SELECT 1 FROM round_robin)\`);
`;
content = content.replace("console.log('[DB] Migrations executed successfully.');", insert + "\n    console.log('[DB] Migrations executed successfully.');");
fs.writeFileSync('backend/src/db.js', Buffer.from(content, 'utf8'));
console.log('Fixed db.js encoding and added round_robin table.');
