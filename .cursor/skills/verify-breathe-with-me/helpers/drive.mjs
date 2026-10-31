#!/usr/bin/env node
// drive.mjs - drive Breathe With Me like a user and capture runtime evidence.
// Usage: node drive.mjs <doctor|lifecycle|completion> --base URL [--reduced] [--mobile] [--virtual-minutes N] [--out DIR]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const has = (name) => args.includes('--' + name);
if (!cmd || has('help')) { console.log('usage: node drive.mjs <doctor|lifecycle|completion> --base URL [--reduced] [--mobile] [--virtual-minutes N] [--out DIR]'); process.exit(2); }
const BASE = opt('base', 'http://localhost:5199/');
const OUT = opt('out', '.verification-evidence');
const REDUCED = has('reduced');
const MOBILE = has('mobile');
const VMIN = parseFloat(opt('virtual-minutes', '0'));
fs.mkdirSync(OUT, { recursive: true });

const launchArgs = ['--no-sandbox', '--disable-gpu'];
if (REDUCED) launchArgs.push('--force-prefers-reduced-motion');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: launchArgs });
const page = await browser.newPage();
if (MOBILE) await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
const out = { cmd, base: BASE, reduced: REDUCED, mobile: MOBILE, steps: {}, errors: errs };
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const state = () => page.evaluate(() => ({
  btn: document.getElementById('session-button')?.textContent.trim(),
  instr: document.getElementById('instruction-text')?.textContent.trim(),
  modal: document.getElementById('stress-modal')?.classList.contains('visible'),
  overlay: document.getElementById('fade-overlay')?.classList.contains('visible'),
  pseudoName: getComputedStyle(document.getElementById('breathing-circle'), '::after').animationName,
  pseudoState: getComputedStyle(document.getElementById('breathing-circle'), '::after').animationPlayState,
  sessions: (JSON.parse(localStorage.getItem('breath_analytics_data') || '{"sessions":[]}').sessions || []).length,
}));
const clickTargetOfSubmit = () => page.evaluate(() => {
  const b = document.getElementById('submit-stress-button');
  const r = b.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return el ? (el.id || el.className || el.tagName) : 'none';
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

try {
  if (VMIN > 0) { console.error('--virtual-minutes is experimental and currently disabled'); process.exit(2); }
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });

  if (cmd === 'doctor') {
    const bundle = await page.evaluate(async () => {
      const src = [...document.scripts].map(s => s.src).find(s => s.includes('/assets/index-'));
      return src ? (await fetch(src)).status : 'no-bundle';
    });
    out.steps.load = { title: await page.title(), bundleStatus: bundle, hasBegin: await page.$('#session-button') !== null };
    await shot('doctor');
  }

  if (cmd === 'lifecycle' || cmd === 'completion') {
    if (cmd === 'completion') {
      await page.evaluate(() => localStorage.removeItem('breath_analytics_data'));
      await page.select('#session-duration', '3');   // real user path: pick 3 minutes in settings
      await sleep(300);
    }
    const before = (await state()).sessions;
    await page.click('#session-button');
    await sleep(900);
    out.steps.precheck = await state();                       // expect modal true
    await page.click('#submit-stress-button');
    await sleep(1500);
    out.steps.midSession = await state();                     // expect btn End, pseudo running (or none if reduced)
    await shot('mid-session');
    if (cmd === 'lifecycle') {
      await page.click('#session-button');                    // End -> pause
      await sleep(900);
      out.steps.paused = await state();                       // expect btn Begin, instr Paused
      await page.click('#session-button');                    // Begin -> resume, NO modal
      await sleep(1500);
      out.steps.resumed = await state();                      // expect btn End, modal false
      await shot('resumed');
    } else {
      // completion: wait for natural end (virtual time already covers it when VMIN set)
      const waitMs = VMIN > 0 ? 15000 : (3 * 60 + 25) * 1000;
      const t0 = Date.now();
      let s = await state();
      while (!s.modal && Date.now() - t0 < waitMs) { await sleep(3000); s = await state(); }
      out.steps.atCompletion = { ...s, submitClickTarget: await clickTargetOfSubmit() }; // expect modal true, overlay false, target = submit button
      await shot('postcheck-modal');
      await page.click('#submit-stress-button');
      await sleep(2500);
      out.steps.afterPost = await state();                    // expect instr Session complete, sessions before+1, overlay false
      out.steps.afterPost.sessionsBefore = before;
      await shot('complete');
    }
  }
  out.ok = errs.length === 0;
} catch (e) {
  out.ok = false; out.fatal = String(e).slice(0, 400);
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(out.ok ? 0 : 1);
