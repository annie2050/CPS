const { connectDB } = require('./config/db');

async function ensureTestUser() {
  try {
    const pool = await connectDB();
    const email = 'test@example.com';
    const password = 'password';
    const sm19_unqid = '2A026080-885A-4265-BA68-5D6659A0634F';

    const check = await pool.request()
      .input('email', email)
      .query('SELECT * FROM users WHERE email = @email');

    if (check.recordset.length > 0) {
      console.log('Test user exists, updating password...');
      await pool.request()
        .input('email', email)
        .input('password', password)
        .query('UPDATE users SET password_hash = @password WHERE email = @email');
      console.log('Password updated.');
    } else {
      console.log('Creating test user...');
      // Insert with minimal required fields
      await pool.request()
        .input('email', email)
        .input('password', password)
        .input('sm19_unqid', sm19_unqid) 
        .input('full_name', 'Test User')
        .input('company_name', 'Test Company')
        .input('is_active', 1)
        .query('INSERT INTO users (email, password_hash, sm19_unqid, full_name, company_name, is_active) VALUES (@email, @password, @sm19_unqid, @full_name, @company_name, @is_active)');
      console.log('Test user created.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

ensureTestUser();
