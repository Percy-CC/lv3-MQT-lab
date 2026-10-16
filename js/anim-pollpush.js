(function() {
  const canvas = document.getElementById('cvPollPush');
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  let running = false;
  let simTime = 0;
  let lastFrame = 0;
  let serverEvents = [];
  let nextEventIdx = 0;
  let pollReqs = 0, pollHits = 0, pollMisses = 0;
  let pollLastData = null;
  let pollArrows = [];
  let pollInterval = 3;
  let lastPollTime = 0;
  let pushNotifs = 0;
  let pushArrows = [];
  let pushDelays = [];
  const serverX = 0.5;

  function resize() {
    const r = resizeCanvas(canvas);
    W = r.w; H = r.h; DPR = r.dpr;
  }

  function resetSim() {
    running = false;
    simTime = 0;
    lastFrame = 0;
    serverEvents = [];
    nextEventIdx = 0;
    pollReqs = 0; pollHits = 0; pollMisses = 0;
    pollLastData = null; pollArrows = [];
    lastPollTime = -pollInterval;
    pushNotifs = 0; pushArrows = []; pushDelays = [];
    updateStats();
    document.getElementById('ppLogPoll').innerHTML = '';
    document.getElementById('ppLogPush').innerHTML = '';
    document.getElementById('btnStartSim').disabled = false;
    document.getElementById('btnStopSim').disabled = true;
  }

  function generateEvents() {
    const times = [];
    for (let i = 0; i < 5; i++) {
      times.push(3 + Math.random() * 25);
    }
    times.sort((a, b) => a - b);
    serverEvents = times.map((t, i) => ({ time: t, data: '公告 #' + (i + 1), triggered: false }));
  }

  function updateStats() {
    document.getElementById('ppReq').textContent = pollReqs;
    document.getElementById('ppHit').textContent = pollHits;
    document.getElementById('ppMiss').textContent = pollMisses;
    document.getElementById('ppWaste').textContent = pollReqs > 0 ? Math.round(pollMisses / pollReqs * 100) + '%' : '0%';
    document.getElementById('psConn').textContent = running ? '1' : '0';
    document.getElementById('psPush').textContent = pushNotifs;
    document.getElementById('psExtra').textContent = '0';
    document.getElementById('psDelay').textContent = pushDelays.length > 0
      ? Math.round(pushDelays.reduce((a, b) => a + b, 0) / pushDelays.length) + 'ms'
      : '0ms';
  }

  function addLog(id, text, cls) {
    const box = document.getElementById(id);
    const d = document.createElement('div');
    d.className = 'log-entry ' + (cls || '');
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  function drawArrow(x1, y1, x2, y2, progress, color, isReturn, hasData) {
    const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const cx = x1 + (x2 - x1) * ease;
    const cy = y1 + (y2 - y1) * ease;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * DPR;
    ctx.beginPath();
    ctx.arc(cx, cy, (isReturn ? 5 : 4) * DPR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (isReturn && hasData) {
      ctx.font = `600 ${9 * DPR}px ${getCSS('--font-mono')}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText('DATA', cx, cy - 10 * DPR);
    } else if (isReturn && !hasData) {
      ctx.font = `600 ${9 * DPR}px ${getCSS('--font-mono')}`;
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('空', cx, cy - 10 * DPR);
    }
    ctx.restore();
  }

  function draw(ts) {
    if (!lastFrame) lastFrame = ts;
    const dt = (ts - lastFrame) / 1000;
    lastFrame = ts;

    if (running) {
      simTime += dt;
      if (simTime >= 30) {
        running = false;
        document.getElementById('btnStartSim').disabled = false;
        document.getElementById('btnStopSim').disabled = true;
        addLog('ppLogPoll', `[${simTime.toFixed(1)}s] ── 模擬結束 ──`, 'info');
        addLog('ppLogPush', `[${simTime.toFixed(1)}s] ── 模擬結束 ──`, 'info');
      }

      for (let i = nextEventIdx; i < serverEvents.length; i++) {
        if (simTime >= serverEvents[i].time && !serverEvents[i].triggered) {
          serverEvents[i].triggered = true;
          nextEventIdx = i + 1;
          pushNotifs++;
          pushDelays.push(50 + Math.random() * 100);
          pushArrows.push({
            t: 0, data: serverEvents[i].data,
            startTime: simTime
          });
          addLog('ppLogPush', `[${simTime.toFixed(1)}s] 即時收到: ${serverEvents[i].data}`, 'push');
        }
      }

      if (simTime - lastPollTime >= pollInterval) {
        lastPollTime = simTime;
        pollReqs++;
        const latestEvent = serverEvents.filter(e => e.triggered).pop();
        const currentData = latestEvent ? latestEvent.data : null;
        if (currentData && currentData !== pollLastData) {
          pollHits++;
          pollLastData = currentData;
          pollArrows.push({ t: 0, hit: true, data: currentData, startTime: simTime });
          addLog('ppLogPoll', `[${simTime.toFixed(1)}s] GET → 有新資料: ${currentData}`, 'hit');
        } else {
          pollMisses++;
          pollArrows.push({ t: 0, hit: false, startTime: simTime });
          addLog('ppLogPoll', `[${simTime.toFixed(1)}s] GET → 沒有變化（白問）`, 'miss');
        }
      }

      updateStats();
    }

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    const g = 30 * DPR;
    for (let x = 0; x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    ctx.save();
    ctx.setLineDash([4 * DPR, 4 * DPR]);
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `700 ${14 * DPR}px ${getCSS('--font-mono')}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('POLL 模式', W * 0.25, 28 * DPR);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('PUSH 模式', W * 0.75, 28 * DPR);
    ctx.restore();

    const pollClientX = W * 0.1;
    const pollServerX = W * 0.4;
    const pollY = H * 0.5;
    const nr = 22 * DPR;
    drawSimpleNode(pollClientX, pollY, nr, '#f59e0b', 'Client', '\uf108');
    drawSimpleNode(pollServerX, pollY, nr, '#8b5cf6', 'Server', '\uf233');

    for (let i = pollArrows.length - 1; i >= 0; i--) {
      const a = pollArrows[i];
      a.t += dt * 0.8;
      if (a.t >= 2) { pollArrows.splice(i, 1); continue; }
      if (a.t < 1) {
        drawArrow(pollClientX, pollY, pollServerX, pollY, a.t, '#f59e0b', false, false);
      } else {
        drawArrow(pollServerX, pollY, pollClientX, pollY, a.t - 1, a.hit ? '#10b981' : '#ef4444', true, a.hit);
      }
    }

    const pushClientX = W * 0.9;
    const pushServerX = W * 0.6;
    const pushY = H * 0.5;
    drawSimpleNode(pushClientX, pushY, nr, '#10b981', 'Client', '\uf108');
    drawSimpleNode(pushServerX, pushY, nr, '#00e5ff', 'Broker', '\uf6ff');

    ctx.save();
    ctx.setLineDash([3 * DPR, 3 * DPR]);
    ctx.strokeStyle = '#00e5ff44';
    ctx.lineWidth = 2 * DPR;
    ctx.beginPath();
    ctx.moveTo(pushServerX, pushY);
    ctx.lineTo(pushClientX, pushY);
    ctx.stroke();
    ctx.font = `500 ${9 * DPR}px ${getCSS('--font-mono')}`;
    ctx.fillStyle = '#00e5ff88';
    ctx.textAlign = 'center';
    ctx.fillText('持續連線', (pushServerX + pushClientX) / 2, pushY - 30 * DPR);
    ctx.restore();

    for (let i = pushArrows.length - 1; i >= 0; i--) {
      const a = pushArrows[i];
      a.t += dt * 1.2;
      if (a.t >= 1) { pushArrows.splice(i, 1); continue; }
      drawArrow(pushServerX, pushY, pushClientX, pushY, a.t, '#00e5ff', true, true);
    }

    if (running) {
      ctx.save();
      ctx.font = `600 ${12 * DPR}px ${getCSS('--font-mono')}`;
      ctx.fillStyle = isDark() ? '#94a3b8' : '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(`⏱ ${simTime.toFixed(1)}s / 30s`, W / 2, H - 16 * DPR);
      ctx.restore();
    }

    const evY = H * 0.15;
    ctx.save();
    ctx.font = `500 ${10 * DPR}px ${getCSS('--font-mono')}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark() ? '#64748b' : '#94a3b8';
    ctx.fillText('伺服器事件時間軸', W / 2, evY - 10 * DPR);
    const barX = W * 0.15, barW = W * 0.7;
    ctx.fillStyle = isDark() ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(barX, evY, barW, 6 * DPR);
    if (running) {
      ctx.fillStyle = '#00e5ff44';
      ctx.fillRect(barX, evY, barW * (simTime / 30), 6 * DPR);
    }
    serverEvents.forEach(ev => {
      const ex = barX + barW * (ev.time / 30);
      ctx.beginPath();
      ctx.arc(ex, evY + 3 * DPR, 5 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = ev.triggered ? '#f59e0b' : (isDark() ? '#475569' : '#cbd5e1');
      ctx.fill();
    });
    ctx.restore();

    requestAnimationFrame(draw);
  }

  function drawSimpleNode(x, y, r, color, label, icon) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color + 'bb');
    grad.addColorStop(1, color + '33');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * DPR;
    ctx.stroke();
    ctx.fillStyle = isDark() ? '#fff' : '#1a1a2e';
    ctx.font = `900 ${12 * DPR}px "Font Awesome 6 Free"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
    ctx.font = `600 ${10 * DPR}px ${getCSS('--font-mono')}`;
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.fillText(label, x, y + r + 14 * DPR);
    ctx.restore();
  }

  document.getElementById('btnStartSim').addEventListener('click', () => {
    resetSim();
    generateEvents();
    running = true;
    document.getElementById('btnStartSim').disabled = true;
    document.getElementById('btnStopSim').disabled = false;
    addLog('ppLogPoll', `[0.0s] 開始 Poll（每 ${pollInterval} 秒詢問一次）`, 'info');
    addLog('ppLogPush', '[0.0s] 已連線 Broker，等待推送...', 'info');
  });
  document.getElementById('btnStopSim').addEventListener('click', () => {
    running = false;
    document.getElementById('btnStartSim').disabled = false;
    document.getElementById('btnStopSim').disabled = true;
  });
  document.getElementById('btnResetSim').addEventListener('click', resetSim);

  window.addEventListener('resize', () => resize());
  resize();
  requestAnimationFrame(draw);
})();
