const { connectDB, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

async function fixPassword() {
  try {
    const pool = await connectDB();
    const email = 'luckystarch98@gmail.com';
    const newPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await pool.request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .query('UPDATE users SET password_hash = @password WHERE email = @email');

    console.log(`Password updated for ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating password:', err);
    process.exit(1);
  }
}

fixPassword();
