(function() {
  const canvas = document.getElementById('cvRetained');
  const ctx2 = canvas.getContext('2d');
  const speedSelect = document.getElementById('retainedSpeed');
  let W, H, DPR;
  let animPhase = -1;
  let phaseTime = 0;
  let particles = [];
  let storedMsg = null;
  let subConnected = false;
  let lastTs = 0;
  let speed = 1;
  const timelineEl = document.getElementById('retainedTimeline');

  const steps = [
    { dur: 2.5, label: 'T=0s', text: 'Publisher 發布一則 Retained 訊息給 Broker', cls: 'pub' },
    { dur: 2, label: 'T=3s', text: 'Broker 保存 Retained 訊息（儲存在 Broker 內部）', cls: 'retain' },
    { dur: 2, label: 'T=5s', text: '一段時間後…新的 Subscriber 連線並訂閱該 Topic', cls: 'sub' },
    { dur: 2.5, label: 'T=7s', text: 'Broker 立刻將保留的訊息推送給新 Subscriber ✅', cls: 'sub' },
    { dur: 1.5, label: 'T=10s', text: '新 Subscriber 不會漏掉之前的訊息！', cls: 'retain' }
  ];

  function resize() {
    const r = resizeCanvas(canvas);
    W = r.w; H = r.h; DPR = r.dpr;
  }

  function resetRetained() {
    animPhase = -1;
    phaseTime = 0;
    particles = [];
    storedMsg = null;
    subConnected = false;
    lastTs = 0;
    timelineEl.innerHTML = '';
    document.getElementById('btnPlayRetained').disabled = false;
  }

  function showTimelineStep(idx) {
    const s = steps[idx];
    const ev = document.createElement('div');
    ev.className = 'timeline-event ' + s.cls;
    ev.innerHTML = `<div class="ev-time">${s.label}</div><div class="ev-text">${s.text}</div>`;
    timelineEl.appendChild(ev);
    requestAnimationFrame(() => ev.classList.add('visible'));
  }

  function drawRetained(ts) {
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000 * speed;
    lastTs = ts;

    if (animPhase >= 0 && animPhase < steps.length) {
      phaseTime += dt;
      if (phaseTime >= steps[animPhase].dur) {
        phaseTime = 0;
        animPhase++;
        if (animPhase < steps.length) {
          showTimelineStep(animPhase);
          triggerPhase(animPhase);
        }
      }
    }

    ctx2.clearRect(0, 0, W, H);
    ctx2.save();
    ctx2.strokeStyle = isDark() ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
    ctx2.lineWidth = 1;
    const g = 30 * DPR;
    for (let x = 0; x < W; x += g) { ctx2.beginPath(); ctx2.moveTo(x, 0); ctx2.lineTo(x, H); ctx2.stroke(); }
    for (let y = 0; y < H; y += g) { ctx2.beginPath(); ctx2.moveTo(0, y); ctx2.lineTo(W, y); ctx2.stroke(); }
    ctx2.restore();

    const pubX = W * 0.15, pubY = H * 0.5;
    const brkX = W * 0.5, brkY = H * 0.5;
    const subX = W * 0.85, subY = H * 0.5;
    const nr = 24 * DPR;
    ctx2.save();
    ctx2.setLineDash([4 * DPR, 4 * DPR]);
    ctx2.strokeStyle = '#f59e0b44';
    ctx2.lineWidth = 1.5 * DPR;
    ctx2.beginPath(); ctx2.moveTo(pubX, pubY); ctx2.lineTo(brkX, brkY); ctx2.stroke();
    if (subConnected) {
      ctx2.strokeStyle = '#10b98144';
      ctx2.beginPath(); ctx2.moveTo(brkX, brkY); ctx2.lineTo(subX, subY); ctx2.stroke();
    }
    ctx2.restore();

    drawRetNode(pubX, pubY, nr, '#f59e0b', 'Publisher', '\uf1d8');
    drawRetNode(brkX, brkY, nr * 1.15, '#00e5ff', 'Broker', '\uf6ff');

    if (storedMsg) {
      ctx2.save();
      const boxW = 100 * DPR, boxH = 30 * DPR;
      const bx = brkX - boxW / 2, by = brkY - nr * 1.15 - boxH - 14 * DPR;
      ctx2.fillStyle = isDark() ? '#7c3aed33' : '#7c3aed22';
      ctx2.strokeStyle = '#7c3aed';
      ctx2.lineWidth = 1.5 * DPR;
      ctx2.beginPath();
      ctx2.roundRect(bx, by, boxW, boxH, 6 * DPR);
      ctx2.fill();
      ctx2.stroke();
      ctx2.font = `600 ${10 * DPR}px ${getCSS('--font-mono')}`;
      ctx2.fillStyle = '#c4b5fd';
      ctx2.textAlign = 'center';
      ctx2.textBaseline = 'middle';
      ctx2.fillText('📦 Retained', brkX, by + boxH / 2);
      ctx2.restore();
    }

    if (animPhase >= 2) {
      const opacity = subConnected ? 1 : Math.min(1, phaseTime * 2);
      ctx2.save();
      ctx2.globalAlpha = opacity;
      drawRetNode(subX, subY, nr, '#10b981', '新 Subscriber', '\uf007');
      ctx2.restore();
    } else {
      ctx2.save();
      ctx2.globalAlpha = 0.15;
      drawRetNode(subX, subY, nr, '#10b981', '（尚未連線）', '\uf007');
      ctx2.restore();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt * 0.7;
      if (p.t >= 1) { particles.splice(i, 1); if (p.onDone) p.onDone(); continue; }
      const ease = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
      const cx = p.sx + (p.ex - p.sx) * ease;
      const cy = p.sy + (p.ey - p.sy) * ease;
      ctx2.save();
      ctx2.shadowColor = p.color;
      ctx2.shadowBlur = 12 * DPR;
      ctx2.beginPath();
      ctx2.arc(cx, cy, 6 * DPR, 0, Math.PI * 2);
      ctx2.fillStyle = p.color;
      ctx2.fill();
      ctx2.restore();
    }

    requestAnimationFrame(drawRetained);
  }

  function drawRetNode(x, y, r, color, label, icon) {
    ctx2.save();
    ctx2.beginPath();
    ctx2.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx2.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color + 'bb');
    grad.addColorStop(1, color + '33');
    ctx2.fillStyle = grad;
    ctx2.fill();
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 2 * DPR;
    ctx2.stroke();
    ctx2.fillStyle = isDark() ? '#fff' : '#1a1a2e';
    ctx2.font = `900 ${12 * DPR}px "Font Awesome 6 Free"`;
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(icon, x, y);
    ctx2.font = `600 ${10 * DPR}px ${getCSS('--font-mono')}`;
    ctx2.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx2.fillText(label, x, y + r + 14 * DPR);
    ctx2.restore();
  }

  function triggerPhase(idx) {
    const pubX = W * 0.15, pubY = H * 0.5;
    const brkX = W * 0.5, brkY = H * 0.5;
    const subX = W * 0.85, subY = H * 0.5;

    if (idx === 0) {
      particles.push({
        t: 0, sx: pubX, sy: pubY, ex: brkX, ey: brkY,
        color: '#7c3aed',
        onDone: () => { storedMsg = true; }
      });
    } else if (idx === 2) {
      subConnected = true;
    } else if (idx === 3) {
      particles.push({
        t: 0, sx: brkX, sy: brkY, ex: subX, ey: subY,
        color: '#10b981',
        onDone: () => {}
      });
    }
  }

  document.getElementById('btnPlayRetained').addEventListener('click', () => {
    resetRetained();
    animPhase = 0;
    phaseTime = 0;
    document.getElementById('btnPlayRetained').disabled = true;
    showTimelineStep(0);
    triggerPhase(0);
  });
  document.getElementById('btnResetRetained').addEventListener('click', resetRetained);
  speedSelect.addEventListener('change', () => {
    speed = Number(speedSelect.value);
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(drawRetained);
})();
