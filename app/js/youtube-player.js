// A Win95-chrome video player. Uses YouTube's official IFrame Player API
// (not a scraped/rehosted video — see docs/12-copyright-source-boundaries.md)
// with controls:0 so our own beveled play/seek/volume/fullscreen bar drives
// real playback instead of YouTube's native chrome. Clips to the lesson's
// start/end window rather than forcing the full source video.
const CFVideoPlayer = (() => {
  let apiPromise = null;

  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
        return;
      }
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function mount(container, clip) {
    if (!clip) {
      container.innerHTML = '<div class="cfvp-empty">No video for this lesson.</div>';
      return;
    }
    const duration = Math.max(1, clip.endSeconds - clip.startSeconds);
    container.innerHTML = `
      <div class="cfvp-frame">
        <div class="cfvp-stage" id="cfvpStage">
          <img class="cfvp-poster" id="cfvpPoster" src="https://img.youtube.com/vi/${clip.videoId}/hqdefault.jpg" alt="">
          <button class="cfvp-playbtn" id="cfvpPlayBtn" aria-label="Play video">▶</button>
          <div class="cfvp-mount" id="cfvpMount"></div>
        </div>
        <div class="cfvp-controls">
          <button class="cfvp-ctrl" id="cfvpToggle" aria-label="Play or pause">▶</button>
          <span class="cfvp-time" id="cfvpCurrent">0:00</span>
          <input type="range" class="cfvp-seek" id="cfvpSeek" min="0" max="1000" value="0">
          <span class="cfvp-time" id="cfvpDuration">${formatTime(duration)}</span>
          <button class="cfvp-ctrl" id="cfvpMute" aria-label="Mute or unmute">🔊</button>
          <input type="range" class="cfvp-volume" id="cfvpVolume" min="0" max="100" value="100">
          <button class="cfvp-ctrl" id="cfvpFullscreen" aria-label="Fullscreen">⛶</button>
        </div>
        <div class="cfvp-attribution">${escapeHtml(clip.creator)} — ${escapeHtml(clip.title)}</div>
      </div>`;

    let player = null;
    let pollTimer = null;
    let started = false;

    function startPolling() {
      stopPolling();
      pollTimer = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        const t = player.getCurrentTime() - clip.startSeconds;
        if (clip.endSeconds && player.getCurrentTime() >= clip.endSeconds) {
          player.pauseVideo();
          return;
        }
        document.getElementById('cfvpCurrent').textContent = formatTime(t);
        document.getElementById('cfvpSeek').value = Math.round((t / duration) * 1000);
      }, 250);
    }
    function stopPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    }

    function setToggleIcon(playing) {
      document.getElementById('cfvpToggle').textContent = playing ? '⏸' : '▶';
    }

    function ensurePlayer() {
      if (player) return;
      const stage = document.getElementById('cfvpStage');
      stage.classList.add('cfvp-active');
      loadApi().then((YT) => {
        player = new YT.Player('cfvpMount', {
          videoId: clip.videoId,
          playerVars: {
            start: clip.startSeconds,
            end: clip.endSeconds,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              e.target.playVideo();
            },
            onStateChange: (e) => {
              const playing = e.data === YT.PlayerState.PLAYING;
              setToggleIcon(playing);
              if (playing) startPolling();
              else stopPolling();
              if (e.data === YT.PlayerState.ENDED) {
                document.getElementById('cfvpSeek').value = 1000;
              }
            },
          },
        });
      });
    }

    document.getElementById('cfvpPlayBtn').addEventListener('click', () => {
      started = true;
      ensurePlayer();
    });
    document.getElementById('cfvpToggle').addEventListener('click', () => {
      if (!started) {
        started = true;
        ensurePlayer();
        return;
      }
      if (!player) return;
      const state = player.getPlayerState();
      if (state === 1) player.pauseVideo();
      else player.playVideo();
    });
    document.getElementById('cfvpSeek').addEventListener('input', (e) => {
      if (!player) return;
      const t = clip.startSeconds + (e.target.value / 1000) * duration;
      player.seekTo(t, true);
    });
    document.getElementById('cfvpVolume').addEventListener('input', (e) => {
      if (!player) return;
      player.setVolume(Number(e.target.value));
      if (Number(e.target.value) === 0) player.mute();
      else player.unMute();
    });
    document.getElementById('cfvpMute').addEventListener('click', () => {
      if (!player) return;
      const btn = document.getElementById('cfvpMute');
      if (player.isMuted()) {
        player.unMute();
        btn.textContent = '🔊';
      } else {
        player.mute();
        btn.textContent = '🔇';
      }
    });
    document.getElementById('cfvpFullscreen').addEventListener('click', () => {
      const stage = document.getElementById('cfvpStage').closest('.cfvp-frame');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (stage.requestFullscreen) stage.requestFullscreen();
    });

    return { label: `${clip.creator} — ${clip.title}` };
  }

  return { mount };
})();
