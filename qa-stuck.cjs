// 2번 문제에서 CTA가 영구 비활성화되는지 정밀 재현
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise((r) => server.listen(4322, r));
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 360, height: 740 } })).newPage();
  await p.goto('http://localhost:4322/quiz', { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);

  const cta = () => p.locator('button', { hasText: '다음 문제' }).first();
  const head = () => p.locator('body').innerText().then((t) => t.split('\n')[0]);

  console.log('Q1 head:', await head(), '| cta disabled:', await cta().isDisabled());
  // 선택지 li 클릭 (첫 선택지)
  await p.locator('li').first().click();
  await p.waitForTimeout(200);
  console.log('Q1 after select | cta disabled:', await cta().isDisabled(), '| 선택됨 표시:', (await p.locator('body').innerText()).includes('선택됨'));
  await cta().click();
  await p.waitForTimeout(600);

  console.log('\nQ2 head:', await head());
  console.log('Q2 초기 선택 표시 남아있음(상태 누수):', (await p.locator('body').innerText()).includes('선택됨'));
  console.log('Q2 cta disabled (선택 전):', await cta().isDisabled());
  // 여러 선택지를 눌러본다
  const lis = await p.locator('li').all();
  for (let i = 0; i < lis.length; i++) {
    await lis[i].click({ force: true });
    await p.waitForTimeout(200);
    console.log('  li[' + i + '] 클릭 후 cta disabled:', await cta().isDisabled());
  }
  await p.waitForTimeout(500);
  console.log('Q2 최종 cta disabled:', await cta().isDisabled());
  console.log('Q2에서 강제 클릭 시도 후 url:', (await cta().click({ force: true }).then(() => 'clicked').catch((e) => 'blocked')), new URL(p.url()).pathname);
  await p.waitForTimeout(500);
  console.log('여전히 head:', await head());

  // 새로고침하면 풀리는가?
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  console.log('\n--- 새로고침 후 ---');
  console.log('head:', await head(), '| (route state 유지되는가?)');
  console.log('cta disabled:', await cta().isDisabled());

  await b.close();
  server.close();
})();
