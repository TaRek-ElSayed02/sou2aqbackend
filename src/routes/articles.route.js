const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articles.controller');
const { uploadBlogImage } = require('../middleware/blogUpload.middleware');
const { requireAuth, requireSiteOwnershipOrSuperAdminBody, requireArticleOwnershipOrSuperAdmin } = require('../middleware/auth.middleware');

// Validation middleware
const validateArticleData = (req, res, next) => {
  const { title, content, tags, author } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
  if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content is required' });
  if (title.trim().length < 3) return res.status(400).json({ success: false, message: 'Title must be at least 3 characters long' });
  if (content.trim().length < 10) return res.status(400).json({ success: false, message: 'Content must be at least 10 characters long' });
  if (tags && typeof tags !== 'string') return res.status(400).json({ success: false, message: 'Tags must be a string' });
  if (author && typeof author !== 'string') return res.status(400).json({ success: false, message: 'Author must be a string' });

  next();
};

// Create article (admin or superAdmin). Admins may only create for their own site (siteId in body).
// multer must run before ownership check so multipart form `req.body.siteId` exists
router.post('/', requireAuth, uploadBlogImage, requireSiteOwnershipOrSuperAdminBody, validateArticleData, articlesController.createArticle);

// Public: get all articles
router.get('/', articlesController.getAllArticles);

// Public: get articles by siteId
router.get('/site/:siteId', articlesController.getArticlesBySiteId);

// Public: get article by id
router.get('/:id', articlesController.getArticleById);

// Update (partial): admin or superAdmin, but admin only for their own articles
router.patch('/:id', requireAuth, requireArticleOwnershipOrSuperAdmin, uploadBlogImage, articlesController.updateArticle);

// Delete: admin or superAdmin, but admin only for their own articles
router.delete('/:id', requireAuth, requireArticleOwnershipOrSuperAdmin, articlesController.deleteArticle);

module.exports = router;
