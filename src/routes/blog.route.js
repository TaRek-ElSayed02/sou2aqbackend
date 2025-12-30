const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { uploadBlogImage } = require('../middleware/blogUpload.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

router.post(
  '/',
  requireAuth,
  requireSuperAdmin,
  uploadBlogImage.single('image'),
  blogController.createBlog
);

// Get all blogs (public)
router.get('/', blogController.getAllBlogs);

// Get blog by id (public)
router.get('/:id', blogController.getBlogById);

// Update blog (partial update) (superAdmin only)
router.patch(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  uploadBlogImage.single('image'),
  blogController.updateBlog
);

// Delete blog (superAdmin only)
router.delete(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  blogController.deleteBlog
);

module.exports = router;
