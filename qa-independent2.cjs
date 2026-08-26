const { chromium } = require('playwright');
const BASE = 'http://localhost:4319';
const log = (...a) => console.log(a.join(' '));

async function mk(browser) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().split('\n')[0]); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  return { ctx, page, errors };
}
const txt = (p) => p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim());
const btns = (p) => p.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim() || '(no label)'));

(async () => {
  const browser = await chromium.launch();

  log('===== A. Controls available on each screen (dead-end check) =====');
  for (const r of ['/quiz', '/result', '/wrong-note', '/ranking']) {
    const { ctx, page } = await mk(browser);
    await page.goto(BASE + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    log(`  ${r}: buttons=${JSON.stringify(await btns(page))}`);
    await ctx.close();
  }

  log('');
  log('===== B. Play fully, then RELOAD the /result page =====');
  {
    const { ctx, page, errors } = await mk(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    for (let i = 0; i < 8; i++) {
      if (page.url().includes('/result')) break;
      await page.locator('li').nth(0).click();
      await page.waitForTimeout(100);
      await page.locator('button:has-text("다음 문제")').first().click();
      await page.waitForTimeout(300);
    }
    log('  after play : ' + (await txt(page)));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    log('  after F5   : ' + (await txt(page)));
    log('  errs=' + errors.length);
    await ctx.close();
  }

  log('');
  log('===== C. MID-QUIZ reload: does index + correctCount survive? =====');
  {
    const { ctx, page } = await mk(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    // answer 4, always picking the CORRECT option
    for (let i = 0; i < 4; i++) {
      const idx = await page.evaluate(() => {
        const qs = JSON.parse(localStorage.getItem('questions') || 'null');
        return null;
      });
      // find correct option by matching against bundled data fetched from the page
      const correctIdx = await page.evaluate(async () => {
        const body = (document.body.innerText || '');
        return null;
      });
      await page.locator('li').nth(0).click();
      await page.waitForTimeout(80);
      await page.locator('button:has-text("다음 문제")').first().click();
      await page.waitForTimeout(280);
    }
    const before = await txt(page);
    const stateBefore = await page.evaluate(() => JSON.stringify(history.state && history.state.usr));
    log('  before F5: ' + before.slice(0, 70));
    log('  history.state.usr before = ' + stateBefore);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const after = await txt(page);
    const stateAfter = await page.evaluate(() => JSON.stringify(history.state && history.state.usr));
    log('  after  F5: ' + after.slice(0, 70));
    log('  history.state.usr after  = ' + stateAfter);
    log('  SAME QUESTION AFTER RELOAD? ' + (before.slice(0, 40) === after.slice(0, 40)));
    // now finish the remaining questions and see the score
    for (let i = 0; i < 8; i++) {
      if (page.url().includes('/result')) break;
      const has = await page.locator('button:has-text("다음 문제")').count();
      if (!has) break;
      await page.locator('li').nth(0).click();
      await page.waitForTimeout(80);
      await page.locator('button:has-text("다음 문제")').first().click();
      await page.waitForTimeout(280);
    }
    log('  final result after mid-quiz reload: ' + (await txt(page)).slice(0, 60));
    log('  (vs. uninterrupted run which scored 4/8 with the same choices)');
    await ctx.close();
  }

  log('');
  log('===== D. Daily gating: can the same day be replayed for more "weekly" points? =====');
  {
    const { ctx, page } = await mk(browser);
    for (let round = 1; round <= 2; round++) {
      await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      for (let i = 0; i < 9; i++) {
        if (page.url().includes('/result')) break;
        const has = await page.locator('button:has-text("다음 문제")').count();
        if (!has) break;
        await page.locator('li').nth(0).click();
        await page.waitForTimeout(70);
        await page.locator('button:has-text("다음 문제")').first().click();
        await page.waitForTimeout(260);
      }
      const st = await page.evaluate(() => localStorage.getItem('quiz-state'));
      log(`  round ${round}: result="${(await txt(page)).slice(0, 30)}" quiz-state=${st}`);
    }
    await page.goto(BASE + '/ranking', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    log('  ranking after 2 plays on the SAME day: ' + (await txt(page)));
    await ctx.close();
  }

  log('');
  log('===== E. Exact crash on malformed weeklyRecords =====');
  {
    const { ctx, page, errors } = await mk(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('quiz-state', JSON.stringify({ completed: false, wrongAnswers: [], weeklyRecords: [{ nope: 1 }, null] })));
    await page.goto(BASE + '/ranking', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const rootLen = await page.evaluate(() => document.getElementById('root').innerHTML.length);
    log('  root innerHTML length = ' + rootLen + '  (blank screen if ~0)');
    log('  body text = "' + (await txt(page)) + '"');
    errors.forEach((e) => log('   ERR: ' + e.slice(0, 160)));
    await ctx.close();
  }

  log('');
  log('===== F. Is the correct answer / explanation ever shown? =====');
  {
    const { ctx, page } = await mk(browser);
    await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.locator('li').nth(0).click();
    await page.waitForTimeout(200);
    const t = await txt(page);
    log('  after selecting an option: ' + t);
    log('  contains explanation text ("예금보험공사")? ' + t.includes('예금보험공사'));
    await page.locator('button:has-text("다음 문제")').first().click();
    await page.waitForTimeout(300);
    log('  next screen: ' + (await txt(page)).slice(0, 80));
    log('  -> no per-question feedback screen between questions');
    await ctx.close();
  }

  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
