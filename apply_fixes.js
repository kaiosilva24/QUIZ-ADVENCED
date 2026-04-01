const fs = require('fs');
let content = fs.readFileSync('frontend/src/QuizPreview.jsx', 'utf8');

content = content.replace(/import \{ Emoji \} from 'emoji-picker-react';\n/g, '');
content = content.replace(/import \{ customList \} from 'country-codes-list';\n/g, '');
content = content.replace(/import 'flag-icons\/css\/flag-icons.min.css';\n/g, '');

const nativeEmojiStr = `import countries from './countries.json';

function NativeEmoji({ unified, size }) {
  if (!unified) return null;
  const emojiStr = String.fromCodePoint(...unified.split('-').map(u => parseInt(u, 16)));
  return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{emojiStr}</span>;
}

`;
content = content.replace(/function getFlagEmoji/, nativeEmojiStr + 'function getFlagEmoji');

content = content.replace(/const countryDialCodes = customList\('countryCode', '\{countryCallingCode\}'\);\nconst countryChoices = Object\.keys\(countryDialCodes\)\.map\(code => \(\{\n  code,\n  dial: `\+\$\{countryDialCodes\[code\]\}`,\n  emoji: getFlagEmoji\(code\)\n\}\)\)\.sort\(\(a,b\) => a\.code\.localeCompare\(b\.code\)\);/g, `const countryChoices = countries.map(c => ({
  code: c.code,
  dial: c.dial,
  emoji: getFlagEmoji(c.code)
})).sort((a,b) => a.code.localeCompare(b.code));`);

content = content.replaceAll('<Emoji ', '<NativeEmoji ');

fs.writeFileSync('frontend/src/QuizPreview.jsx', content);
console.log('Done!');
