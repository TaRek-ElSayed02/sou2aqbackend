const db = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Create product
 */
exports.createProduct = async (data, userId) => {
  const [result] = await db.query(
    `INSERT INTO products 
     (user_id, name, url, category, price, discount, image, imgAlt,
      quantityInStock, availableSizes, materials, description,
      seoTitle, seoDescription)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.name,
      data.url,
      data.category,
      data.price,
      data.discount || null,
      data.image,
      data.imgAlt || null,
      data.quantityInStock,
      data.availableSizes,
      data.materials,
      data.description,
      data.seoTitle,
      data.seoDescription
    ]
  );

  return { id: result.insertId, ...data };
};

/**
 * Get all products
 */
exports.getAllProducts = async () => {
  const [rows] = await db.query(`SELECT * FROM products`);
  return rows;
};

/**
 * Get products by user_id
 */
exports.getProductsByUserId = async (userId) => {
  const [rows] = await db.query(
    `SELECT * FROM products WHERE user_id = ?`,
    [userId]
  );
  return rows;
};

/**
 * Get product by id
 */
exports.getProductById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM products WHERE id = ?`,
    [id]
  );
  return rows[0];
};

/**
 * Update product
 */
exports.updateProduct = async (productId, data, user) => {
  const product = await this.getProductById(productId);

  if (!product) throw { status: 404, message: 'Product not found' };

  // Ownership check
  if (user.role !== 'superAdmin' && product.user_id !== user.id) {
    throw { status: 403, message: 'Forbidden: Not product owner' };
  }

  // Delete old image if new one uploaded
  if (data.image && product.image) {
    const oldImagePath = path.join(__dirname, '../../', product.image);
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  await db.query(
    `UPDATE products SET ? WHERE id = ?`,
    [data, productId]
  );

  return this.getProductById(productId);
};

/**
 * Delete product
 */
exports.deleteProduct = async (productId, user) => {
  const product = await this.getProductById(productId);

  if (!product) throw { status: 404, message: 'Product not found' };

  // Ownership check
  if (user.role !== 'superAdmin' && product.user_id !== user.id) {
    throw { status: 403, message: 'Forbidden: Not product owner' };
  }

  // Delete image from server
  if (product.image) {
    const imagePath = path.join(__dirname, '../../', product.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await db.query(
    `DELETE FROM products WHERE id = ?`,
    [productId]
  );
};
