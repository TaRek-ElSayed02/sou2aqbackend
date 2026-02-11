const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.createArticle = async (data) => {
  const { title, content, image, description, url, category, imgAlt, tags, author, siteId } = data;

  const [result] = await pool.query(
    `INSERT INTO articles (title, content, image, description, url, category, imgAlt, tags, author, siteId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      content,
      image,
      description ?? null,
      url ?? null,
      category ?? null,
      imgAlt ?? null,
      tags ?? null,
      author ?? null,
      siteId ?? null
    ]
  );

  return {
    id: result.insertId,
    title,
    content,
    image,
    description: description ?? null,
    url: url ?? null,
    category: category ?? null,
    imgAlt: imgAlt ?? null,
    tags: tags ?? null,
    author: author ?? null,
    siteId: siteId ?? null
  };
};

exports.getAllArticles = async () => {
  const [rows] = await pool.query(
    `SELECT id, title, content, image, description, url, category, imgAlt, tags, author, siteId, created_at
     FROM articles
     ORDER BY created_at DESC`
  );
  return rows;
};

exports.getArticlesBySiteId = async (siteId) => {
  const [rows] = await pool.query(
    `SELECT id, title, content, image, description, url, category, imgAlt, tags, author, siteId, created_at
     FROM articles WHERE siteId = ? ORDER BY created_at DESC`,
    [siteId]
  );
  return rows;
};

exports.getArticleById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, title, content, image, description, url, category, imgAlt, tags, author, siteId, created_at
     FROM articles WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    const error = new Error('Article not found');
    error.status = 404;
    throw error;
  }

  return rows[0];
};

exports.updateArticle = async (id, data) => {
  const fields = [];
  const values = [];

  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (!fields.length) {
    const error = new Error('No data provided for update');
    error.status = 400;
    throw error;
  }

  values.push(id);

  const [result] = await pool.query(
    `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) {
    const error = new Error('Article not found');
    error.status = 404;
    throw error;
  }

  return this.getArticleById(id);
};

exports.deleteArticle = async (id) => {
  const [rows] = await pool.query(`SELECT image FROM articles WHERE id = ?`, [id]);
  if (!rows.length) {
    const error = new Error('Article not found');
    error.status = 404;
    throw error;
  }

  const article = rows[0];

  const [result] = await pool.query(`DELETE FROM articles WHERE id = ?`, [id]);
  if (!result.affectedRows) {
    const error = new Error('Article not found');
    error.status = 404;
    throw error;
  }

  if (article.image) {
    try {
      const imagePath = path.join(__dirname, '../..', article.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ Deleted image:', imagePath);
      }
    } catch (err) {
      console.error('❌ Error deleting article image:', err);
    }
  }

  return { message: 'Article and associated image deleted successfully' };
};

exports.deleteOldImage = async (id, newImagePath) => {
  const [rows] = await pool.query(`SELECT image FROM articles WHERE id = ?`, [id]);
  if (!rows.length || !rows[0].image) return;

  const oldImagePath = rows[0].image;
  if (oldImagePath && oldImagePath !== newImagePath) {
    try {
      const fullPath = path.join(__dirname, '../..', oldImagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('🗑️ Deleted old image:', fullPath);
      }
    } catch (err) {
      console.error('❌ Error deleting old article image:', err);
    }
  }
};
