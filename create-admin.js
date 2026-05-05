const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:1234@localhost:5432/threat_db'
});

async function createAdmin() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  const query = `
    INSERT INTO users (username, email, full_name, password_hash, role, is_active, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (username) DO UPDATE SET 
      password_hash = EXCLUDED.password_hash,
      role = 'admin',
      is_active = true
    RETURNING id, username, role;
  `;
  
  const values = ['admin', 'admin@example.com', 'Admin User', hash, 'admin', true];
  
  try {
    const result = await pool.query(query, values);
    console.log('✅ Admin user created/updated successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role:', result.rows[0].role);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
