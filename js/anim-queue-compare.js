(function() {
  const canvas = document.getElementById('cvQueueCompare');
  const ctx = canvas.getContext('2d');
  const workerStats = document.getElementById('qWorkerStats');
  const topicTable = document.getElementById('qTopicMatrix');
  const queueTable = document.getElementById('qQueueMatrix');
  const status = document.getElementById('qCompareStatus');
  const pauseButton = document.getElementById('btnPauseCompare');
  const speedSelect = document.getElementById('compareSpeed');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const orderColors = ['#ef4444', '#2563eb', '#f59e0b', '#10b981', '#a855f7', '#ec4899'];
  let W, H, DPR;
  let workerCount = 3;
  let orderCount = 0;
  let handledCount = 0;
  let nextWorker = 0;
  let orders = [];
  let workers = [];
  let queue = [];
  let particles = [];
  let simTime = 0;
  let topicFlashUntil = 0;
  let speed = 1;
  let paused = false;
  let lastTs = 0;

  function resize() {
    const compact = canvas.parentElement.getBoundingClientRect().width < 620;
    canvas.width = 1000;
    canvas.height = compact ? 2000 : 600;
    const size = resizeCanvas(canvas);
    W = size.w / size.dpr;
    H = size.h / size.dpr;
    DPR = size.dpr;
  }

  function createWorkers() {
    workers = Array.from({ length: workerCount }, (_, index) => ({
      name: String.fromCharCode(65 + index),
      topicOrders: [],
      queueOrders: [],
      busyUntil: 0,
      busyOrder: null
    }));
  }

  function addLog(text, kind) {
    const log = document.getElementById('qCompareLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${kind}`;
    entry.textContent = text;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  function renderStats() {
    document.getElementById('qOrderTotal').textContent = String(orderCount);
    document.getElementById('qHandledTotal').textContent = String(handledCount);
    document.getElementById('qTopicReceiptTotal').textContent = String(orderCount * workerCount);
    document.getElementById('qQueueReceiptTotal').textContent = String(orderCount);
    workerStats.textContent = '';
    workers.forEach(worker => {
      const stat = document.createElement('div');
      stat.className = 'stat-box q-worker-stat';
      const value = document.createElement('div');
      value.className = 'num';
      value.textContent = `${worker.topicOrders.length} / ${worker.queueOrders.length}`;
      const label = document.createElement('div');
      label.className = 'lbl';
      label.textContent = `職員 ${worker.name}：Topic / Queue`;
      stat.append(value, label);
      workerStats.appendChild(stat);
    });
    document.getElementById('btnAddWorker').disabled = workerCount >= 5;
    document.getElementById('btnRemoveWorker').disabled = workerCount <= 2;
  }

  function renderMatrix(table, topic) {
    const head = table.tHead.rows[0];
    const body = table.tBodies[0];
    head.textContent = '';
    body.textContent = '';
    const orderHeader = document.createElement('th');
    orderHeader.scope = 'col';
    orderHeader.textContent = '訂單';
    head.appendChild(orderHeader);
    workers.forEach(worker => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = `職員 ${worker.name}`;
      head.appendChild(th);
    });

    orders.forEach(order => {
      const row = document.createElement('tr');
      const orderCell = document.createElement('th');
      orderCell.scope = 'row';
      orderCell.textContent = `#${order.id}`;
      row.appendChild(orderCell);
      workers.forEach(worker => {
        const cell = document.createElement('td');
        const received = topic
          ? worker.topicOrders.includes(order.id)
          : worker.queueOrders.includes(order.id);
        cell.textContent = received ? '✓' : '—';
        cell.setAttribute('aria-label', received
          ? `訂單 #${order.id}：職員 ${worker.name} 已收到`
          : `訂單 #${order.id}：職員 ${worker.name} 未收到`);
        if (received) cell.className = 'q-received';
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderAll() {
    renderStats();
    renderMatrix(topicTable, true);
    renderMatrix(queueTable, false);
  }

  function reset(message) {
    orderCount = 0;
    handledCount = 0;
    nextWorker = 0;
    simTime = 0;
    topicFlashUntil = 0;
    queue = [];
    orders = [];
    particles = [];
    workers.forEach(worker => {
      worker.topicOrders = [];
      worker.queueOrders = [];
      worker.busyUntil = 0;
      worker.busyOrder = null;
    });
    document.getElementById('qCompareLog').textContent = '';
    renderAll();
    if (message) {
      status.textContent = message;
      addLog(message, 'info');
    } else {
      status.textContent = '準備好後按「發送訂單」開始對照。';
    }
  }

  function trackCenter(topic) {
    return H * (topic ? 0.3 : 0.77);
  }

  function brokerX() {
    return W * (W < 620 ? 0.27 : 0.34);
  }

  function workerPosition(index, topic) {
    const compact = W < 620;
    const top = H * (topic ? (compact ? 0.17 : 0.15) : (compact ? 0.62 : 0.62));
    const bottom = H * (topic ? (compact ? 0.44 : 0.45) : (compact ? 0.9 : 0.92));
    return {
      x: compact ? W * 0.54 : W * 0.65,
      y: workers.length === 1 ? (top + bottom) / 2 : top + (bottom - top) * index / (workers.length - 1)
    };
  }

  function addParticle(order, from, to, kind, workerIndex, topic) {
    if (reducedMotion.matches) return;
    particles.push({
      id: order.id,
      color: order.color,
      x: from.x,
      y: from.y,
      targetX: to.x,
      targetY: to.y,
      kind,
      workerIndex,
      topic,
      progress: 0,
      duration: kind === 'arrival' ? 0.35 : 0.55
    });
  }

  function completeParticle(particle) {
    if (particle.kind !== 'arrival' || !particle.topic) return;
    topicFlashUntil = simTime + 0.3;
    const order = orders.find(item => item.id === particle.id);
    if (!order) return;
    workers.forEach((_, index) => {
      const from = { x: brokerX(), y: trackCenter(true) };
      addParticle(order, from, workerPosition(index, true), 'delivery', index, true);
    });
  }

  function findAvailableWorker() {
    for (let offset = 0; offset < workerCount; offset++) {
      const index = (nextWorker + offset) % workerCount;
      if (workers[index].busyUntil <= simTime) return index;
    }
    return -1;
  }

  function dispatchQueue() {
    if (paused) return;
    let changed = false;
    workers.forEach(worker => {
      if (worker.busyUntil > 0 && worker.busyUntil <= simTime) {
        worker.busyUntil = 0;
        worker.busyOrder = null;
        changed = true;
      }
    });
    while (queue.length && queue[0].readyAt <= simTime) {
      const workerIndex = findAvailableWorker();
      if (workerIndex < 0) break;
      const order = queue.shift();
      const worker = workers[workerIndex];
      worker.queueOrders.push(order.id);
      worker.busyOrder = order.id;
      worker.busyUntil = simTime + 1.5;
      handledCount++;
      nextWorker = (workerIndex + 1) % workerCount;
      const broker = { x: brokerX(), y: trackCenter(false) };
      addParticle(order, broker, workerPosition(workerIndex, false), 'delivery', workerIndex, false);
      addLog(`#${order.id} 已派給職員 ${worker.name}；職員正處理 1.5 秒。`, 'hit');
      changed = true;
    }
    if (changed) renderAll();
  }

  function sendOrder() {
    orderCount++;
    const order = { id: orderCount, color: orderColors[(orderCount - 1) % orderColors.length] };
    orders.push(order);
    workers.forEach(worker => worker.topicOrders.push(order.id));
    const publisher = { x: W * 0.1, y: H * 0.5 };
    addParticle(order, publisher, { x: brokerX(), y: trackCenter(true) }, 'arrival', null, true);
    addParticle(order, publisher, { x: brokerX(), y: trackCenter(false) }, 'arrival', null, false);
    queue.push({ ...order, readyAt: simTime + 0.8 });
    status.textContent = `已發送 #${order.id}：Topic 正複製給 ${workerCount} 位職員；Queue 會先排隊約 0.8 秒。`;
    addLog(`#${order.id} 同時送往 Topic 和 Queue；Topic 複製給全部 ${workerCount} 位職員。`, 'push');
    renderAll();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawNode(x, y, radius, color, label, detail, highlighted) {
    ctx.save();
    if (highlighted) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `${color}26`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = highlighted ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 14px ${getCSS('--font-mono')}`;
    ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
    ctx.fillText(label, x, y);
    ctx.font = `12px ${getCSS('--font-sans')}`;
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.fillText(detail, x, y + radius + 15);
    ctx.restore();
  }

  function drawTrackLabel(topic) {
    const y = H * (topic ? 0.075 : 0.535);
    const label = topic ? 'Topic（廣播）：每人都收到' : 'Queue（派單）：每張只給一人';
    ctx.save();
    ctx.font = '700 15px ' + getCSS('--font-sans');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = topic
      ? (isDark() ? getCSS('--accent') : '#0369a1')
      : (isDark() ? getCSS('--accent3') : '#92400e');
    ctx.fillText(label, 14, y);
    ctx.restore();
  }

  function drawQueueSlots() {
    const compact = W < 620;
    const visible = Math.min(queue.length, 6);
    const centerY = trackCenter(false);
    const step = compact ? 22 : 29;
    const startY = centerY - ((Math.max(visible, 1) - 1) * step) / 2;
    ctx.save();
    ctx.font = '700 13px ' + getCSS('--font-mono');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < visible; index++) {
      const order = queue[index];
      const x = W * (compact ? 0.43 : 0.42);
      const y = startY + index * step;
      roundRect(x - 24, y - 9, 48, 18, 4);
      ctx.fillStyle = `${order.color}28`;
      ctx.fill();
      ctx.strokeStyle = order.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
      ctx.fillText(`#${order.id}`, x, y + 0.5);
    }
    if (queue.length > visible) {
      const x = W * (compact ? 0.43 : 0.42);
      ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
      ctx.fillText(`+${queue.length - visible}`, x, startY + visible * step);
    } else if (queue.length === 0) {
      ctx.font = '12px ' + getCSS('--font-sans');
      ctx.fillStyle = isDark() ? '#94a3b8' : '#526174';
      ctx.fillText('隊列暫無訂單', W * (compact ? 0.43 : 0.42), centerY);
    }
    ctx.restore();
  }

  function drawInbox(worker, position, topic) {
    const ordersForWorker = topic ? worker.topicOrders : worker.queueOrders;
    const compact = W < 620;
    const left = position.x + (compact ? 60 : 62);
    const availableWidth = Math.max(48, W - left - 12);
    const shown = ordersForWorker.slice(0, 5);
    const cardHeight = compact ? 14 : 20;
    const columns = compact ? 2 : Math.max(1, Math.floor(availableWidth / 38));
    const cardWidth = Math.min(42, (availableWidth - (columns - 1) * 3) / columns);
    const rows = Math.ceil((shown.length + (ordersForWorker.length > 5 ? 1 : 0)) / columns);
    const top = position.y - (Math.max(rows, 1) * cardHeight) / 2;
    ctx.save();
    if (shown.length === 0) {
      ctx.font = '12px ' + getCSS('--font-sans');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark() ? '#94a3b8' : '#526174';
      ctx.fillText('收件匣空', left, position.y);
      ctx.restore();
      return;
    }
    shown.forEach((orderId, index) => {
      const order = orders.find(item => item.id === orderId);
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = left + col * (cardWidth + 3);
      const y = top + row * cardHeight;
      roundRect(x, y, cardWidth, compact ? 13 : 17, 3);
      ctx.fillStyle = order ? `${order.color}30` : 'rgba(148,163,184,0.2)';
      ctx.fill();
      ctx.strokeStyle = order ? order.color : getCSS('--border');
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '600 12px ' + getCSS('--font-mono');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
      ctx.fillText(`#${orderId}`, x + cardWidth / 2, y + (compact ? 7 : 9));
    });
    if (ordersForWorker.length > 5) {
      const extra = ordersForWorker.length - 5;
      const x = left + ((shown.length) % columns) * (cardWidth + 3);
      const y = top + Math.floor(shown.length / columns) * cardHeight;
      ctx.font = '700 12px ' + getCSS('--font-mono');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
      ctx.fillText(`+${extra}`, x, y + (compact ? 7 : 9));
    }
    ctx.restore();
  }

  function drawWorkers(topic) {
    workers.forEach((worker, index) => {
      const position = workerPosition(index, topic);
      const busy = !topic && worker.busyUntil > simTime;
      const color = getCSS('--subscriber-color') || '#10b981';
      ctx.save();
      ctx.beginPath();
      ctx.arc(position.x, position.y, W < 620 ? 15 : 19, 0, Math.PI * 2);
      ctx.fillStyle = busy ? `${getCSS('--accent3')}45` : `${color}26`;
      ctx.fill();
      ctx.strokeStyle = busy ? getCSS('--accent3') : color;
      ctx.lineWidth = busy ? 3 : 2;
      ctx.stroke();
      ctx.font = '700 14px ' + getCSS('--font-mono');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
      ctx.fillText(worker.name, position.x, position.y);
      const labelX = position.x + (W < 620 ? 21 : 25);
      ctx.textAlign = 'left';
      ctx.font = '600 13px ' + getCSS('--font-sans');
      ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
      ctx.fillText(`職員 ${worker.name}`, labelX, position.y - 6);
      ctx.font = '12px ' + getCSS('--font-sans');
      ctx.fillStyle = busy
        ? (isDark() ? getCSS('--accent3') : '#92400e')
        : (isDark() ? '#94a3b8' : '#526174');
      ctx.fillText(busy ? `處理中 #${worker.busyOrder}` : '收件匣', labelX, position.y + 10);
      ctx.restore();
      drawInbox(worker, position, topic);
    });
  }

  function drawParticle(particle) {
    const progress = Math.min(1, particle.progress);
    const ease = 1 - Math.pow(1 - progress, 3);
    const x = particle.x + (particle.targetX - particle.x) * ease;
    const y = particle.y + (particle.targetY - particle.y) * ease;
    ctx.save();
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    roundRect(x + 8, y - 11, 38, 22, 4);
    ctx.fillStyle = isDark() ? '#111827' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '700 12px ' + getCSS('--font-mono');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#f8fafc' : '#102033';
    ctx.fillText(`#${particle.id}`, x + 27, y);
    ctx.restore();
  }

  function draw(ts) {
    if (!lastTs) lastTs = ts;
    const elapsed = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    const dt = paused ? 0 : elapsed * speed;
    simTime += dt;

    if (reducedMotion.matches) {
      particles = [];
    } else {
      const completed = [];
      particles = particles.filter(particle => {
        particle.progress += dt / particle.duration;
        if (particle.progress >= 1) {
          completed.push(particle);
          return false;
        }
        return true;
      });
      completed.forEach(completeParticle);
    }
    dispatchQueue();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    drawTrackLabel(true);
    drawTrackLabel(false);
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `${getCSS('--broker-color')}99`;
    [true, false].forEach(topic => {
      const y = trackCenter(topic);
      ctx.beginPath();
      ctx.moveTo(W * 0.1 + 24, H * 0.5);
      ctx.lineTo(brokerX() - 24, y);
      ctx.stroke();
      workers.forEach((_, index) => {
        const worker = workerPosition(index, topic);
        ctx.beginPath();
        ctx.moveTo(brokerX() + 24, y);
        ctx.lineTo(worker.x - 16, worker.y);
        ctx.stroke();
      });
    });
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W, H * 0.5);
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)';
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();

    const publisherColor = getCSS('--publisher-color');
    const brokerColor = getCSS('--broker-color');
    drawNode(W * 0.1, H * 0.5, 22, publisherColor, 'P', '', false);
    ctx.save();
    ctx.font = '600 12px ' + getCSS('--font-sans');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.fillText('共用 Publisher', W * 0.1, H * 0.5 - 38);
    ctx.restore();
    drawNode(brokerX(), trackCenter(true), 22, brokerColor, 'B', '複製', topicFlashUntil > simTime);
    drawNode(brokerX(), trackCenter(false), 22, brokerColor, 'B', `隊列 ${queue.length}`, queue.length > 0);
    drawQueueSlots();
    drawWorkers(true);
    drawWorkers(false);
    particles.forEach(drawParticle);
    requestAnimationFrame(draw);
  }

  function changeWorkerCount(delta) {
    const nextCount = workerCount + delta;
    if (nextCount < 2 || nextCount > 5) return;
    workerCount = nextCount;
    createWorkers();
    reset(`職員人數已更新為 ${workerCount} 位；兩條軌道及統計已重置。`);
  }

  document.getElementById('btnSendOrder').addEventListener('click', sendOrder);
  document.getElementById('btnAddWorker').addEventListener('click', () => changeWorkerCount(1));
  document.getElementById('btnRemoveWorker').addEventListener('click', () => changeWorkerCount(-1));
  document.getElementById('btnResetQueueCompare').addEventListener('click', () => reset('兩條軌道的訂單與統計已重置。'));
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? '繼續' : '暫停';
    pauseButton.setAttribute('aria-pressed', String(paused));
    status.textContent = paused ? '動畫已暫停；按「繼續」恢復。' : '動畫已繼續。';
  });
  speedSelect.addEventListener('change', () => {
    speed = Number(speedSelect.value);
    status.textContent = `動畫速度已設為 ${speedSelect.options[speedSelect.selectedIndex].text}。`;
  });
  window.addEventListener('resize', resize);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) particles = [];
  });

  createWorkers();
  resize();
  renderAll();
  requestAnimationFrame(draw);
})();
