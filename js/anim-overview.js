(function() {
  const canvas = document.getElementById('cvOverview');
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  const particles = [];
  let subscribers = [
    { label: 'Sub A', angle: -0.4 },
    { label: 'Sub B', angle: 0 },
    { label: 'Sub C', angle: 0.4 }
  ];
  let subIdCounter = 3;
  const pubPos = { xRatio: 0.13, yRatio: 0.5 };
  const brokerPos = { xRatio: 0.48, yRatio: 0.5 };
  const subBaseX = 0.83;
  let pulsePhase = 0;
  let brokerGlow = 0;

  function subPositions() {
    const total = subscribers.length;
    const spacing = Math.min(0.18, 0.7 / Math.max(total, 1));
    const startY = 0.5 - (total - 1) * spacing / 2;
    return subscribers.map((s, i) => ({
      ...s,
      xRatio: subBaseX,
      yRatio: startY + i * spacing
    }));
  }

  function resize() {
    const r = resizeCanvas(canvas);
    W = r.w; H = r.h; DPR = r.dpr;
  }

  function drawNode(x, y, radius, color, label, icon, glowAmt) {
    ctx.save();
    if (glowAmt > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 * glowAmt;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, color + 'cc');
    grad.addColorStop(1, color + '44');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * DPR;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = isDark() ? '#fff' : '#1a1a2e';
    ctx.font = `900 ${14 * DPR}px "Font Awesome 6 Free"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
    ctx.font = `600 ${11 * DPR}px ${getCSS('--font-mono')}`;
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + radius + 16 * DPR);
    ctx.restore();
  }

  function drawDashedLine(x1, y1, x2, y2, color) {
    ctx.save();
    ctx.setLineDash([6 * DPR, 4 * DPR]);
    ctx.strokeStyle = color + '44';
    ctx.lineWidth = 1.5 * DPR;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function addParticle() {
    const px = pubPos.xRatio * W;
    const py = pubPos.yRatio * H;
    const bx = brokerPos.xRatio * W;
    const by = brokerPos.yRatio * H;
    particles.push({
      phase: 'to-broker', t: 0,
      sx: px, sy: py, ex: bx, ey: by,
      color: '#7c3aed', size: 6 * DPR
    });
    brokerGlow = 0;
  }

  function spawnToSubs() {
    const bx = brokerPos.xRatio * W;
    const by = brokerPos.yRatio * H;
    const subs = subPositions();
    subs.forEach((s, i) => {
      setTimeout(() => {
        particles.push({
          phase: 'to-sub', t: 0,
          sx: bx, sy: by,
          ex: s.xRatio * W, ey: s.yRatio * H,
          color: '#10b981', size: 5 * DPR
        });
      }, i * 80);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 30 * DPR;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    const px = pubPos.xRatio * W, py = pubPos.yRatio * H;
    const bx = brokerPos.xRatio * W, by = brokerPos.yRatio * H;
    const subs = subPositions();
    const nodeR = 28 * DPR;
    drawDashedLine(px, py, bx, by, '#f59e0b');
    subs.forEach(s => drawDashedLine(bx, by, s.xRatio * W, s.yRatio * H, '#10b981'));
    drawNode(px, py, nodeR, '#f59e0b', 'Publisher', '\uf1d8', 0);
    drawNode(bx, by, nodeR * 1.2, '#00e5ff', 'Broker', '\uf6ff', brokerGlow);
    subs.forEach(s => drawNode(s.xRatio * W, s.yRatio * H, nodeR * 0.9, '#10b981', s.label, '\uf007', 0));

    ctx.save();
    ctx.font = `500 ${11 * DPR}px ${getCSS('--font-mono')}`;
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    const midX = (px + bx) / 2;
    const midY = (py + by) / 2 - 14 * DPR;
    ctx.fillText('topic: cc-lab/3A/g1/news', midX, midY);
    ctx.restore();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += 0.018;
      if (p.t >= 1) {
        if (p.phase === 'to-broker') {
          brokerGlow = 1;
          spawnToSubs();
          particles.splice(i, 1);
        } else {
          particles.splice(i, 1);
        }
        continue;
      }
      const ease = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
      const cx = p.sx + (p.ex - p.sx) * ease;
      const cy = p.sy + (p.ey - p.sy) * ease;
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14 * DPR;
      ctx.beginPath();
      ctx.arc(cx, cy, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      const trailEase = Math.max(0, ease - 0.06);
      const tx = p.sx + (p.ex - p.sx) * trailEase;
      const ty = p.sy + (p.ey - p.sy) * trailEase;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(tx, ty, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (brokerGlow > 0) brokerGlow = Math.max(0, brokerGlow - 0.015);
    pulsePhase += 0.02;
    requestAnimationFrame(draw);
  }

  document.getElementById('btnSendMsg').addEventListener('click', addParticle);
  document.getElementById('btnAddSub').addEventListener('click', () => {
    subIdCounter++;
    const letters = 'DEFGHIJKLMNOPQRSTUVWXYZ';
    subscribers.push({ label: 'Sub ' + (letters[subIdCounter - 4] || subIdCounter), angle: 0 });
  });
  document.getElementById('btnResetOverview').addEventListener('click', () => {
    particles.length = 0;
    subscribers = [
      { label: 'Sub A', angle: -0.4 },
      { label: 'Sub B', angle: 0 },
      { label: 'Sub C', angle: 0.4 }
    ];
    subIdCounter = 3;
    brokerGlow = 0;
  });

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
