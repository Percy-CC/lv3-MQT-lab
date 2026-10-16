function isDark() {
  return !document.documentElement.classList.contains('light');
}

function getCSS(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function resizeCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const logicalW = rect.width;
  const aspect = canvas.width / canvas.height;
  const logicalH = logicalW / aspect;
  canvas.style.width = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  canvas.width = logicalW * dpr;
  canvas.height = logicalH * dpr;
  return { w: canvas.width, h: canvas.height, dpr: dpr };
}

function initTheme() {
  const colorScheme = window.matchMedia('(prefers-color-scheme: light)');
  document.documentElement.classList.toggle('light', colorScheme.matches);
  colorScheme.addEventListener('change', event => {
    document.documentElement.classList.toggle('light', event.matches);
  });
}

initTheme();
