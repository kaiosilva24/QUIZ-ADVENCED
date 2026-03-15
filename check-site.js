const https = require('https');

https.get('https://herancasherdadas.org/', (res) => {
  let h = '';
  res.on('data', d => h += d);
  res.on('end', () => {
    const m = h.match(/assets\/index-[^\"']+\.js/);
    if (!m) {
      console.log('No JS bundle found');
      return;
    }
    console.log('Found bundle:', m[0]);
    https.get('https://herancasherdadas.org/' + m[0], (res2) => {
      let js = '';
      res2.on('data', d => js += d);
      res2.on('end', () => {
        console.log('HAS_NEW_CODE (NO_QUIZ_CONFIGURED):', js.includes('NO_QUIZ_CONFIGURED'));
        console.log('HAS_NEW_CODE (AdminPanel component):', js.includes('AdminPanel'));
        console.log('HAS_OLD_BUG (window.location.href="/admin"):', js.includes('window.location.href="/admin"') || js.includes("window.location.href='/admin'"));
      });
    });
  });
});
