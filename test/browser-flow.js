// Browser-flow tests for Paperclip: boots the real lesson page in jsdom
// against a real server instance and drives the actual client code —
// panel render, context build, send flow (mock provider), per-lesson
// conversation, assistance level, editor-version tracking — then repeats
// against a failing provider to verify the error path.
//
// Requires jsdom (dev dependency):  npm install
// Offline, no API key needed (uses PAPERCLIP_PROVIDER=mock).
//
//   npm run test:browser
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUCCESS_PORT = 8789;
const FAIL_PORT = 8790;

function startServer(port, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server/server.js'], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        PAPERCLIP_PROVIDER: 'mock',
        PAPERCLIP_API_KEY: 'test-key',
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error('server did not start in time'));
    }, 8000);
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('running at')) {
        ready = true;
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on('exit', (code) => {
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`server exited early (code ${code})`));
      }
    });
  });
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGKILL');
  await new Promise((r) => child.on('exit', r));
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runFlow(url, title) {
  let JSDOM;
  try {
    ({ JSDOM } = require('jsdom'));
  } catch (err) {
    throw new Error('jsdom is not installed — run `npm install` first.');
  }
  const dom = await JSDOM.fromURL(url, {
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.Worker = class { constructor() {} postMessage() {} terminate() {} };
      window.speechSynthesis = { speaking: false, cancel() {}, speak() {} };
      const realFetch = fetch.bind(globalThis);
      // Node's fetch rejects AbortSignals from another realm; strip them
      // for the test (real browsers share one realm and work normally).
      window.fetch = (u, opts) => {
        const clean = { ...opts };
        delete clean.signal;
        if (clean.headers && typeof clean.headers.get === 'function') {
          const out = {};
          clean.headers.forEach((v, k) => { out[k] = v; });
          clean.headers = out;
        }
        return realFetch(new URL(u, window.location.href).href, clean);
      };
      window.confirm = () => true;
    },
  });

  const { window } = dom;
  const { document } = window;
  const evalJs = (expr) => dom.window.eval(expr);
  const failures = [];
  const pageErrors = [];
  window.addEventListener('error', (e) => pageErrors.push(String(e.message || e)));
  const check = (name, cond, extra) => {
    if (cond) console.log(`  PASS  ${name}`);
    else failures.push(`${name}${extra ? ' — ' + extra : ''}`);
  };

  await delay(4000); // lesson JSON + app boot
  if (pageErrors.length) console.log(`  NOTE  page errors: ${pageErrors.slice(0, 3).join(' | ')}`);

  check('Paperclip client exposed', ['object', 'function'].includes(evalJs('typeof Paperclip')));
  check('panel rendered', !!document.getElementById('paperclipPane'));
  check('input rendered', !!document.getElementById('paperclipInput'));
  check('send button rendered', !!document.getElementById('paperclipSendBtn'));
  check('empty-state message shown', document.getElementById('paperclipConversation').textContent.includes('Ask about the lesson'));
  check('breadcrumb shows lesson', (document.getElementById('breadcrumb').textContent || '').includes('While Loops'));

  const ctx = evalJs('PaperclipContext.build()');
  check('context lesson id', ctx.lessonId === 'py-ch07-while-loops', ctx.lessonId);
  check('context lesson title', (ctx.lesson || '').includes('While Loops'), ctx.lesson);
  check('context editor code', (ctx.editor.code || '').includes('forge_countdown'));
  check('context has version', typeof ctx.editor.version === 'number' && ctx.editor.version > 0);
  check('context assignment', ctx.assignment && ctx.assignment.title === 'Forge Countdown');
  check('context complete=false', ctx.assignmentComplete === false);
  check('no hidden material in context',
    !JSON.stringify(ctx).includes('count -= 1') &&
    !JSON.stringify(ctx).includes('testHarness') &&
    !JSON.stringify(ctx).includes('expectedOutput'));

  evalJs(`Paperclip.recordRun(${JSON.stringify({ ok: false, output: '5\n5\n5\n5\n', timedOut: true, source: 'run' })})`);
  const ctx2 = evalJs('PaperclipContext.build()');
  check('Test A context: lastRun=timeout', ctx2.lastRun && ctx2.lastRun.status === 'timeout');
  check('Test A context: failure category', ctx2.testSummary && ctx2.testSummary.failureCategory === 'probable infinite loop');

  document.getElementById('paperclipInput').value = 'why does it keep running?';
  document.getElementById('paperclipSendBtn').click();
  await delay(1500);
  const conv = document.getElementById('paperclipConversation').textContent;
  check('user message appears', conv.includes('why does it keep running?'));
  check('assistant message appears', conv.includes('[mock]'));
  check('thinking indicator cleared', !document.querySelector('.paperclip-thinking'));

  const stored = window.localStorage.getItem('codeforge:paperclip:conv:py-ch07-while-loops');
  check('conversation stored per lesson', !!stored && stored.includes('why does it keep running?'));
  check('assistance level bumped', window.localStorage.getItem('codeforge:paperclip:level:py-ch07-while-loops') === '1');

  const before = evalJs('PaperclipContext.build()');
  check('updated flag false on repeat send', before.editor.updatedSinceLastMessage === false);
  document.getElementById('previewEditor').value = 'count = 5\nwhile count > 0:\n    print(count)\n';
  const after = evalJs('PaperclipContext.build()');
  check('updated flag true after edit', after.editor.updatedSinceLastMessage === true);

  evalJs(`Paperclip.recordRun(${JSON.stringify({ ok: false, output: "Traceback (most recent call last):\nNameError: name 'counts' is not defined", source: 'run' })})`);
  const ctxC = evalJs('PaperclipContext.build()');
  check('Test C context: status=runtime_error', ctxC.lastRun.status === 'runtime_error', ctxC.lastRun.status);
  check('Test C context: error text present', (ctxC.lastRun.stdout || '').includes('NameError'));

  window.localStorage.setItem('codeforge:lesson:py-ch07-while-loops:complete', '1');
  evalJs(`Paperclip.recordRun(${JSON.stringify({ passed: true, executed: true, requirementResults: [{ passed: true, label: 'Uses while' }], outputCheck: { passed: true, label: 'prints' }, rawOutput: '3\n2\n1\nFORGE!\n', source: 'submit' })})`);
  const ctxD = evalJs('PaperclipContext.build()');
  check('Test D context: assignmentComplete=true', ctxD.assignmentComplete === true);
  check('Test D context: assistance reset to 0', ctxD.assistanceLevel === 0, String(ctxD.assistanceLevel));
  window.localStorage.removeItem('codeforge:lesson:py-ch07-while-loops:complete');

  return { failures, evalJs, document };
}

async function runErrorPath(url) {
  const { JSDOM } = require('jsdom');
  const dom = await JSDOM.fromURL(url, {
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.Worker = class { constructor() {} postMessage() {} terminate() {} };
      window.speechSynthesis = { speaking: false, cancel() {}, speak() {} };
      const realFetch = fetch.bind(globalThis);
      window.fetch = (u, opts) => {
        const clean = { ...opts };
        delete clean.signal;
        return realFetch(new URL(u, window.location.href).href, clean);
      };
      window.confirm = () => true;
    },
  });
  const { window } = dom;
  const { document } = window;
  const failures = [];
  const check = (name, cond, extra) => {
    if (cond) console.log(`  PASS  ${name}`);
    else failures.push(`${name}${extra ? ' — ' + extra : ''}`);
  };

  await delay(4000);
  check('lesson still boots', (document.getElementById('breadcrumb').textContent || '').includes('While Loops'));
  check('editor still editable', !!document.getElementById('previewEditor'));

  document.getElementById('paperclipInput').value = 'hello?';
  document.getElementById('paperclipSendBtn').click();
  await delay(2000);
  const conv = document.getElementById('paperclipConversation').textContent;
  check('Test F: friendly error shown', conv.includes('temporarily unavailable'), conv.slice(0, 200));
  check('Test F: no fabricated tutor answer', !conv.includes('A real model would answer'));
  check('Test F: conversation survives', window.localStorage.getItem('codeforge:paperclip:conv:py-ch07-while-loops') !== null);
  check('Test F: status bar mentions unavailable', document.getElementById('statusText').textContent.includes('unavailable'));
  return failures;
}

async function main() {
  console.log('Paperclip browser-flow tests (jsdom + mock provider)\n');
  const servers = [];
  process.on('exit', () => servers.forEach((s) => { try { s.kill('SIGKILL'); } catch (err) { /* ignore */ } }));
  const serverA = await startServer(SUCCESS_PORT);
  servers.push(serverA);
  console.log(`- success-path server on :${SUCCESS_PORT}`);
  let failures = (await runFlow(`http://127.0.0.1:${SUCCESS_PORT}/app/lesson.html`, 'success path')).failures;
  await stopServer(serverA);

  const serverB = await startServer(FAIL_PORT, { PAPERCLIP_MOCK_FAILURE: '1' });
  servers.push(serverB);
  console.log(`- failing-provider server on :${FAIL_PORT}`);
  failures = failures.concat(await runErrorPath(`http://127.0.0.1:${FAIL_PORT}/app/lesson.html`));
  await stopServer(serverB);

  if (failures.length) {
    console.log(`\n${failures.length} failures:`);
    failures.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('\nAll browser-flow checks passed');
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});