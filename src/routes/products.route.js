const express = require('express');
const router = express.Router();

const productController = require('../controllers/products.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadProductImage } = require('../middleware/uploadProductImage.middleware');

// Public
router.get('/', productController.getAllProducts);
router.get('/user/:userId', productController.getProductsByUserId);
router.get('/:id', productController.getProductById);

// Protected
router.post(
  '/',
  requireAuth,
  uploadProductImage.single('image'),
  productController.createProduct
);

router.patch(
  '/:id',
  requireAuth,
  uploadProductImage.single('image'),
  productController.updateProduct
);

router.delete(
  '/:id',
  requireAuth,
  productController.deleteProduct
);

module.exports = router;
