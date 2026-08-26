// Independent QA drive — read-only verification, no app source touched.
const { chromium } = require('playwright');

const BASE = 'http://localhost:4319';
const out = [];
function log(...a) { const s = a.join(' '); out.push(s); console.log(s); }

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  return { ctx, page, errors };
}

async function snapshot(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.pathname,
      chars: text.length,
      rootHtmlLen: root ? root.innerHTML.length : 0,
      text: text.slice(0, 400),
      testids: Array.from(document.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid')),
    };
  });
}

(async () => {
  const browser = await chromium.launch();

  // ---------- 1. Each route renders standalone (direct entry) ----------
  log('===== 1. DIRECT ROUTE ENTRY (fresh storage) =====');
  for (const route of ['/', '/quiz', '/result', '/wrong-note', '/ranking', '/zzz-unknown']) {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const s = await snapshot(page);
    log(`[${route}] -> ${s.url} chars=${s.chars} rootLen=${s.rootHtmlLen} consoleErrors=${errors.length}`);
    log(`   text: ${s.text}`);
    log(`   testids: ${JSON.stringify(s.testids)}`);
    if (errors.length) log('   ERRORS: ' + JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }

  // ---------- 2. Full happy-path flow ----------
  log('');
  log('===== 2. FULL FLOW: quiz -> result -> wrong-note -> ranking =====');
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    let steps = 0;
    while (steps < 40) {
      const isQuestion = await page.locator('[data-testid="quiz-question"]').count();
      if (!isQuestion) break;
      const title = await page.locator('h1,h2,h3').first().innerText().catch(() => '?');
      const rows = page.locator('li');
      const n = await rows.count();
      // always pick the FIRST option (deliberately mixed correct/incorrect)
      await rows.nth(0).click();
      await page.waitForTimeout(120);
      const cta = page.locator('button:has-text("다음 문제")');
      const disabled = await cta.first().isDisabled().catch(() => true);
      log(`  step ${steps}: title="${title.replace(/\s+/g, ' ')}" options=${n} ctaDisabled=${disabled}`);
      if (disabled) { log('  !! CTA stayed disabled after selecting an option -> DEAD END'); break; }
      await cta.first().click();
      await page.waitForTimeout(350);
      steps++;
      if (page.url().includes('/result')) break;
    }
    log(`  after ${steps} answers -> url=${page.url()}`);
    const s = await snapshot(page);
    log(`  result page text: ${s.text}`);
    log(`  testids: ${JSON.stringify(s.testids)}`);

    // wrong-note via CTA
    const wn = page.locator('button:has-text("오답노트 보기")');
    if (await wn.count()) {
      await wn.first().click();
      await page.waitForTimeout(400);
      const s2 = await snapshot(page);
      log(`  -> wrong-note url=${s2.url} chars=${s2.chars} testids=${JSON.stringify(s2.testids)}`);
      log(`     text: ${s2.text}`);
    } else { log('  !! no 오답노트 보기 CTA on result'); }

    // back to result then ranking
    await page.goto(BASE + '/result', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const rk = page.locator('text=이번 주 랭킹 보기');
    if (await rk.count()) {
      await rk.first().click();
      await page.waitForTimeout(500);
      const s3 = await snapshot(page);
      log(`  -> ranking url=${s3.url} chars=${s3.chars} testids=${JSON.stringify(s3.testids)}`);
      log(`     text: ${s3.text}`);
    } else { log('  !! no ranking entry on result'); }
    log(`  TOTAL console errors in flow: ${errors.length} ${JSON.stringify(errors.slice(0, 5))}`);
    await ctx.close();
  }

  // ---------- 3. Direct /result access with NO prior play ----------
  log('');
  log('===== 3. /result direct access, EMPTY storage (fabricated score?) =====');
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(BASE + '/result', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const s = await snapshot(page);
    log(`  text: ${s.text}`);
    log(`  consoleErrors=${errors.length}`);
    await ctx.close();
  }

  // ---------- 4. Mid-quiz reload: is progress kept? ----------
  log('');
  log('===== 4. MID-QUIZ RELOAD (state persistence) =====');
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    // answer 3 questions picking the CORRECT option each time
    for (let i = 0; i < 3; i++) {
      const correctText = await page.evaluate(() => {
        const qs = JSON.parse(document.body.dataset.__q || 'null');
        return null;
      });
      const rows = page.locator('li');
      await rows.nth(0).click();
      await page.waitForTimeout(100);
      await page.locator('button:has-text("다음 문제")').first().click();
      await page.waitForTimeout(300);
    }
    const before = await page.evaluate(() => document.querySelector('h1,h2,h3') && document.querySelector('h1,h2,h3').innerText);
    log(`  before reload: heading="${before}"`);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.querySelector('h1,h2,h3') && document.querySelector('h1,h2,h3').innerText);
    log(`  after  reload: heading="${after}"  (same heading => index kept via history.state)`);
    log(`  consoleErrors=${errors.length}`);
    await ctx.close();
  }

  // ---------- 5. Corrupted localStorage ----------
  log('');
  log('===== 5. CORRUPTED localStorage =====');
  for (const [name, script] of [
    ['quiz-state = "not json"', () => localStorage.setItem('quiz-state', '{{{')],
    ['quiz-state = null literal', () => localStorage.setItem('quiz-state', 'null')],
    ['quiz-state.wrongAnswers = string', () => localStorage.setItem('quiz-state', JSON.stringify({ completed: false, wrongAnswers: 'oops', weeklyRecords: 'oops' }))],
    ['questions = []', () => localStorage.setItem('questions', '[]')],
    ['questions = [{}]', () => localStorage.setItem('questions', '[{}]')],
    ['wrongAnswers ref unknown question', () => localStorage.setItem('quiz-state', JSON.stringify({ completed: false, wrongAnswers: [{ questionId: 'NOPE', date: 'garbage', selectedOptionId: 'x' }], weeklyRecords: [] }))],
    ['weeklyRecords malformed', () => localStorage.setItem('quiz-state', JSON.stringify({ completed: false, wrongAnswers: [], weeklyRecords: [{ nope: 1 }, null] }))],
  ]) {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.evaluate(script);
    for (const route of ['/quiz', '/result', '/wrong-note', '/ranking']) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      const s = await snapshot(page);
      log(`  [${name}] ${route}: chars=${s.chars} errs=${errors.length} :: ${s.text.slice(0, 120)}`);
    }
    if (errors.length) log(`    ERRORS: ${JSON.stringify(errors.slice(0, 3))}`);
    await ctx.close();
  }

  // ---------- 6. Touch target sizes (G-10) ----------
  log('');
  log('===== 6. TOUCH TARGETS >= 44px (G-10) =====');
  for (const route of ['/quiz', '/result', '/wrong-note', '/ranking']) {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const bad = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button,a,[role="button"],li[class]'));
      return els.map((e) => {
        const r = e.getBoundingClientRect();
        return { tag: e.tagName, text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) };
      }).filter((x) => x.w > 0 && x.h > 0 && (x.h < 44 || x.w < 44));
    });
    log(`  ${route}: undersized=${bad.length} ${JSON.stringify(bad)}`);
    await ctx.close();
  }

  // ---------- 7. Ranking with a broken remote API ----------
  log('');
  log('===== 7. RANKING remote-API failure modes (route intercept) =====');
  for (const [name, handler] of [
    ['500 error', (r) => r.fulfill({ status: 500, body: 'boom' })],
    ['abort/network fail', (r) => r.abort('failed')],
    ['malformed json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '<<<not json' })],
    ['entries with junk', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [{}, null] }) })],
  ]) {
    const { ctx, page, errors } = await newPage(browser);
    await page.route('**/leaderboard**', handler);
    await page.goto(BASE + '/ranking', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const s = await snapshot(page);
    log(`  [${name}] chars=${s.chars} errs=${errors.length} :: ${s.text.slice(0, 140)}`);
    await ctx.close();
  }

  await browser.close();
  require('fs').writeFileSync('/tmp/qa-independent.log', out.join('\n'));
})().catch((e) => { console.error('DRIVE FAILED', e); process.exit(1); });
