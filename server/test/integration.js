// Minimal integration test for login and protected route
// Note: This test uses the in-memory access token approach and does not currently
// exercise the full cookie-based refresh flow (which requires a cookie jar).
// Run: node server/test/integration.js

// Use global fetch (Node 18+). If running on older Node, install node-fetch and adjust accordingly.

async function test() {
  const email = process.env.TEST_EMAIL || 'test@example.com'
  const password = process.env.TEST_PASSWORD || 'password'

  try {
    // Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      // cookies handling would be needed here for refresh
    });
    console.log('Login status:', loginRes.status);
    const loginData = await loginRes.json().catch(() => ({}));
    console.log('Login response:', loginData);

    const token = loginData?.token;
    if (token) {
      // Access protected route with token
      const dashRes = await fetch('http://localhost:5000/api/dashboard', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token },
      });
      console.log('Dashboard status:', dashRes.status);
      const dashData = await dashRes.json();
      console.log('Dashboard data:', dashData);
    } else {
      console.log('No access token received; cannot test protected route without a real login.')
    }
  } catch (err) {
    console.error('Integration test error:', err);
  }
}

test();
