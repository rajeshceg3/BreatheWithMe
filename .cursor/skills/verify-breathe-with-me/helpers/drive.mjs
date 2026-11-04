#!/usr/bin/env node
// drive.mjs - drive Breathe With Me like a user and capture runtime evidence.
// Usage: node drive.mjs <doctor|lifecycle|completion|settings> --base URL [--reduced] [--mobile] [--virtual-minutes N] [--out DIR]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const has = (name) => args.includes('--' + name);
if (!['doctor','lifecycle','completion','settings'].includes(cmd) || has('help')) { console.log('usage: node drive.mjs <doctor|lifecycle|completion|settings> --base URL [--reduced] [--mobile] [--virtual-minutes N] [--out DIR]'); process.exit(2); }
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
if (!MOBILE) await page.setViewport({ width:1365, height:900 });
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
const assert = (condition,message) => { if(!condition) throw Error(message); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

try {
  if (VMIN > 0) { console.error('--virtual-minutes is experimental and currently disabled'); process.exit(2); }
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });

  if (cmd === 'settings') {
    await page.waitForFunction(()=>document.querySelector('#settings-toggle-button')?.getBoundingClientRect().width>0);
    await page.click('#settings-toggle-button');
    await page.waitForSelector('#settings-panel.visible');
    await page.waitForFunction(()=>{const b=document.querySelector('#close-settings-button'),r=b.getBoundingClientRect();return r.width>0&&(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)));});
    await page.select('#session-duration','5');
    out.steps.settingsBeforeClose=await page.$eval('#settings-panel',el=>({class:el.className,text:el.innerText}));
    await page.click('#close-settings-button');
    const beforeTheme=await page.evaluate(()=>document.documentElement.dataset.theme);
    await page.waitForFunction(()=>{const b=document.querySelector('#theme-toggle-button'),r=b.getBoundingClientRect();return r.width>0&&(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)));});
    await page.click('#theme-toggle-button');
    const afterTheme=await page.evaluate(()=>document.documentElement.dataset.theme);
    assert(beforeTheme!==afterTheme,'Theme did not toggle');
    await page.waitForFunction(()=>{const b=document.querySelector('#sound-toggle-button'),r=b.getBoundingClientRect();return !b.disabled&&r.width>0&&(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)));});
    await page.click('#sound-toggle-button');
    out.steps.soundDiagnostic=await page.$eval('#sound-toggle-button',el=>({pressed:el.getAttribute('aria-pressed'),label:el.getAttribute('aria-label'),saved:localStorage.getItem('soundEnabled')}));
    await page.waitForFunction(()=>document.querySelector('#sound-toggle-button').getAttribute('aria-pressed')==='true');
    const sound=await page.$eval('#sound-toggle-button',el=>el.getAttribute('aria-pressed'));
    assert(sound==='true','Sound UI did not enable');
    await page.reload({waitUntil:'networkidle2'});
    out.steps.settings=await page.evaluate(()=>({duration:document.querySelector('#session-duration').value,saved:localStorage.getItem('sessionDuration'),theme:document.documentElement.dataset.theme,sound:localStorage.getItem('soundEnabled'),pressed:document.querySelector('#sound-toggle-button').getAttribute('aria-pressed')}));
    assert(out.steps.settings.duration==='5'&&out.steps.settings.saved==='5'&&out.steps.settings.theme===afterTheme&&out.steps.settings.sound==='true'&&out.steps.settings.pressed==='true','Settings did not persist');
    await shot('settings');
  }
  if (cmd === 'doctor') {
    const bundle = await page.evaluate(async () => {
      const src = [...document.scripts].map(s => s.src).find(s => s.includes('/assets/index-'));
      return src ? (await fetch(src)).status : 'no-bundle';
    });
    out.steps.load = { title: await page.title(), bundleStatus: bundle, hasBegin: await page.$('#session-button') !== null };
    assert(out.steps.load.bundleStatus===200 && out.steps.load.hasBegin && out.steps.load.title==='Breathe With Me','Doctor target/boot/bundle mismatch');
    await shot('doctor');
  }

  if (cmd === 'lifecycle' || cmd === 'completion') {
    if (cmd === 'completion') {
      await page.waitForFunction(()=>document.querySelector('#settings-toggle-button')?.getBoundingClientRect().width>0);
      await page.click('#settings-toggle-button');
      await page.waitForSelector('#settings-panel.visible');
      await page.waitForFunction(()=>{const b=document.querySelector('#close-settings-button'),r=b.getBoundingClientRect();return r.width>0&&(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)));});
      await page.select('#session-duration', '3');
      await page.click('#close-settings-button');
      await page.waitForFunction(()=>!document.querySelector('#settings-panel').classList.contains('visible'));
      await sleep(400);
    }
    const before = (await state()).sessions;
    await page.click('#session-button');
    await sleep(900);
    out.steps.precheck = await state();                       // expect modal true
    assert(out.steps.precheck.modal && !out.steps.precheck.overlay,'Precheck not usable');
    await page.click('#submit-stress-button');
    await sleep(1500);
    out.steps.midSession = await state();                     // expect btn End, pseudo running (or none if reduced)
    assert(out.steps.midSession.btn==='End'&&!out.steps.midSession.modal&&!out.steps.midSession.overlay,'Session did not begin');
    assert(REDUCED ? out.steps.midSession.pseudoName==='none' : out.steps.midSession.pseudoState==='running','Motion mode contract failed');
    await shot('mid-session');
    if (cmd === 'lifecycle') {
      await page.click('#session-button');                    // End -> pause
      await sleep(900);
      out.steps.paused = await state();                       // expect btn Begin, instr Paused
      await page.click('#session-button');                    // Begin -> resume, NO modal
      await sleep(1500);
      out.steps.resumed = await state();                      // expect btn End, modal false
      assert(out.steps.paused.btn==='Begin'&&out.steps.paused.instr.startsWith('Paused.'),'Pause contract failed');
      assert(out.steps.resumed.btn==='End'&&!out.steps.resumed.modal,'Resume reopened precheck or failed');
      await shot('resumed');
      await page.click('#session-button');
    } else {
      // completion: wait for natural end (virtual time already covers it when VMIN set)
      const waitMs = VMIN > 0 ? 15000 : (3 * 60 + 25) * 1000;
      const t0 = Date.now();
      let s = await state();
      while (!s.modal && Date.now() - t0 < waitMs) { await sleep(3000); s = await state(); }
      out.steps.atCompletion = { ...s, submitClickTarget: await clickTargetOfSubmit() }; // expect modal true, overlay false, target = submit button
      assert(s.modal&&!s.overlay&&out.steps.atCompletion.submitClickTarget==='submit-stress-button','Completion modal covered or unreachable');
      await shot('postcheck-modal');
      await page.click('#submit-stress-button');
      await sleep(2500);
      out.steps.afterPost = await state();                    // expect instr Session complete, sessions before+1, overlay false
      out.steps.afterPost.sessionsBefore = before;
      assert(out.steps.afterPost.sessions===before+1&&!out.steps.afterPost.overlay&&out.steps.afterPost.instr==='Session complete. A beautiful journey.','Completion history/message contract failed');
      await page.click('#analytics-toggle-button');
      await page.waitForSelector('#analytics-panel.visible');
      out.steps.analyticsText=await page.$eval('#analytics-panel',el=>el.innerText);
      assert(out.steps.analyticsText.includes('Your Journey'),'Analytics panel not rendered');
      await shot('complete');
    }
  }
  out.ok = errs.length === 0;
} catch (e) {
  out.ok = false; out.fatal = String(e).slice(0, 400);
}
fs.writeFileSync(`${OUT}/${cmd}-${MOBILE?'390':'1365'}-${REDUCED?'reduced':'normal'}.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(out.ok ? 0 : 1);
