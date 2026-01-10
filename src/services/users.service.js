// // users.service.js - معدل للداتابيز
// const db = require('../config/database'); // تعدل حسب connection بتاعك
// const bcrypt = require('bcryptjs');
// class UsersService {
//   // Get all users
//   async getAllUsers() {
//     try {
//       const [rows] = await db.query('SELECT * FROM users');
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Get user by ID
//   async getUserById(id) {
//     try {
//       const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      
//       if (rows.length === 0) {
//         throw new Error('User not found');
//       }
      
//       return rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }

// // users.service.js
// async updateUser(id, updateData) {
//   try {
//     // حذف الـpassword من البيانات إذا موجود
//     const { password, ...safeUpdateData } = updateData;
    
//     // إذا في password جديد، نخزنه مشفر
//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       safeUpdateData.password = hashedPassword;
//     }
    
//     // إذا مفيش حقلول للتعديل غير password
//     if (Object.keys(safeUpdateData).length === 0) {
//       throw new Error('No valid fields to update');
//     }
    
//     // بناء الـSET clause ديناميكي
//     const setClause = Object.keys(safeUpdateData)
//       .map(key => `${key} = ?`)
//       .join(', ');
    
//     const values = Object.values(safeUpdateData);
//     values.push(id);
    
//     const query = `UPDATE users SET ${setClause}, modifiedAt = NOW() WHERE id = ?`;
    
//     console.log('Update Query:', query); // للdebug
//     console.log('Update Values:', values); // للdebug
    
//     const [result] = await db.query(query, values);
    
//     if (result.affectedRows === 0) {
//       throw new Error('User not found');
//     }
    
//     // إرجاع اليوزر المعدل بدون password
//     const updatedUser = await this.getUserById(id);
//     const { password: _, ...userWithoutPassword } = updatedUser;
//     return userWithoutPassword;
//   } catch (error) {
//     console.error('Update user error:', error);
//     throw error;
//   }
// }
//   // Delete user
//   async deleteUser(id) {
//     try {
//       const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
      
//       if (result.affectedRows === 0) {
//         throw new Error('User not found');
//       }
      
//       return { success: true };
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Update role
//   async updateUserRole(id, role) {
//     try {
//       const [result] = await db.query(
//         'UPDATE users SET role = ?, modifiedAt = NOW() WHERE id = ?',
//         [role, id]
//       );
      
//       if (result.affectedRows === 0) {
//         throw new Error('User not found');
//       }
      
//       return this.getUserById(id);
//     } catch (error) {
//       throw error;
//     }
//   }

//   // Update isActive
//   async updateUserStatus(id, isActive) {
//     try {
//       const [result] = await db.query(
//         'UPDATE users SET isActive = ?, modifiedAt = NOW() WHERE id = ?',
//         [isActive, id]
//       );
      
//       if (result.affectedRows === 0) {
//         throw new Error('User not found');
//       }
      
//       return this.getUserById(id);
//     } catch (error) {
//       throw error;
//     }
//   }
// }

// module.exports = new UsersService();

// users.service.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { deleteOldImage, getImageUrl } = require('../middleware/upload.middleware');

class UsersService {

    async getAllUsers() {
    try {
      const [rows] = await db.query('SELECT * FROM users');
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

    async deleteUser(id) {
    try {
      const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, updateData) {
    try {
      console.log('=== UPDATE USER START ===');
      console.log('User ID:', id);
      console.log('Update Data:', updateData);

      // جلب اليوزر الحالي لمعرفة الصورة القديمة
      const currentUser = await this.getUserById(id);
      const oldImagePath = currentUser.profileImage ? 
        path.join('uploads/profileImages', path.basename(currentUser.profileImage)) : null;

      // إذا في password، معالجته
      if (updateData.password) {
        console.log('Password found, hashing...');
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // إذا في profileImage جديدة (اسم ملف فقط)
      if (updateData.profileImage) {
        console.log('New profile image filename:', updateData.profileImage);
        
        // حذف الصورة القديمة إذا كانت موجودة
        if (oldImagePath && fs.existsSync(oldImagePath)) {
          deleteOldImage(oldImagePath);
        }
        
        // تحويل اسم الملف لـURL كامل
        updateData.profileImage = getImageUrl(updateData.profileImage);
      }

      // إزالة حقول فارغة
      const filteredData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && value !== null && value !== '') {
          filteredData[key] = value;
        }
      }

      console.log('Filtered Data:', filteredData);

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      // بناء الـquery
      const setParts = [];
      const values = [];

      for (const [key, value] of Object.entries(filteredData)) {
        setParts.push(`${key} = ?`);
        values.push(value);
      }

      // إضافة modifiedAt
      setParts.push('modifiedAt = NOW()');
      values.push(id);

      const setClause = setParts.join(', ');
      const query = `UPDATE users SET ${setClause} WHERE id = ?`;

      console.log('Final Query:', query);
      console.log('Query Values:', values);

      // تنفيذ الـquery
      const [result] = await db.query(query, values);

      console.log('Update result:', result);

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      // إرجاع البيانات المحدثة
      const updatedUser = await this.getUserById(id, true);
      console.log('Updated user:', updatedUser);
      console.log('=== UPDATE USER END ===');

      return updatedUser;
    } catch (error) {
      console.error('UPDATE USER ERROR:', error);
      throw error;
    }
  }

  async updateProfileImage(userId, filename) {
    try {
      // جلب اليوزر الحالي لمعرفة الصورة القديمة
      const currentUser = await this.getUserById(userId);
      const oldImagePath = currentUser.profileImage ? 
        path.join('uploads/profileImages', path.basename(currentUser.profileImage)) : null;

      // حذف الصورة القديمة إذا كانت موجودة
      if (oldImagePath && fs.existsSync(oldImagePath)) {
        deleteOldImage(oldImagePath);
      }

      // بناء URL الصورة الجديدة
      const imageUrl = getImageUrl(filename);

      // تحديث قاعدة البيانات
      const query = 'UPDATE users SET profileImage = ?, modifiedAt = NOW() WHERE id = ?';
      const [result] = await db.query(query, [imageUrl, userId]);

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      // إرجاع اليوزر المحدث
      return await this.getUserById(userId, true);
    } catch (error) {
      console.error('Update profile image error:', error);
      throw error;
    }
  }

  async getUserById(id, excludePassword = false) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

      if (rows.length === 0) {
        throw new Error('User not found');
      }

      const user = rows[0];

      if (excludePassword) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UsersService();