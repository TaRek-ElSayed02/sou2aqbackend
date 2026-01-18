const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.createBlog = async (data) => {
  const { title, content, image, description, url, category, imgAlt, tags, author } = data;

  const [result] = await pool.query(
    `INSERT INTO blog (title, content, image, description, url, category, imgAlt, tags, author)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      content,
      image,
      description ?? null,
      url ?? null,
      category ?? null,
      imgAlt ?? null,
      tags ?? null,
      author ?? null
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
    author: author ?? null
  };
};

exports.getAllBlogs = async () => {
  const [rows] = await pool.query(
    `SELECT id, title, content, image, description, url, category, imgAlt, tags, author, created_at
     FROM blog 
     ORDER BY created_at DESC`
  );
  return rows;
};

exports.getBlogById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, title, content, image, description, url, category, imgAlt, tags, author, created_at
     FROM blog WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    const error = new Error('Blog not found');
    error.status = 404;
    throw error;
  }

  return rows[0];
};

exports.updateBlog = async (id, data) => {
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
    `UPDATE blog SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) {
    const error = new Error('Blog not found');
    error.status = 404;
    throw error;
  }

  return this.getBlogById(id);
};

exports.deleteBlog = async (id) => {
  // أولاً: جلب المقال لمعرفة الصورة المرفقة
  const [blogRows] = await pool.query(
    `SELECT image FROM blog WHERE id = ?`,
    [id]
  );

  if (!blogRows.length) {
    const error = new Error('Blog not found');
    error.status = 404;
    throw error;
  }

  const blog = blogRows[0];

  // حذف المقال من قاعدة البيانات
  const [result] = await pool.query(
    `DELETE FROM blog WHERE id = ?`,
    [id]
  );

  if (!result.affectedRows) {
    const error = new Error('Blog not found');
    error.status = 404;
    throw error;
  }

  // حذف الصورة من السيرفر إذا كانت موجودة
  if (blog.image) {
    try {
      const imagePath = path.join(__dirname, '../..', blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ Deleted image:', imagePath);
      }
    } catch (error) {
      console.error('❌ Error deleting blog image:', error);
      // لا نرمي خطأ هنا حتى لا نمنع حذف المقال إذا فشل حذف الصورة
    }
  }

  return { message: 'Blog and associated image deleted successfully' };
};

// دالة مساعدة لحذف الصور القديمة عند التعديل
exports.deleteOldImage = async (id, newImagePath) => {
  // جلب المسار القديم للصورة
  const [blogRows] = await pool.query(
    `SELECT image FROM blog WHERE id = ?`,
    [id]
  );

  if (!blogRows.length || !blogRows[0].image) {
    return;
  }

  const oldImagePath = blogRows[0].image;

  // إذا كانت الصورة الجديدة مختلفة عن القديمة، حذف القديمة
  if (oldImagePath && oldImagePath !== newImagePath) {
    try {
      const fullPath = path.join(__dirname, '../..', oldImagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('🗑️ Deleted old image:', fullPath);
      }
    } catch (error) {
      console.error('❌ Error deleting old blog image:', error);
    }
  }
};