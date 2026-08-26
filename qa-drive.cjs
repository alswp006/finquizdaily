// QA driver — 실제 빌드 번들을 브라우저에서 구동해 각 화면을 적대적으로 검사한다.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

// SPA fallback 서버
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});

const OUT = path.join(__dirname, 'qa-shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

(async () => {
  await new Promise((r) => server.listen(4321, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  async function probe(url, label) {
    errors.length = 0;
    await page.goto('http://localhost:4321' + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const root = document.getElementById('root');
      const txt = (document.body.innerText || '').trim();
      const clickable = Array.from(document.querySelectorAll('button,a,[role="button"],li'));
      const tooSmall = clickable.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
      }).map((el) => (el.tagName + ':' + (el.innerText || '').slice(0, 20) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)));
      const nestedBtn = document.querySelectorAll('button button').length;
      return {
        rootLen: root ? root.innerHTML.length : 0,
        textLen: txt.length,
        text: txt.slice(0, 400),
        hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        nestedBtn,
        tooSmall: tooSmall.slice(0, 6),
        buttons: Array.from(document.querySelectorAll('button')).map(b => (b.innerText || '').trim().slice(0, 30)),
      };
    });
    await page.screenshot({ path: path.join(OUT, label + '.png'), fullPage: true });
    console.log('\n===== ' + label + ' (' + url + ') =====');
    console.log('rootHTML=' + info.rootLen + ' textLen=' + info.textLen + ' hScroll=' + info.hScroll + ' nestedButtons=' + info.nestedBtn);
    console.log('buttons: ' + JSON.stringify(info.buttons));
    console.log('sub44 taps: ' + JSON.stringify(info.tooSmall));
    console.log('TEXT: ' + info.text.replace(/\n/g, ' | '));
    console.log('ERRORS: ' + (errors.length ? JSON.stringify(errors) : 'none'));
    return info;
  }

  // 1. 각 라우트 직접 진입 (딥링크/새로고침 시나리오)
  for (const [u, l] of [['/', '01-root'], ['/quiz', '02-quiz'], ['/result', '03-result-direct'], ['/wrong-note', '04-wrongnote'], ['/ranking', '05-ranking'], ['/nonexistent-xyz', '06-404']]) {
    await probe(u, l);
  }

  // 2. 실제 퀴즈 플로우 — 끝까지 클릭
  console.log('\n\n########## FULL FLOW ##########');
  await page.goto('http://localhost:4321/quiz', { waitUntil: 'networkidle' });
  errors.length = 0;
  for (let step = 1; step <= 12; step++) {
    const url = new URL(page.url()).pathname;
    if (url !== '/quiz') { console.log('step ' + step + ': left quiz -> ' + url); break; }
    // 첫 선택지 클릭
    const rows = await page.locator('li, [role="button"]').all();
    const heading = (await page.locator('body').innerText()).split('\n')[0];
    let clicked = false;
    for (const r of rows) {
      const t = (await r.innerText().catch(() => '')).trim();
      if (t && !t.includes('다음 문제')) { await r.click({ force: true }).catch(() => {}); clicked = true; break; }
    }
    const cta = page.locator('button', { hasText: '다음 문제' }).first();
    const disabled = await cta.isDisabled().catch(() => 'n/a');
    console.log('step ' + step + ': head="' + heading + '" optionClicked=' + clicked + ' ctaDisabled=' + disabled);
    if (disabled === true) { console.log('  !! CTA still disabled after selecting an option — STUCK'); break; }
    await cta.click().catch((e) => console.log('  cta click fail: ' + e.message.slice(0, 80)));
    await page.waitForTimeout(350);
  }
  console.log('final url: ' + new URL(page.url()).pathname);
  await page.screenshot({ path: path.join(OUT, '07-after-flow.png'), fullPage: true });
  console.log('flow text: ' + (await page.locator('body').innerText()).replace(/\n/g, ' | ').slice(0, 400));
  console.log('flow ERRORS: ' + (errors.length ? JSON.stringify(errors) : 'none'));

  // 3. 결과 페이지 재검사 + localStorage 상태
  const ls = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))).slice(0, 1200));
  console.log('\nlocalStorage after flow: ' + ls);

  // 4. 새로고침 후 퀴즈 상태 유지 확인
  await page.goto('http://localhost:4321/quiz', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  console.log('\n### RELOAD /quiz after完주: head="' + (await page.locator('body').innerText()).split('\n')[0] + '"');

  // 5. 손상된 localStorage
  await page.evaluate(() => { localStorage.setItem('quiz-state', '{{{broken'); localStorage.setItem('questions', '"notanarray"'); });
  await probe('/quiz', '08-corrupt-storage');
  await probe('/wrong-note', '09-corrupt-wrongnote');

  // 6. 빈 문제 은행
  await page.evaluate(() => { localStorage.setItem('questions', '[]'); localStorage.removeItem('quiz-state'); });
  await probe('/quiz', '10-empty-bank');
  await probe('/result', '11-empty-bank-result');

  await browser.close();
  server.close();
})();
