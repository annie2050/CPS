# Silent Refresh Flow for CPS Application

Overview
- Implement a silent-refresh flow so the dashboard data loads seamlessly when a user is logged in and recovers automatically if the access token expires or is missing.

Backend changes (summary)
- Login endpoint now returns an access token and sets an HttpOnly refresh_token cookie.
- Added /api/auth/refresh to issue a new access token using the refresh cookie.
- Added /api/auth/logout to clear the refresh cookie.
- Tokens have configurable lifetimes (access ~15m, refresh ~7d).

Frontend changes (summary)
- Added client/src/authService.js to manage login, silent refresh, and a fetchWithAuth wrapper.
- Added a minimal frontend demo at client/src/demo to exercise login and guarded dashboard data.

How to run
- Start backend: npm run start (in server directory)
- Start frontend: npm run dev (in client directory)
- Navigate to the demo page if wired into your app, or use the provided DashboardDemo to test via code.

Verification steps
- Login with valid credentials; ensure you receive an access token and a refresh_token cookie is set.
- Call a protected API (e.g., /api/dashboard) with Authorization: Bearer <token> and verify data loads.
- After access token expiry, trigger another call; the frontend should refresh the token automatically and retry the request.
- Logout should clear the refresh cookie and require login again for protected routes.

Next steps
- Wire AppDemo into your router so you can reach the demo easily (or integrate the demo into your login flow).
- Add automated tests to cover login, refresh, and guard flows.
- Add a minimal React demo (Login + Dashboard guarded view) to exercise flow.
- Wire AppDemo into your router so you can reach the demo easily (or integrate the demo into your login flow).
- Add automated tests to cover login, refresh, and guard flows.
- Add environment variable hints and an env.sample to document secrets and configs.
