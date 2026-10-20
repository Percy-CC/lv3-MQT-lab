(function() {
  const canvas = document.getElementById('cvRolePlay');
  const ctx = canvas.getContext('2d');
  const workerSelect = document.getElementById('workerCount');
  const claimButtons = document.getElementById('claimButtons');
  const recordBody = document.querySelector('#recordTable tbody');
  const recordTotal = document.getElementById('recordTotal');
  const status = document.getElementById('roleStatus');
  const remainingLabel = document.getElementById('roleRemaining');
  const completeBanner = document.getElementById('roleCompleteBanner');
  const autoButton = document.getElementById('btnAutoPlay');
  const stepButton = document.getElementById('btnStepRolePlay');
  const pauseButton = document.getElementById('btnPauseRolePlay');
  const speedSelect = document.getElementById('roleSpeed');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const workerColors = ['#1d4ed8', '#be185d', '#047857', '#c2410c', '#6d28d9'];
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
  let shiftAnimations = [];
  let autoTimer = null;
  let nextSequentialWorker = 0;
  let autoPlaying = false;
  let paused = false;
  let speed = 1;
  let lastAssignedWorker = -1;
  let lastTs = 0;

  function workerName(index) {
    return String.fromCharCode(65 + index);
  }

  function resize() {
    const compact = canvas.parentElement.getBoundingClientRect().width < 620;
    canvas.width = 1000;
    canvas.height = compact ? 2900 : 560;
    const size = resizeCanvas(canvas);
    W = size.w / size.dpr;
    DPR = size.dpr;
    H = Math.max(size.h / size.dpr, compact ? 850 : 520);
    canvas.height = H * DPR;
    canvas.style.height = `${H}px`;
    animations = [];
    shiftAnimations = [];
  }

  function remainingOrders() {
    return orders.filter(order => order.available);
  }

  function updateStatus(message) {
    status.textContent = message;
  }

  function updateRemaining() {
    const remaining = remainingOrders().length;
    remainingLabel.textContent = `隊列剩餘 ${remaining} / 6`;
    completeBanner.hidden = remaining !== 0;
    return remaining;
  }

  function updateButtons() {
    const hasOrders = remainingOrders().length > 0;
    const blocked = paused || autoPlaying || !hasOrders;
    claimButtons.querySelectorAll('button').forEach(button => {
      button.disabled = blocked;
    });
    stepButton.disabled = blocked;
    autoButton.disabled = blocked;
    workerSelect.disabled = autoPlaying;
  }

  function renderRecords() {
    recordBody.textContent = '';
    assignments.forEach((assignedOrders, index) => {
      const row = document.createElement('tr');
      if (index === lastAssignedWorker) row.className = 'q-record-latest';
      const workerCell = document.createElement('th');
      workerCell.scope = 'row';
      workerCell.style.setProperty('--q-worker-color', workerColors[index]);
      const badge = document.createElement('span');
      badge.className = 'q-worker-badge';
      badge.textContent = workerName(index);
      const workerLabel = document.createElement('span');
      workerLabel.textContent = `職員 ${workerName(index)}`;
      workerCell.append(badge, workerLabel);
      const orderCell = document.createElement('td');
      orderCell.textContent = assignedOrders.length
        ? assignedOrders.map(order => `#${order.id} ${order.text.split('：')[1]}`).join('、')
        : '—';
      row.append(workerCell, orderCell);
      recordBody.appendChild(row);
    });
    const total = assignments.reduce((count, assigned) => count + assigned.length, 0);
    recordTotal.textContent = `${total} 張`;
  }

  function renderClaimButtons() {
    claimButtons.textContent = '';
    assignments.forEach((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn q-claim-button';
      button.style.setProperty('--q-worker-color', workerColors[index]);
      button.setAttribute('aria-label', `職員 ${workerName(index)} 領取下一張`);
      const badge = document.createElement('span');
      badge.className = 'q-worker-badge';
      badge.textContent = workerName(index);
      button.append(badge, document.createTextNode('領取下一張'));
      button.addEventListener('click', () => claimOrder(index));
      claimButtons.appendChild(button);
    });
    updateButtons();
  }

  function reset(message) {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    autoPlaying = false;
    paused = false;
    nextSequentialWorker = 0;
    lastAssignedWorker = -1;
    orders = orderText.map((text, index) => ({ id: index + 1, text, available: true }));
    assignments = Array.from({ length: workerCount }, () => []);
    animations = [];
    shiftAnimations = [];
    autoButton.textContent = '自動示範';
    pauseButton.textContent = '暫停';
    pauseButton.setAttribute('aria-pressed', 'false');
    renderClaimButtons();
    renderRecords();
    updateRemaining();
    updateStatus(message || '隊列有 6 張訂單，請職員領取。');
  }

  function compactLayout() {
    return W < 620;
  }

  function queuePosition(index) {
    if (compactLayout()) {
      return { x: W * 0.42, y: H * 0.14 + (5 - index) * H * 0.055 };
    }
    return { x: W * 0.9 - index * (W * 0.8 / 5), y: H * 0.37 };
  }

  function currentQueuePosition(orderId, fallbackIndex) {
    const animation = shiftAnimations.find(item => item.orderId === orderId);
    if (!animation) return queuePosition(fallbackIndex);
    const progress = Math.min(1, animation.progress);
    return {
      x: animation.from.x + (animation.to.x - animation.from.x) * progress,
      y: animation.from.y + (animation.to.y - animation.from.y) * progress
    };
  }

  function workerPosition(workerIndex) {
    if (compactLayout()) {
      const row = Math.floor(workerIndex / 2);
      const col = workerIndex % 2;
      return { x: W * (col === 0 ? 0.25 : 0.75), y: H * 0.56 + row * H * 0.15 };
    }
    return { x: W * ((workerIndex + 0.5) / workerCount), y: H * 0.67 };
  }

  function stackCardPosition(workerIndex, cardIndex) {
    const position = workerPosition(workerIndex);
    const compact = compactLayout();
    const width = compact ? 40 : 42;
    const height = compact ? 19 : 20;
    const gap = 3;
    const columns = 3;
    const groupWidth = columns * width + (columns - 1) * gap;
    const col = cardIndex % columns;
    const row = Math.floor(cardIndex / columns);
    return {
      x: position.x - groupWidth / 2 + col * (width + gap) + width / 2,
      y: position.y + (compact ? 63 : 68) + row * (height + 4) + height / 2,
      width,
      height
    };
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

  function drawNote(order, position, width, height, workerIndex, isNext, moving) {
    const color = workerIndex === null ? getCSS('--publisher-color') : workerColors[workerIndex];
    const x = position.x;
    const y = position.y;
    ctx.save();
    if (isNext) {
      ctx.shadowColor = isDark() ? getCSS('--accent') : '#0369a1';
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 5);
    ctx.fillStyle = moving
      ? (isDark() ? '#273044' : '#ffffff')
      : (isDark() ? '#1e293b' : '#fff7d6');
    ctx.fill();
    ctx.strokeStyle = isNext ? (isDark() ? getCSS('--accent') : '#0369a1') : color;
    ctx.lineWidth = isNext ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (isNext) {
      ctx.beginPath();
      ctx.roundRect(x - 30, y - height / 2 - 1, 60, 17, 4);
      ctx.fillStyle = isDark() ? getCSS('--accent') : '#0369a1';
      ctx.fill();
      ctx.font = `700 12px ${getCSS('--font-sans')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark() ? '#0a0e1a' : '#ffffff';
      ctx.fillText('下一張', x, y - height / 2 + 8);
    }
    ctx.font = `600 12px ${getCSS('--font-sans')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#f8fafc' : '#1e293b';
    const lines = wrapText(order.text, width - 12);
    const textCenter = isNext ? y + 8 : y;
    const lineHeight = 15;
    lines.forEach((line, index) => {
      ctx.fillText(line, x, textCenter + (index - (lines.length - 1) / 2) * lineHeight);
    });
    if (workerIndex !== null) {
      ctx.beginPath();
      ctx.arc(x + width / 2 - 9, y + height / 2 - 9, 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.font = `700 12px ${getCSS('--font-mono')}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(workerName(workerIndex), x + width / 2 - 9, y + height / 2 - 9);
    }
    ctx.restore();
  }

  function drawStackCard(order, workerIndex, cardIndex) {
    const position = stackCardPosition(workerIndex, cardIndex);
    const color = workerColors[workerIndex];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(position.x - position.width / 2, position.y - position.height / 2, position.width, position.height, 3);
    ctx.fillStyle = `${color}24`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `700 12px ${getCSS('--font-mono')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#f8fafc' : '#1e293b';
    ctx.fillText(`#${order.id}`, position.x, position.y);
    ctx.restore();
  }

  function drawArrowHead(x, y, direction) {
    ctx.beginPath();
    if (direction === 'right') {
      ctx.moveTo(x - 9, y - 7);
      ctx.lineTo(x, y);
      ctx.lineTo(x - 9, y + 7);
    } else {
      ctx.moveTo(x - 7, y - 9);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 7, y - 9);
    }
    ctx.stroke();
  }

  function drawBelt() {
    const compact = compactLayout();
    const color = isDark() ? '#cbd5e1' : '#475569';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.font = `600 14px ${getCSS('--font-sans')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (compact) {
      ctx.fillText('隊尾 ↓ 隊首　先到先領', W * 0.42, H * 0.075);
      const x = W * 0.84;
      const y1 = H * 0.13;
      const y2 = H * 0.47;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
      drawArrowHead(x, y2, 'down');
    } else {
      ctx.fillText('隊尾 → 隊首　先到先領', W * 0.5, H * 0.1);
      const y = H * 0.21;
      ctx.beginPath();
      ctx.moveTo(W * 0.1, y);
      ctx.lineTo(W * 0.9, y);
      ctx.stroke();
      drawArrowHead(W * 0.9, y, 'right');
      ctx.fillText('隊尾', W * 0.1, y - 17);
      ctx.fillText('隊首', W * 0.9, y - 17);
    }
    ctx.restore();
  }

  function drawWorkers() {
    assignments.forEach((assigned, index) => {
      const position = workerPosition(index);
      const color = workerColors[index];
      const radius = compactLayout() ? 26 : 30;
      ctx.save();
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `${color}24`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = `700 20px ${getCSS('--font-mono')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark() ? '#f8fafc' : '#1e293b';
      ctx.fillText(workerName(index), position.x, position.y);
      ctx.font = `600 14px ${getCSS('--font-sans')}`;
      ctx.fillText(`職員 ${workerName(index)}`, position.x, position.y + radius + 15);
      ctx.restore();
      assigned.forEach((order, cardIndex) => {
        if (!animations.some(animation => animation.order.id === order.id)) {
          drawStackCard(order, index, cardIndex);
        }
      });
    });
  }

  function claimOrder(workerIndex) {
    if (paused || !remainingOrders().length) return false;
    const availableBefore = remainingOrders();
    const oldPositions = new Map(availableBefore.map((order, index) => [
      order.id,
      currentQueuePosition(order.id, index)
    ]));
    const order = availableBefore[0];
    const from = oldPositions.get(order.id);
    order.available = false;
    order.workerIndex = workerIndex;
    assignments[workerIndex].push(order);
    nextSequentialWorker = (workerIndex + 1) % workerCount;
    lastAssignedWorker = workerIndex;

    const nextOrders = remainingOrders();
    shiftAnimations = reducedMotion.matches ? [] : nextOrders.map((item, index) => ({
      orderId: item.id,
      from: oldPositions.get(item.id),
      to: queuePosition(index),
      progress: 0
    }));
    if (!reducedMotion.matches) {
      const card = stackCardPosition(workerIndex, assignments[workerIndex].length - 1);
      animations.push({
        order,
        workerIndex,
        from,
        to: { x: card.x, y: card.y },
        progress: 0
      });
    }

    renderRecords();
    const remaining = updateRemaining();
    if (remaining) {
      updateStatus(`職員 ${workerName(workerIndex)} 領取了 #${order.id}；隊列還有 ${remaining} 張，下一張仍在隊首。`);
    } else {
      const message = '全部 6 張已處理，每張只交給 1 人';
      updateStatus(message);
      completeBanner.textContent = message;
    }
    updateButtons();
    return true;
  }

  function scheduleAutoStep() {
    if (!autoPlaying || paused || !remainingOrders().length) return;
    autoTimer = setTimeout(autoStep, 1200 / speed);
  }

  function autoStep() {
    autoTimer = null;
    if (!autoPlaying || paused) return;
    if (!remainingOrders().length) {
      autoPlaying = false;
      autoButton.textContent = '自動示範';
      updateButtons();
      return;
    }
    claimOrder(nextSequentialWorker);
    if (remainingOrders().length) {
      scheduleAutoStep();
    } else {
      autoPlaying = false;
      autoButton.textContent = '自動示範';
      updateButtons();
    }
  }

  function startAutoPlay() {
    if (autoPlaying || paused || !remainingOrders().length) return;
    autoPlaying = true;
    autoButton.textContent = '自動示範中';
    updateButtons();
    autoStep();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }

  function drawRemainingCount() {
    ctx.save();
    ctx.font = `700 22px ${getCSS('--font-mono')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? getCSS('--accent') : '#0369a1';
    ctx.fillText(`隊列剩餘 ${remainingOrders().length} / 6`, W * 0.5, H * 0.045);
    ctx.restore();
  }

  function draw(ts) {
    if (!lastTs) lastTs = ts;
    const elapsed = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    const dt = paused ? 0 : elapsed * speed;

    if (!reducedMotion.matches) {
      shiftAnimations.forEach(animation => {
        animation.progress = Math.min(1, animation.progress + dt / 0.4);
      });
      shiftAnimations = shiftAnimations.filter(animation => animation.progress < 1);
      animations.forEach(animation => {
        animation.progress = Math.min(1, animation.progress + dt / 0.65);
      });
      animations = animations.filter(animation => animation.progress < 1);
    } else {
      shiftAnimations = [];
      animations = [];
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawRemainingCount();
    drawBelt();

    const compact = compactLayout();
    const noteWidth = compact ? W * 0.7 : Math.min(140, W * 0.15);
    const noteHeight = compact ? 48 : 78;
    const available = remainingOrders();
    available.forEach((order, index) => {
      const position = currentQueuePosition(order.id, index);
      drawNote(order, position, noteWidth, noteHeight, null, index === 0, false);
    });

    drawWorkers();
    animations.forEach(animation => {
      const progress = Math.min(1, animation.progress);
      const ease = 1 - Math.pow(1 - progress, 3);
      const position = {
        x: animation.from.x + (animation.to.x - animation.from.x) * ease,
        y: animation.from.y + (animation.to.y - animation.from.y) * ease
      };
      drawNote(animation.order, position, noteWidth, noteHeight, animation.workerIndex, false, true);
    });
    requestAnimationFrame(draw);
  }

  workerSelect.addEventListener('change', () => {
    workerCount = Number(workerSelect.value);
    reset(`職員人數已更新為 ${workerCount} 位，隊列已重置。`);
  });
  stepButton.addEventListener('click', () => {
    claimOrder(nextSequentialWorker);
  });
  autoButton.addEventListener('click', startAutoPlay);
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? '繼續' : '暫停';
    pauseButton.setAttribute('aria-pressed', String(paused));
    if (paused && autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    } else if (!paused && autoPlaying) {
      scheduleAutoStep();
    }
    updateButtons();
    updateStatus(paused ? '動畫已暫停；按「繼續」恢復。' : '動畫已繼續。');
  });
  speedSelect.addEventListener('change', () => {
    speed = Number(speedSelect.value);
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
      scheduleAutoStep();
    }
    updateStatus(`動畫速度已設為 ${speedSelect.options[speedSelect.selectedIndex].text}。`);
  });
  document.getElementById('btnResetRolePlay').addEventListener('click', () => reset());
  window.addEventListener('resize', resize);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      animations = [];
      shiftAnimations = [];
    }
  });

  reset();
  resize();
  requestAnimationFrame(draw);
})();
