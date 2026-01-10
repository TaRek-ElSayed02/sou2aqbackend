const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { 
  requireSuperAdmin,
  requireOwnershipOrSuperAdmin,
  requireAuth 
} = require('../middleware/auth.middleware');

// كل الرووتات تتطلب مصادقة
router.use(requireAuth);

// Get current user profile
router.get('/profile', usersController.getCurrentUser);

// Upload profile image
router.post('/upload-profile-image', usersController.uploadProfileImage);

// Delete profile image
router.delete('/delete-profile-image', usersController.deleteProfileImage);

// Get user by ID
router.get('/:id', requireOwnershipOrSuperAdmin, usersController.getUserById);

// Update user (partial update) - بدون صورة
router.patch('/:id', requireOwnershipOrSuperAdmin, usersController.updateUser);

// Routes for superAdmin only
router.get('/', requireSuperAdmin, usersController.getAllUsers);
router.delete('/:id', requireSuperAdmin, usersController.deleteUser);
router.patch('/:id/role', requireSuperAdmin, usersController.updateRole);
router.patch('/:id/status', requireSuperAdmin, usersController.updateStatus);

module.exports = router;