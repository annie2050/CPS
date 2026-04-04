// Very small, self-contained toast utility (no dependencies)
export function showToast(message, duration = 3000) {
  // Avoid stacking multiple toasts
  const existing = document.getElementById('oc-toast');
  if (existing) {
    existing.remove();
  }
  const el = document.createElement('div');
  el.id = 'oc-toast';
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '8px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    zIndex: 9999,
    boxShadow: '0 2px 12px rgba(0,0,0,.3)'
  });
  document.body.appendChild(el);
  window.setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    window.setTimeout(() => el.remove(), 300);
  }, duration);
}
