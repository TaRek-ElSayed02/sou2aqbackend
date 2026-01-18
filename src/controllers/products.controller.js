const productService = require('../services/products.service');

/**
 * GET /api/products
 * Public
 */
exports.getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/products/:id
 * Public
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/products/user/:userId
 * Public - Get all products by user_id
 */
exports.getProductsByUserId = async (req, res) => {
  try {
    const products = await productService.getProductsByUserId(req.params.userId);
    
    res.status(200).json({ 
      success: true, 
      count: products.length,
      data: products 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/products
 * Admin only
 */
exports.createProduct = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin only' });
    }

    const imagePath = req.file ? `/uploads/productsImages/${req.file.filename}` : null;

    const product = await productService.createProduct(
      {
        ...req.body,
        image: imagePath,
        imgAlt: req.body.imgAlt || null // مهم
      },
      req.user.id
    );

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/products/:id
 * Owner or superAdmin
 */
exports.updateProduct = async (req, res) => {
  try {
    if (req.file) {
      req.body.image = `/uploads/productsImages/${req.file.filename}`;
    }

    // نضمن ان imgAlt موجود
    if (req.body.imgAlt === undefined && req.file) {
      req.body.imgAlt = ''; // افتراضي لو الصورة جديدة
    }

    const updatedProduct = await productService.updateProduct(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id, req.user);

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
