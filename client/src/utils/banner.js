// Lightweight top banner with a CTA to login and optional auto-redirect
// Usage: showBanner(message, { durationMs, redirectUrl, autoRedirect })
export function showBanner(message, { durationMs = 4000, redirectUrl = '/login', autoRedirect = true } = {}) {
  // Avoid stacking multiple banners
  const existing = document.getElementById('oc-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'oc-banner';
  banner.setAttribute('role', 'alert');
  banner.style.position = 'fixed';
  banner.style.top = '0';
  banner.style.left = '0';
  banner.style.right = '0';
  banner.style.zIndex = '10000';
  banner.style.background = '#fff3cd'; // light amber
  banner.style.borderBottom = '1px solid #ffeeba';
  banner.style.color = '#856404';
  banner.style.padding = '12px 16px';
  banner.style.display = 'flex';
  banner.style.justifyContent = 'space-between';
  banner.style.alignItems = 'center';
  banner.style.fontFamily = 'Arial, sans-serif';

  const text = document.createElement('span');
  text.textContent = message;
  banner.appendChild(text);

  const action = document.createElement('button');
  action.textContent = 'Login';
  action.style.marginLeft = '16px';
  action.style.background = '#0d6efd';
  action.style.color = '#fff';
  action.style.border = 'none';
  action.style.borderRadius = '6px';
  action.style.padding = '8px 12px';
  action.style.cursor = 'pointer';
  action.onclick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.assign(redirectUrl);
  };
  banner.appendChild(action);

  document.body.appendChild(banner);

  if (autoRedirect) {
    setTimeout(() => {
      // If the user hasn't clicked Login, redirect to login
      window.location.assign(redirectUrl);
    }, durationMs);
  }
}
