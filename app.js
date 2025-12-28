// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const path = require('path');
// require('dotenv').config();
// const multer = require('multer');

// const app = express();

// // Middleware
// app.use(helmet());
// app.use(cors());
// app.use(morgan('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // تقديم الملفات الثابتة (للصور)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Routes
// const registerRoutes = require('./src/routes/register.route');
// app.use('/api/auth', registerRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
  
//   if (err instanceof multer.MulterError) {
//     return res.status(400).json({
//       success: false,
//       message: 'خطأ في رفع الملف: ' + err.message
//     });
//   }
  
//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || 'حدث خطأ في الخادم'
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'الصفحة غير موجودة'
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // يمكنك تعديله حسب احتياجاتك
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تقديم الملفات الثابتة (للصور)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const registerRoutes = require('./src/routes/register.route');
const loginRoutes = require('./src/routes/login.route');

app.use('/api/auth', registerRoutes);
app.use('/api/auth', loginRoutes);

// Route أساسية للتحقق من عمل السيرفر
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    code: 200,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'SOU2AQ API'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  
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
      path: req.originalUrl
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'مفعل' : 'غير مفعل'}`);
  console.log(`🔐 JWT secret: ${process.env.JWT_SECRET ? 'مضبوط' : 'استخدام قيمة افتراضية'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'جميع النطاقات (*)'}`);
});