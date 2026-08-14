// Code Forge development server. Serves the static site (so the repo keeps
// working exactly as before with `python3 -m http.server`) AND exposes the
// Paperclip tutor API at POST /api/paperclip, which is the only place that
// holds provider credentials.
//
// Zero dependencies: Node 18+ (global fetch) is all that is required.
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
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
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

server.listen(config.port, config.host, () => {
  log(`Code Forge server running at http://${config.host}:${config.port}`);
  log(`Paperclip API: POST /api/paperclip (provider=${config.paperclip.provider}, model=${config.paperclip.model})`);
});