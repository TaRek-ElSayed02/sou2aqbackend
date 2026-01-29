const cartService = require('../services/cart.service');

const cartController = {
  addToCart: async (req, res) => {
    try {
      const userId = req.user.id;
      const { product_id, quantity } = req.body;

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'product_id مطلوب'
        });
      }

      const qty = quantity && quantity > 0 ? quantity : 1;

      await cartService.addToCart(userId, product_id, qty);

      return res.status(201).json({
        success: true,
        message: 'تم إضافة المنتج إلى الكارت'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر',
        error: error.message
      });
    }
  },

  removeFromCart: async (req, res) => {
    try {
      const userId = req.user.id;
      const { cart_id } = req.params;

      const result = await cartService.removeFromCart(cart_id, userId);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'العنصر غير موجود في الكارت'
        });
      }

      return res.json({
        success: true,
        message: 'تم حذف المنتج من الكارت'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر',
        error: error.message
      });
    }
  },

  getCartByUser: async (req, res) => {
    try {
      const { user_id } = req.params;

      const cartItems = await cartService.getCartByUserId(user_id);

      return res.json({
        success: true,
        count: cartItems.length,
        data: cartItems
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر',
        error: error.message
      });
    }
  },

  updateCartItem: async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart_id } = req.params;
    const { quantity } = req.body;

    // التحقق من وجود الكمية
    if (!quantity && quantity !== 0) {
      return res.status(400).json({
        success: false,
        message: 'الكمية مطلوبة'
      });
    }

    // التحقق من أن الكمية صحيحة (رقم موجب)
    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'الكمية يجب أن تكون رقمًا موجبًا'
      });
    }

    const result = await cartService.updateCartItem(cart_id, userId, quantity);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'العنصر غير موجود في الكارت'
      });
    }

    return res.json({
      success: true,
      message: 'تم تحديث كمية المنتج في الكارت'
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

module.exports = cartController;
