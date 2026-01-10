// controllers/users.controller.js
const usersService = require('../services/users.service');
const { uploadProfileImage, deleteOldImage } = require('../middleware/upload.middleware');
const path = require('path');

exports.uploadProfileImage = async (req, res) => {
  try {
    uploadProfileImage(req, res, async function (err) {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded'
        });
      }

      try {
        const userId = req.user.id;
        const filename = req.file.filename;

        // تحديث الـprofileImage في قاعدة البيانات
        const updatedUser = await usersService.updateProfileImage(userId, filename);

        res.json({
          success: true,
          message: 'Profile image uploaded successfully',
          data: {
            profileImage: updatedUser.profileImage,
            filename: filename
          }
        });
      } catch (error) {
        // حذف الملف المرفوع إذا فشل التحديث
        if (req.file) {
          const filePath = path.join('uploads/profileImages', req.file.filename);
          deleteOldImage(filePath);
        }

        res.status(400).json({
          success: false,
          message: error.message
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const users = await usersService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    
    // إخفاء بيانات حساسة إذا مش سوبر أدمن وبيشوف يوزر تاني
    if (req.user.role !== 'superAdmin' && req.user.id.toString() !== req.params.id) {
      // هنا السيناريو مش هيحصل لأن الـmiddleware منعها، لكن احتياطي
      delete user.password;
      delete user.email;
      // أو نرجع data أقل
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    // بيرجع البروفايل بتاع اليوزر نفسه من التوكن
    const user = await usersService.getUserById(req.user.id);
    
    // إخفاء الـpassword
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// في users.controller.js
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = { ...req.body };

    // منع تحديث profileImage من خلال هذه الدالة (استخدم uploadProfileImage بدلاً منها)
    if (updateData.profileImage) {
      return res.status(400).json({
        success: false,
        message: 'Use /upload-profile-image endpoint to update profile image'
      });
    }

    // منع تحديث الحقول المحمية إلا للسوبر أدمن
    if (req.user.role !== 'superAdmin') {
      delete updateData.role;
      delete updateData.isActive;
      delete updateData.email; // حسب متطلباتك
    }

    const updatedUser = await usersService.updateUser(userId, updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// دالة لحذف الصورة الشخصية
exports.deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    // جلب اليوزر الحالي
    const currentUser = await usersService.getUserById(userId);

    if (!currentUser.profileImage) {
      return res.json({
        success: true,
        message: 'No profile image to delete'
      });
    }

    // حذف الصورة من السيرفر
    const imagePath = path.join('uploads/profileImages', path.basename(currentUser.profileImage));
    deleteOldImage(imagePath);

    // تحديث قاعدة البيانات
    const query = 'UPDATE users SET profileImage = NULL, modifiedAt = NOW() WHERE id = ?';
    const db = require('../config/database');
    await db.query(query, [userId]);

    res.json({
      success: true,
      message: 'Profile image deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    // منع اليوزر من حذف نفسه (اختياري)
    if (req.user.id.toString() === req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    await usersService.deleteUser(req.params.id);
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    // منع السوبر أدمن من تغيير دوره (اختياري)
    if (req.user.id.toString() === req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }
    
    const updatedUser = await usersService.updateUserRole(req.params.id, role);
    
    // إخفاء الـpassword
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    // منع اليوزر من تغيير حالته (اختياري)
    if (req.user.id.toString() === req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }
    
    const updatedUser = await usersService.updateUserStatus(req.params.id, isActive);
    
    // إخفاء الـpassword
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};