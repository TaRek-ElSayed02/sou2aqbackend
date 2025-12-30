const pool = require('../config/database'); // عدل المسار حسب مشروعك

exports.createBlog = async (data) => {
  const { title, content, image, description, url, category, imgAlt } = data;

  const [result] = await pool.query(
    `INSERT INTO blog (title, content, image, description, url, category, imgAlt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, content, image, description ?? null, url ?? null, category ?? null, imgAlt ?? null]
  );

  return {
    id: result.insertId,
    title,
    content,
    image,
    description: description ?? null,
    url: url ?? null,
    category: category ?? null,
    imgAlt: imgAlt ?? null
  };
};

exports.getAllBlogs = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM blog ORDER BY created_at DESC`
  );
  return rows;
};

exports.getBlogById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM blog WHERE id = ?`,
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
    fields.push(`${key} = ?`);
    values.push(data[key]);
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
  const [result] = await pool.query(
    `DELETE FROM blog WHERE id = ?`,
    [id]
  );

  if (!result.affectedRows) {
    const error = new Error('Blog not found');
    error.status = 404;
    throw error;
  }
};
