const db = require('../config/database');

const cartService = {
  addToCart: async (userId, productId, quantity) => {
    const [result] = await db.query(
      `
      INSERT INTO carts (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = quantity + VALUES(quantity)
      `,
      [userId, productId, quantity]
    );

    return result;
  },

  removeFromCart: async (cartId, userId) => {
    const [result] = await db.query(
      `
      DELETE FROM carts
      WHERE id = ? AND user_id = ?
      `,
      [cartId, userId]
    );
    return result;
  },

  getCartByUserId: async (userId) => {
    const [rows] = await db.query(
      `
      SELECT 
        c.id AS cart_id,
        c.quantity,
        p.*
      FROM carts c
      INNER JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      `,
      [userId]
    );
    return rows;
  },
  updateCartItem: async (cartId, userId, quantity) => {
  const [result] = await db.query(
    `
    UPDATE carts 
    SET quantity = ?
    WHERE id = ? AND user_id = ?
    `,
    [quantity, cartId, userId]
  );
  return result;
}
};

module.exports = cartService;
