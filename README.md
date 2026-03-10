# Customer Portal Service

A customer portal service built with Node.js, Express, React, and SQL Server.

## Project Structure

```
CPS/
├── server/                 # Express API
│   ├── config/            # DB connection
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── index.js           # Entry point
│   ├── schema.sql        # Database schema
│   └── package.json
└── client/                # React frontend
    ├── src/
    │   ├── components/
    │   ├── pages/         # Login, Dashboard
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## Prerequisites

- Node.js 18+
- SQL Server
- npm or yarn

## Setup

### 1. Database Setup

Run the SQL schema in your SQL Server:
```sql
-- Run server/schema.sql in SQL Server Management Studio
```

### 2. Install Dependencies

Server:
```bash
cd CPS/server
npm install
```

Client:
```bash
cd CPS/client
npm install
```

### 3. Run the Application

Start the server (port 5000):
```bash
cd CPS/server
npm start
```

Start the client (port 3000):
```bash
cd CPS/client
npm run dev
```

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/health` - Health check

## Technology Stack

- **Backend**: Node.js, Express, mssql, bcryptjs, jsonwebtoken
- **Frontend**: React 18, Vite, React Router
- **Database**: SQL Server
