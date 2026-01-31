const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// GET /api/comments/public/:siteId - Get all comments for a site (public)
router.get('/public/:siteId', commentController.getCommentsBySiteIdPublic);

// GET /api/comments/site/:siteId - Get all comments for a site (authenticated - site owner or superAdmin)
router.get('/site/:siteId', commentController.getCommentsBySiteId);

// GET /api/comments/rating/:siteId - Get average rating for a site (public)
router.get('/rating/:siteId', commentController.getAverageRating);

// GET /api/comments/:id - Get single comment by ID
router.get('/:id', commentController.getCommentById);

// POST /api/comments - Create new comment (authenticated users only)
router.post('/', 
  requireAuth,
  commentController.createComment
);

// PATCH /api/comments/:id - Update comment (comment owner, site owner, or superAdmin)
router.patch('/:id', 
  requireAuth,
  commentController.updateComment
);

// DELETE /api/comments/:id - Delete comment (comment owner, site owner, or superAdmin)
router.delete('/:id', 
  requireAuth,
  commentController.deleteComment
);

module.exports = router;