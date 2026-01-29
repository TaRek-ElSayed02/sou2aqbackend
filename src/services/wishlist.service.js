const db = require('../config/database');

const wishlistService = {
  addToWishlist: async (userId, productId) => {
    const [result] = await db.query(
      `INSERT INTO wishlists (user_id, product_id)
       VALUES (?, ?)`,
      [userId, productId]
    );
    return result;
  },

  removeFromWishlist: async (userId, productId) => {
    const [result] = await db.query(
      `DELETE FROM wishlists 
       WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    return result;
  },

  // ✅ جديد: جلب كل منتجات الويش ليست
  getWishlistByUserId: async (userId) => {
    const [rows] = await db.query(
      `
      SELECT 
        p.*
      FROM wishlists w
      INNER JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      `,
      [userId]
    );

    return rows;
  }
};

module.exports = wishlistService;
