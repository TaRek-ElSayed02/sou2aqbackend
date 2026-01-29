const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const auth = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth.middleware');


// ➕ إضافة للكارت (user فقط)
router.post(
  '/',
  requireAuth,
  auth.checkUserOnly,
  cartController.addToCart
);

// ❌ حذف عنصر من الكارت
router.delete(
  '/:cart_id',
  requireAuth,
  auth.checkUserOnly,
  cartController.removeFromCart
);

// 📦 جلب كارت يوزر معين
router.get(
  '/user/:user_id',
  requireAuth,
  auth.requireOwnershipOrSuperAdmin,
  cartController.getCartByUser
);

router.put(
  '/:cart_id',
  requireAuth,
  auth.checkUserOnly,
  cartController.updateCartItem
);

module.exports = router;
