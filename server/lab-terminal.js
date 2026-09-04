'use strict';

const { spawn, spawnSync } = require('child_process');
const { WebSocketServer } = require('ws');

const CONTROLLER = 'codeforge-ansible-controller';

function controllerRunning() {
  const result = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', CONTROLLER], {
    encoding: 'utf8',
    timeout: 3000,
  });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function runController(args, timeout = 30000) {
  const result = spawnSync('docker', ['exec', '-w', '/workspace', CONTROLLER, ...args], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 2 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

// Browser requests select one fixed verification recipe. No host command,
// container name, or command arguments are accepted from the request.
function verifyLab(checkId) {
  if (!controllerRunning()) return { ok: false, passed: false, output: 'Lab is stopped. Run npm run lab:up first.' };

  if (checkId === 'inventory-connectivity') {
    const result = runController(['ansible', 'all', '-m', 'ansible.builtin.ping']);
    const hosts = ['web01', 'web02', 'db01'];
    return { ok: result.ok, passed: result.ok && hosts.every((host) => result.output.includes(host)) && (result.output.match(/SUCCESS/g) || []).length >= 3, output: result.output };
  }

  if (checkId === 'package-idempotence') {
    const args = ['ansible', 'webservers', '-b', '-m', 'ansible.builtin.package', '-a', 'name=curl state=present'];
    const first = runController(args);
    if (!first.ok) return { ok: false, passed: false, output: first.output };
    const second = runController(args);
    return { ok: second.ok, passed: second.ok && (second.output.match(/"changed": false/g) || []).length >= 2, output: `First convergence:\n${first.output}\n\nIdempotence run:\n${second.output}` };
  }

  if (checkId === 'web-tier') {
    const syntax = runController(['ansible-playbook', '--syntax-check', 'webservers.yml']);
    if (!syntax.ok) return { ok: false, passed: false, output: `Syntax check failed:\n${syntax.output}` };
    const first = runController(['ansible-playbook', 'webservers.yml'], 60000);
    if (!first.ok) return { ok: false, passed: false, output: `Convergence failed:\n${first.output}` };
    const second = runController(['ansible-playbook', 'webservers.yml'], 60000);
    if (!second.ok) return { ok: false, passed: false, output: `Second run failed:\n${second.output}` };
    const service = runController(['ansible', 'webservers', '-b', '-m', 'ansible.builtin.service', '-a', 'name=nginx state=started']);
    const unchanged = /changed=0/.test(second.output);
    return { ok: service.ok, passed: service.ok && unchanged && (service.output.match(/SUCCESS/g) || []).length >= 2, output: `Second playbook run:\n${second.output}\n\nService verification:\n${service.output}` };
  }

  return { ok: false, passed: false, output: 'Unknown lab verification.' };
}

function attachLabTerminal(server, { log = () => {} } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const localClient = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
    if (url.pathname !== '/api/lab/terminal' || !localClient) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  wss.on('connection', (ws) => {
    if (!controllerRunning()) {
      ws.send('\r\n[Code Forge] Lab is stopped. Run: npm run lab:up\r\n');
      ws.close(1013, 'lab unavailable');
      return;
    }

    const shell = spawn('docker', [
      'exec', '-i', '-e', 'TERM=xterm-256color', '-w', '/workspace',
      CONTROLLER, 'bash', '--noprofile', '--norc', '-i',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    log('[LAB] terminal connected');

    const send = (chunk) => {
      if (ws.readyState === 1) ws.send(chunk.toString());
    };
    shell.stdout.on('data', send);
    shell.stderr.on('data', send);
    ws.on('message', (data) => {
      if (shell.stdin.writable) shell.stdin.write(data.toString().slice(0, 8192));
    });
    ws.on('close', () => shell.kill('SIGTERM'));
    shell.on('close', (code) => {
      send(`\r\n[Code Forge] Terminal exited (${code ?? 'unknown'}).\r\n`);
      if (ws.readyState === 1) ws.close();
    });
  });

  return { controllerRunning };
}

module.exports = { attachLabTerminal, controllerRunning, verifyLab };
