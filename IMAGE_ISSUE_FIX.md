# حل مشكلة عدم فتح الصور على الرابط

## المشكلة:
الصور تُحفظ بشكل صحيح في المجلد `uploads/siteImages/` لكن لا تفتح عندما تحاول الوصول إليها عبر الرابط:
```
http://localhost:5000/uploads/siteImages/my-site-1769858583314.jpg
```

## السبب:
المشكلة كانت في `app.js` حيث:
1. **المسار غير صحيح على Windows**: استخدام `path.join(__dirname, 'uploads')` قد لا يعمل بشكل صحيح مع Windows file paths
2. **Content-Type غير صحيح**: كان يتم تعيين `application/octet-stream` بدلاً من `image/jpeg` و `image/png` إلخ
3. **عدم وجود معالجة صحيحة للملفات**: الملفات الثابتة لم تُقدم بالهيدرات الصحيحة

## الحل المطبق:

### 1. استخدام `path.resolve()` بدلاً من `path.join()`:
```javascript
const uploadsAbsolutePath = path.resolve(__dirname, 'uploads');
```

### 2. تحديد Content-Type بناءً على امتداد الملف:
```javascript
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
```

### 3. إضافة CORS headers بشكل صحيح:
```javascript
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(uploadsAbsolutePath, { ... }));
```

### 4. إضافة تحقق من وجود مجلد uploads:
```javascript
if (!fs.existsSync(uploadsAbsolutePath)) {
  console.log('⚠️ uploads folder does not exist, creating it...');
  fs.mkdirSync(uploadsAbsolutePath, { recursive: true });
}
```

## اختبار الحل:

### الطريقة 1: استخدام المتصفح مباشرة
```
http://localhost:5000/uploads/siteImages/my-site-1769858583314.jpg
```

### الطريقة 2: استخدام Postman
- اختر GET
- أدخل الرابط: `http://localhost:5000/uploads/siteImages/my-site-1769858583314.jpg`
- اختر "Send"

### الطريقة 3: استخدام curl من PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/uploads/siteImages/my-site-1769858583314.jpg" -OutFile "test.jpg"
```

### الطريقة 4: استخدام نقطة النهاية التشخيصية:
```
GET http://localhost:5000/api/test-uploads
```
سيعطيك قائمة بجميع الملفات المتاحة

## ملفات تم تعديلها:
- ✅ `app.js` - تحسين middleware الملفات الثابتة

## الملاحظات:
- تأكد من أن مجلد `uploads/siteImages/` موجود بصلاحيات قراءة وكتابة
- تأكد من أن السيرفر يعمل على المنفذ 5000
- إذا استمرت المشكلة، استخدم نقطة النهاية `/api/test-file/siteImages/filename.jpg` للاختبار
