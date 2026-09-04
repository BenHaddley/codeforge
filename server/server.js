// Code Forge development server. Serves the static site (so the repo keeps
// working exactly as before with `python3 -m http.server`) AND exposes the
// Paperclip tutor API at POST /api/paperclip, which is the only place that
// holds provider credentials.
//
// Node 18+ (global fetch) plus ws for the optional lab terminal.
//   node server/server.js
//
// For a production deployment, serve the static files from a CDN and run
// this API behind a reverse proxy, or adapt server/paperclip/* to a
// serverless function (see docs/16-paperclip-ai-tutor.md).
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./paperclip/config');
const { handlePaperclipRequest } = require('./paperclip/api');
const { attachLabTerminal, controllerRunning, verifyLab } = require('./lab-terminal');

const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function log(entry) {
  const line = `[${new Date().toISOString()}] ${entry}`;
  // eslint-disable-next-line no-console
  console.log(line);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/lab/status') {
    sendJson(res, 200, { ok: true, running: controllerRunning() });
    return;
  }

  if (url.pathname === '/api/lab/verify') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, passed: false, output: 'POST only' });
      return;
    }
    const localClient = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    if (!localClient) {
      sendJson(res, 403, { ok: false, passed: false, output: 'Lab verification is local-only.' });
      return;
    }
    let body;
    try { body = JSON.parse(await readBody(req, 8 * 1024)); }
    catch (_) {
      sendJson(res, 400, { ok: false, passed: false, output: 'Invalid request.' });
      return;
    }
    const result = verifyLab(body.checkId);
    sendJson(res, result.ok ? 200 : 409, result);
    return;
  }

  // ---- Paperclip API -----------------------------------------------------
  if (url.pathname === '/api/paperclip') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: { kind: 'invalid_request', message: 'POST only' } });
      return;
    }
    const ip = req.socket.remoteAddress || 'unknown';
    let body;
    try {
      const raw = await readBody(req, 128 * 1024);
      body = JSON.parse(raw);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: { kind: 'invalid_request', message: 'invalid JSON body' } });
      return;
    }
    const started = Date.now();
    const result = await handlePaperclipRequest(body, { ip, log: (e) => log(`[PAPERCLIP] ${JSON.stringify({ ip, ...e })}`) });
    log(`[PAPERCLIP] ${JSON.stringify({ ip, ok: result.ok, latencyMs: Date.now() - started, provider: result.provider || null })}`);
    sendJson(res, result.ok ? 200 : (result.error.kind === 'rate_limited' ? 429 : 502), result);
    return;
  }

  // ---- Static files ------------------------------------------------------
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      // Code Forge is actively authored through this development server.
      // Revalidate every local asset so edited lesson routes and curriculum
      // JSON cannot be hidden behind an hour-old browser response cache.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    });
    stream.pipe(res);
  });
});

attachLabTerminal(server, { log });

server.listen(config.port, config.host, () => {
  log(`Code Forge server running at http://${config.host}:${config.port}`);
  log(`Paperclip API: POST /api/paperclip (provider=${config.paperclip.provider}, model=${config.paperclip.model})`);
});
