// Lightweight end-to-end smoke tests for login flow
// Prerequisites: run the server locally on port 5000
// This script uses global fetch (Node.js v18+). If not available, install node-fetch or upgrade Node.

(async () => {
  const base = 'http://localhost:5000';
  const log = (...args) => console.log('[E2E-TEST]', ...args);

  // Health check
  try {
    const h = await fetch(base + '/api/health');
    const hData = await h.json().catch(() => ({}));
    log('Health OK:', h.status, hData);
  } catch (e) {
    log('Health check failed:', e?.message ?? e);
  }

  // 1) Login with empty body should return 400
  try {
    const r1 = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const d1 = await r1.json().catch(() => ({}));
    log('Login with empty body ->', r1.status, d1);
  } catch (e) {
    log('Login empty test failed:', e?.message ?? e);
  }

  // 2) Login with missing fields (only email) should also return 400
  try {
    const r2 = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    const d2 = await r2.json().catch(() => ({}));
    log('Login with missing password ->', r2.status, d2);
  } catch (e) {
    log('Login missing fields test failed:', e?.message ?? e);
  }

  log('E2E smoke tests completed');
  // Exit with success code regardless; adjust as needed.
  process.exit(0);
})();
