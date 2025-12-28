const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sou2aq',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  connect: async () => {
    try {
      const connection = await pool.getConnection();
      connection.release();
      return true;
    } catch (err) {
      console.error('Database connection failed:', err);
      throw err;
    }
  }
};