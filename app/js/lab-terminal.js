// xterm.js view for the fixed, disposable Ansible controller container.
// The server owns the security boundary: the browser sends terminal bytes,
// never a container name or host command.
(function labTerminalClient() {
  let terminal = null;
  let fitAddon = null;
  let socket = null;
  let assetsPromise = null;

  function loadAssets() {
    if (assetsPromise) return assetsPromise;
    const addStyle = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '../node_modules/@xterm/xterm/css/xterm.css';
      document.head.appendChild(link);
    };
    const addScript = (src) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    addStyle();
    assetsPromise = addScript('../node_modules/@xterm/xterm/lib/xterm.js')
      .then(() => addScript('../node_modules/@xterm/addon-fit/lib/addon-fit.js'));
    return assetsPromise;
  }

  function endpoint() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/api/lab/terminal`;
  }

  function ensureTerminal() {
    if (terminal) return;
    terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"Courier New", monospace',
      fontSize: 14,
      theme: { background: '#000000', foreground: '#c0c0c0', cursor: '#ffffff' },
      scrollback: 2000,
    });
    fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(document.getElementById('labTerminal'));
    terminal.writeln('Code Forge Ansible Lab');
    terminal.writeln('Connecting to the disposable controller...\r\n');
    terminal.onData((data) => {
      if (socket && socket.readyState === WebSocket.OPEN) socket.send(data);
    });
    window.addEventListener('resize', () => {
      if (!document.getElementById('labTerminal').hidden) fitAddon.fit();
    });
  }

  async function connect() {
    try {
      await loadAssets();
    } catch {
      document.getElementById('labTerminal').textContent = 'Could not load xterm.js. Run npm install and reload.';
      return;
    }
    ensureTerminal();
    fitAddon.fit();
    terminal.focus();
    if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return;
    socket = new WebSocket(endpoint());
    socket.addEventListener('message', (event) => terminal.write(event.data));
    socket.addEventListener('open', () => terminal.writeln('[connected]\r'));
    socket.addEventListener('close', () => terminal.writeln('\r\n[disconnected — start the lab with npm run lab:up]'));
    socket.addEventListener('error', () => terminal.writeln('\r\n[terminal connection failed]'));
  }

  window.CodeForgeTerminal = { connect };
})();
