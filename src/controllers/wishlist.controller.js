const wishlistService = require('../services/wishlist.service');

const wishlistController = {
  addToWishlist: async (req, res) => {
    try {
      const userId = req.user.id;
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'product_id مطلوب'
        });
      }

      await wishlistService.addToWishlist(userId, product_id);

      return res.status(201).json({
        success: true,
        message: 'تم إضافة المنتج إلى الويش ليست'
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'المنتج موجود بالفعل في الويش ليست'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر',
        error: error.message
      });
    }
  },

  removeFromWishlist: async (req, res) => {
    try {
      const userId = req.user.id;
      const { product_id } = req.params;

      const result = await wishlistService.removeFromWishlist(userId, product_id);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'المنتج غير موجود في الويش ليست'
        });
      }

      return res.json({
        success: true,
        message: 'تم حذف المنتج من الويش ليست'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر',
        error: error.message
      });
    }
  },

  // ✅ جديد: fetch wishlist
  getWishlistByUser: async (req, res) => {
    try {
      const { user_id } = req.params;

      const products = await wishlistService.getWishlistByUserId(user_id);

      return res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر',
        error: error.message
      });
    }
  }
};

module.exports = wishlistController;
