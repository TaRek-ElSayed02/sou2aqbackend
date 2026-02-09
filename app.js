const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ==================== إعدادات المجلدات ====================
const uploadsDir = path.join(__dirname, 'uploads');
const blogImagesDir = path.join(__dirname, 'uploads/blogImages');

console.log('📁 Checking upload directories...');
console.log('📁 Main uploads directory:', uploadsDir);
console.log('📁 Blog images directory:', blogImagesDir);

// إنشاء المجلدات إذا لم تكن موجودة
const createDirectories = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
      console.log('✅ Created main uploads directory');
    }

    if (!fs.existsSync(blogImagesDir)) {
      fs.mkdirSync(blogImagesDir, { recursive: true, mode: 0o755 });
      console.log('✅ Created blog images directory');
    }

    // تحقق من صلاحيات الكتابة
    [uploadsDir, blogImagesDir].forEach(dir => {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
        console.log(`✅ ${dir} is writable`);
      } catch (err) {
        console.error(`❌ ${dir} is not writable:`, err.message);
        // حاول إصلاح الصلاحيات
        try {
          fs.chmodSync(dir, 0o755);
          console.log(`🔧 Fixed permissions for ${dir}`);
        } catch (chmodErr) {
          console.error(`❌ Could not fix permissions for ${dir}:`, chmodErr.message);
        }
      }
    });
  } catch (err) {
    console.error('❌ Error setting up directories:', err);
  }
};

createDirectories();

// ==================== الميدلوير ====================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://rest.localhost:3000',
  'http://rest2.localhost:3000',
  /^http:\/\/localhost(:\d+)?$/,
  'https://yourdomain.com',
  /^http:\/\/localhost(:\d+)?$/,           // localhost بأي port
  /^http:\/\/(.+\.)?localhost(:\d+)?$/,   // أي subdomain مع localhost
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,       // 127.0.0.1 بأي port
  /^https?:\/\/(.+\.)?yourdomain\.com$/,
];

app.use(cors({
  origin: function (origin, callback) {
    // السماح للطلبات بدون origin (مثل Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== الملفات الثابتة ====================
const uploadsAbsolutePath = path.resolve(__dirname, 'uploads');
console.log('📁 Serving static files from:', uploadsAbsolutePath);

// تحقق من وجود مجلد uploads
if (!fs.existsSync(uploadsAbsolutePath)) {
  console.log('⚠️ uploads folder does not exist, creating it...');
  fs.mkdirSync(uploadsAbsolutePath, { recursive: true });
}

app.use('/uploads', (req, res, next) => {
  // تعيين هيدرات CORS للملفات
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(uploadsAbsolutePath, {
  setHeaders: (res, filePath) => {
    // تعيين Content-Type بناءً على نوع الملف
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };

    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }

    // تعيين هيدرات التخزين المؤقت للصور
    if (ext.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 ساعة
    }
  }
}));

// ==================== الروابط ====================
const registerRoutes = require('./src/routes/register.route');
const loginRoutes = require('./src/routes/login.route');
const blogRoutes = require('./src/routes/blog.route');
const usersRoutes = require('./src/routes/users.route');
const productsRoutes = require('./src/routes/products.route');

app.use('/api/auth', registerRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/wishlist', require('./src/routes/wishlist.route'));
app.use('/api/cart', require('./src/routes/cart.route'));
app.use('/api/site', require('./src/routes/site.route'));
app.use('/api/maps', require('./src/routes/maps.route'));
app.use('/api/social', require('./src/routes/social.route'));
app.use('/api/comment', require('./src/routes/comment.route'));


// ==================== نقاط النهاية ====================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    code: 200,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'Blog API',
      uploadsDirectory: {
        exists: fs.existsSync(uploadsDir),
        writable: (() => {
          try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
            return true;
          } catch {
            return false;
          }
        })(),
        path: uploadsDir
      }
    }
  });
});

// نقطة نهاية للتحقق من الملفات المتاحة
app.get('/api/test-uploads', (req, res) => {
  const files = {};
  const dirs = {
    siteImages: path.join(uploadsAbsolutePath, 'siteImages'),
    blogImages: path.join(uploadsAbsolutePath, 'blogImages'),
    productsImages: path.join(uploadsAbsolutePath, 'productsImages'),
    profileImages: path.join(uploadsAbsolutePath, 'profileImages')
  };

  Object.entries(dirs).forEach(([name, dir]) => {
    if (fs.existsSync(dir)) {
      files[name] = fs.readdirSync(dir);
    }
  });

  res.json({
    success: true,
    uploadsPath: uploadsAbsolutePath,
    directories: dirs,
    files: files
  });
});

// نقطة نهاية لاختبار تحميل ملف معين
app.get('/api/test-file/:dir/:filename', (req, res) => {
  const { dir, filename } = req.params;
  const filePath = path.join(uploadsAbsolutePath, dir, filename);

  console.log('🔍 Requested file:', filePath);
  console.log('📁 Directory:', path.dirname(filePath));
  console.log('🔐 File exists:', fs.existsSync(filePath));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
      requestedPath: filePath
    });
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('❌ Error sending file:', err);
      res.status(500).json({
        success: false,
        message: 'Error sending file',
        error: err.message
      });
    }
  });
});

// ==================== معالجة الأخطاء ====================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);

  // أخطاء multer
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      code: 400,
      error: {
        type: 'FileUploadError',
        message: 'خطأ في رفع الملف: ' + err.message,
        code: err.code
      }
    });
  }

  // أخطاء التحقق
  if (err.status === 400) {
    return res.status(400).json({
      success: false,
      code: 400,
      error: {
        type: 'ValidationError',
        message: err.message
      }
    });
  }

  // أخطاء 404
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      code: 404,
      error: {
        type: 'NotFoundError',
        message: err.message
      }
    });
  }

  // الأخطاء العامة
  res.status(err.status || 500).json({
    success: false,
    code: err.status || 500,
    error: {
      type: 'ServerError',
      message: err.message || 'حدث خطأ في الخادم',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 404,
    error: {
      type: 'NotFoundError',
      message: 'الصفحة غير موجودة',
      path: req.originalUrl,
      method: req.method
    }
  });
});

// ==================== تشغيل الخادم ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📁 Upload directory: ${uploadsDir}
📸 Blog images: ${blogImagesDir}
🔐 JWT: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Using default'}
📧 Email: ${process.env.EMAIL_USER ? '✓ Configured' : '✗ Disabled'}
🌐 CORS: ${allowedOrigins.join(', ')}
  `);
});

// معالجة إغلاق الخادم
process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});