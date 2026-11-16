/* Only display a progress indicator for a confirmed 0-100 self-assessed value. */
(() => {
  document.querySelectorAll('.skill-progress').forEach((item) => {
    const raw = item.dataset.value.trim();
    if (raw === '') return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    const progress = item.querySelector('progress');
    progress.value = value;
    item.querySelector('.skill-progress-value').textContent = `${value}%`;
    item.querySelector('.skill-progress-track').hidden = false;
  });
})();
