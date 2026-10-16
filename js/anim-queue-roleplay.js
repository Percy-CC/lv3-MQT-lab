(function() {
  const canvas = document.getElementById('cvRolePlay');
  const ctx = canvas.getContext('2d');
  const workerSelect = document.getElementById('workerCount');
  const claimButtons = document.getElementById('claimButtons');
  const recordBody = document.querySelector('#recordTable tbody');
  const status = document.getElementById('roleStatus');
  const autoButton = document.getElementById('btnAutoPlay');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const orderText = [
    '訂單 1：珍珠奶茶',
    '訂單 2：凍檸茶',
    '訂單 3：鴛鴦',
    '訂單 4：熱奶茶',
    '訂單 5：西多士',
    '訂單 6：菠蘿包'
  ];
  let W, H, DPR;
  let workerCount = Number(workerSelect.value);
  let orders = [];
  let assignments = [];
  let animations = [];
  let autoTimer = null;
  let autoWorker = 0;
  let autoPlaying = false;
  let lastTs = 0;

  function workerName(index) {
    return String.fromCharCode(65 + index);
  }

  function resize() {
    const size = resizeCanvas(canvas);
    W = size.w;
    DPR = size.dpr;
    H = Math.max(size.h, 340 * DPR);
    canvas.height = H;
    canvas.style.height = `${H / DPR}px`;
  }

  function remainingOrders() {
    return orders.filter(order => order.available);
  }

  function updateStatus(message) {
    status.textContent = message;
  }

  function updateButtons() {
    const hasOrders = remainingOrders().length > 0;
    claimButtons.querySelectorAll('button').forEach(button => {
      button.disabled = !hasOrders || autoPlaying;
    });
    autoButton.disabled = !hasOrders || autoPlaying;
    workerSelect.disabled = autoPlaying;
  }

  function renderRecords() {
    recordBody.textContent = '';
    assignments.forEach((assignedOrders, index) => {
      const row = document.createElement('tr');
      const workerCell = document.createElement('th');
      workerCell.scope = 'row';
      workerCell.textContent = `職員 ${workerName(index)}`;
      const orderCell = document.createElement('td');
      orderCell.textContent = assignedOrders.length ? assignedOrders.map(order => order.text).join('、') : '—';
      row.append(workerCell, orderCell);
      recordBody.appendChild(row);
    });
  }

  function renderClaimButtons() {
    claimButtons.textContent = '';
    assignments.forEach((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-cyan';
      button.textContent = `職員 ${workerName(index)} 領取下一張`;
      button.addEventListener('click', () => claimOrder(index));
      claimButtons.appendChild(button);
    });
    updateButtons();
  }

  function reset(message) {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    autoPlaying = false;
    autoWorker = 0;
    orders = orderText.map((text, index) => ({ id: index + 1, text, available: true }));
    assignments = Array.from({ length: workerCount }, () => []);
    animations = [];
    renderClaimButtons();
    renderRecords();
    updateStatus(message || `隊列有 ${orders.length} 張訂單，請職員領取。`);
  }

  function orderPosition(orderIndex) {
    const compact = W / DPR < 600;
    if (compact) {
      const col = orderIndex % 2;
      const row = Math.floor(orderIndex / 2);
      return { x: W * (0.17 + col * 0.27), y: H * (0.16 + row * 0.16) };
    }
    return { x: W * (0.045 + orderIndex * 0.105), y: H * 0.52 };
  }

  function workerPosition(workerIndex) {
    return { x: W * 0.82, y: H * (0.12 + ((workerIndex + 0.5) / workerCount) * 0.78) };
  }

  function claimOrder(workerIndex) {
    const order = orders.find(item => item.available);
    if (!order) return;
    order.available = false;
    assignments[workerIndex].push(order);
    if (!reducedMotion.matches) animations.push({ order, workerIndex, progress: 0 });
    renderRecords();
    const remaining = remainingOrders().length;
    updateStatus(remaining
      ? `職員 ${workerName(workerIndex)} 領取了${order.text}；隊列還有 ${remaining} 張訂單。`
      : '所有訂單已處理');
    updateButtons();
  }

  function autoStep() {
    autoTimer = null;
    const available = remainingOrders();
    if (!available.length) {
      autoPlaying = false;
      updateButtons();
      updateStatus('所有訂單已處理');
      return;
    }
    claimOrder(autoWorker);
    autoWorker = (autoWorker + 1) % workerCount;
    if (remainingOrders().length) {
      autoTimer = setTimeout(autoStep, 1200);
    } else {
      autoPlaying = false;
      updateButtons();
    }
  }

  function startAutoPlay() {
    if (autoPlaying || !remainingOrders().length) return;
    autoPlaying = true;
    updateButtons();
    autoStep();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    const grid = 30 * DPR;
    for (let x = 0; x < W; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }

  function drawLabel(text, x, y, align) {
    ctx.save();
    ctx.font = `600 ${10 * DPR}px ${getCSS('--font-mono')}`;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function wrapText(text, maxWidth) {
    const lines = [];
    let line = '';
    for (const character of text) {
      if (line && ctx.measureText(line + character).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawNote(order, x, y, width, height, moving) {
    const publisher = getCSS('--publisher-color');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 4 * DPR);
    ctx.fillStyle = moving ? (isDark() ? '#273044' : '#ffffff') : `${publisher}24`;
    ctx.fill();
    ctx.strokeStyle = publisher;
    ctx.lineWidth = 1.5 * DPR;
    ctx.stroke();
    ctx.font = `${9 * DPR}px ${getCSS('--font-sans')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#e2e8f0' : '#1e293b';
    const lines = wrapText(order.text, width - 8 * DPR).slice(0, 3);
    const lineHeight = 11 * DPR;
    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + (index - (lines.length - 1) / 2) * lineHeight);
    });
    ctx.restore();
  }

  function draw(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    ctx.clearRect(0, 0, W, H);
    drawGrid();

    const compact = W / DPR < 600;
    const noteWidth = compact ? W * 0.235 : 96 * DPR;
    const noteHeight = compact ? 38 * DPR : 56 * DPR;
    drawLabel('隊列', compact ? W * 0.3 : W * 0.34, H * 0.07);
    drawLabel('職員', W * 0.82, H * 0.07);

    orders.forEach(order => {
      if (!order.available) return;
      const position = orderPosition(order.id - 1);
      drawNote(order, position.x, position.y, noteWidth, noteHeight, false);
    });

    assignments.forEach((assigned, index) => {
      const position = workerPosition(index);
      ctx.save();
      ctx.beginPath();
      ctx.arc(position.x, position.y, 17 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = `${getCSS('--subscriber-color')}24`;
      ctx.fill();
      ctx.strokeStyle = getCSS('--subscriber-color');
      ctx.lineWidth = 2 * DPR;
      ctx.stroke();
      ctx.restore();
      drawLabel(workerName(index), position.x, position.y);
      if (!compact && assigned.length) {
        drawLabel(`${assigned.length} 張`, position.x, position.y + 28 * DPR);
      }
    });

    animations = animations.filter(animation => {
      animation.progress += dt / 0.65;
      if (animation.progress >= 1) return false;
      const from = orderPosition(animation.order.id - 1);
      const to = workerPosition(animation.workerIndex);
      const ease = 1 - Math.pow(1 - animation.progress, 3);
      const x = from.x + (to.x - from.x) * ease;
      const y = from.y + (to.y - from.y) * ease;
      drawNote(animation.order, x, y, noteWidth, noteHeight, true);
      return true;
    });

    requestAnimationFrame(draw);
  }

  workerSelect.addEventListener('change', () => {
    workerCount = Number(workerSelect.value);
    reset('職員人數已更新，隊列已重置。');
  });
  autoButton.addEventListener('click', startAutoPlay);
  document.getElementById('btnResetRolePlay').addEventListener('click', () => reset());
  window.addEventListener('resize', resize);

  reset();
  resize();
  requestAnimationFrame(draw);
})();