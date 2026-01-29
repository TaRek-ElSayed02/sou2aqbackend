
const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const auth = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth.middleware');

// ➕ إضافة منتج
router.post(
  '/',
  requireAuth,
  auth.checkUserOnly,
  wishlistController.addToWishlist
);

// ❌ حذف منتج
router.delete(
  '/:product_id',
  requireAuth,
  auth.checkUserOnly,
  wishlistController.removeFromWishlist
);

// 📦 جلب wishlist ليوزر معين (صاحبها فقط أو superAdmin)
router.get(
  '/user/:user_id',
  requireAuth,
  auth.requireOwnershipOrSuperAdmin,
  wishlistController.getWishlistByUser
);

module.exports = router;
