(function() {
  const canvas = document.getElementById('cvQueueCompare');
  const ctx = canvas.getContext('2d');
  const modeTopic = document.getElementById('btnModeTopic');
  const modeQueue = document.getElementById('btnModeQueue');
  const workerStats = document.getElementById('qWorkerStats');
  const log = document.getElementById('qCompareLog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let W, H, DPR;
  let mode = 'topic';
  let workerCount = 3;
  let orderCount = 0;
  let handledCount = 0;
  let nextWorker = 0;
  let workers = [];
  let queue = [];
  let particles = [];
  let lastTs = 0;

  function resize() {
    const size = resizeCanvas(canvas);
    W = size.w;
    H = size.h;
    DPR = size.dpr;
  }

  function createWorkers() {
    workers = Array.from({ length: workerCount }, (_, index) => ({
      name: String.fromCharCode(65 + index),
      received: 0,
      busyUntil: 0,
      order: null
    }));
  }

  function renderStats() {
    document.getElementById('qOrderTotal').textContent = orderCount;
    document.getElementById('qHandledTotal').textContent = handledCount;
    workerStats.textContent = '';
    workers.forEach(worker => {
      const stat = document.createElement('div');
      stat.className = 'stat-box q-worker-stat';
      const value = document.createElement('div');
      value.className = 'num';
      value.textContent = worker.received;
      const label = document.createElement('div');
      label.className = 'lbl';
      label.textContent = `職員 ${worker.name} 收到次數`;
      stat.append(value, label);
      workerStats.appendChild(stat);
    });
    document.getElementById('btnAddWorker').disabled = workerCount >= 5;
    document.getElementById('btnRemoveWorker').disabled = workerCount <= 2;
  }

  function addLog(text, kind) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${kind}`;
    entry.textContent = text;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  function reset(message) {
    orderCount = 0;
    handledCount = 0;
    nextWorker = 0;
    queue = [];
    particles = [];
    createWorkers();
    log.textContent = '';
    renderStats();
    if (message) addLog(message, 'info');
  }

  function updateModeButtons() {
    const topicSelected = mode === 'topic';
    modeTopic.className = `btn ${topicSelected ? 'btn-cyan' : 'btn-ghost'}`;
    modeQueue.className = `btn ${topicSelected ? 'btn-ghost' : 'btn-cyan'}`;
    modeTopic.setAttribute('aria-pressed', String(topicSelected));
    modeQueue.setAttribute('aria-pressed', String(!topicSelected));
    document.getElementById('qCompareHint').textContent = topicSelected
      ? 'Topic：收到次數 = 訂單數 × 訂閱者數'
      : 'Queue：收到次數合計 = 訂單數';
  }

  function selectMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    updateModeButtons();
    reset(`已切換至 ${mode === 'topic' ? 'Topic' : 'Queue'} 模式，統計已重置。`);
  }

  function addParticle(workerIndex, order, fromQueue) {
    if (reducedMotion.matches) return;
    const y = (workerIndex + 1) / (workers.length + 1);
    particles.push({
      x: W * (fromQueue ? 0.68 : 0.47),
      y: H * 0.5,
      targetX: W * 0.83,
      targetY: H * y,
      order,
      progress: 0,
      duration: fromQueue ? 0.45 : 0.55
    });
  }

  function dispatchQueue(now) {
    if (mode !== 'queue') return;
    let changed = false;
    workers.forEach(worker => {
      if (worker.busyUntil <= now) {
        if (worker.busyUntil > 0) changed = true;
        worker.busyUntil = 0;
        worker.order = null;
      }
    });
    while (queue.length) {
      let selected = -1;
      for (let offset = 0; offset < workerCount; offset++) {
        const index = (nextWorker + offset) % workerCount;
        if (workers[index].busyUntil === 0) {
          selected = index;
          break;
        }
      }
      if (selected < 0) break;
      const worker = workers[selected];
      const order = queue.shift();
      worker.received++;
      worker.order = order;
      worker.busyUntil = now + 1500;
      handledCount++;
      changed = true;
      nextWorker = (selected + 1) % workerCount;
      addParticle(selected, order, true);
      addLog(`訂單 ${order} 已交給職員 ${worker.name}，並從隊列移除。`, 'hit');
    }
    if (changed) renderStats();
  }

  function sendOrder() {
    orderCount++;
    if (mode === 'topic') {
      workers.forEach((worker, index) => {
        worker.received++;
        addParticle(index, orderCount, false);
      });
      handledCount += workerCount;
      addLog(`訂單 ${orderCount} 已由 Broker 複製並送給全部 ${workerCount} 位職員。`, 'push');
    } else {
      queue.push(orderCount);
      addLog(`訂單 ${orderCount} 已加入 Broker 的隊列。`, 'info');
      dispatchQueue(performance.now());
    }
    renderStats();
  }

  function drawNode(x, y, radius, color, label, detail) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `${color}24`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * DPR;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${11 * DPR}px ${getCSS('--font-mono')}`;
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.fillText(label, x, y);
    ctx.font = `${9 * DPR}px ${getCSS('--font-sans')}`;
    ctx.fillStyle = isDark() ? '#94a3b8' : '#526174';
    ctx.fillText(detail, x, y + radius + 13 * DPR);
    ctx.restore();
  }

  function draw(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    dispatchQueue(performance.now());

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    const grid = 30 * DPR;
    for (let x = 0; x < W; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    const publisher = getCSS('--publisher-color');
    const broker = getCSS('--broker-color');
    const subscriber = getCSS('--subscriber-color');
    const accent2 = getCSS('--accent2');
    const radius = 23 * DPR;
    ctx.save();
    ctx.setLineDash([5 * DPR, 5 * DPR]);
    ctx.strokeStyle = `${broker}80`;
    ctx.lineWidth = 1.5 * DPR;
    ctx.beginPath(); ctx.moveTo(W * 0.16, H * 0.5); ctx.lineTo(W * 0.4, H * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.5); ctx.lineTo(W * 0.8, H * 0.5); ctx.stroke();
    ctx.restore();

    drawNode(W * 0.12, H * 0.5, radius, publisher, 'Publisher', '發送訂單');
    drawNode(W * 0.44, H * 0.5, radius * 1.15, broker, 'Broker', mode === 'topic' ? '複製訊息' : '管理隊列');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `600 ${10 * DPR}px ${getCSS('--font-mono')}`;
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.fillText(mode === 'topic' ? 'Topic：所有訂閱者收到' : 'Queue：等待派發', W * 0.68, H * 0.13);
    ctx.restore();

    if (mode === 'queue') {
      const slots = Math.min(queue.length, 6);
      for (let index = 0; index < slots; index++) {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = W * (0.56 + col * 0.07);
        const y = H * (0.38 + row * 0.2);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x - 15 * DPR, y - 11 * DPR, 30 * DPR, 22 * DPR, 4 * DPR);
        ctx.fillStyle = `${accent2}30`;
        ctx.fill();
        ctx.strokeStyle = accent2;
        ctx.lineWidth = 1.5 * DPR;
        ctx.stroke();
        ctx.font = `600 ${8 * DPR}px ${getCSS('--font-mono')}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
        ctx.fillText(`#${queue[index]}`, x, y);
        ctx.restore();
      }
      if (queue.length > slots) {
        ctx.save();
        ctx.font = `${9 * DPR}px ${getCSS('--font-mono')}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
        ctx.fillText(`+${queue.length - slots}`, W * 0.68, H * 0.73);
        ctx.restore();
      }
    }

    workers.forEach((worker, index) => {
      const y = H * ((index + 1) / (workers.length + 1));
      const busy = mode === 'queue' && worker.busyUntil > performance.now();
      drawNode(W * 0.84, y, 17 * DPR, subscriber, `職員 ${worker.name}`, busy ? `處理 #${worker.order}` : `收到 ${worker.received} 次`);
    });

    particles = particles.filter(particle => {
      particle.progress += dt / particle.duration;
      if (particle.progress >= 1) return false;
      const ease = 1 - Math.pow(1 - particle.progress, 3);
      const x = particle.x + (particle.targetX - particle.x) * ease;
      const y = particle.y + (particle.targetY - particle.y) * ease;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 5 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = publisher;
      ctx.shadowColor = publisher;
      ctx.shadowBlur = 10 * DPR;
      ctx.fill();
      ctx.restore();
      return true;
    });

    requestAnimationFrame(draw);
  }

  document.getElementById('btnSendOrder').addEventListener('click', sendOrder);
  document.getElementById('btnAddWorker').addEventListener('click', () => {
    if (workerCount >= 5) return;
    workerCount++;
    workers.push({ name: String.fromCharCode(64 + workerCount), received: 0, busyUntil: 0, order: null });
    renderStats();
  });
  document.getElementById('btnRemoveWorker').addEventListener('click', () => {
    if (workerCount <= 2) return;
    workerCount--;
    workers.pop();
    nextWorker %= workerCount;
    renderStats();
  });
  document.getElementById('btnResetQueueCompare').addEventListener('click', () => reset('統計已重置。'));
  modeTopic.addEventListener('click', () => selectMode('topic'));
  modeQueue.addEventListener('click', () => selectMode('queue'));
  window.addEventListener('resize', resize);

  createWorkers();
  resize();
  renderStats();
  updateModeButtons();
  requestAnimationFrame(draw);
})();