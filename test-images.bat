@echo off
chcp 65001 > nul
REM ملف اختبار سريع للتحقق من الصور على Windows

echo.
echo 🔧 اختبار توفر الصور...
echo.

REM تحقق من وجود مجلد uploads
echo 1️⃣ التحقق من مجلد uploads:
if exist "uploads\siteImages" (
    echo ✅ مجلد uploads\siteImages موجود
    echo 📁 الملفات الموجودة:
    dir "uploads\siteImages" /b
) else (
    echo ❌ مجلد uploads\siteImages غير موجود
    mkdir "uploads\siteImages"
    echo ✅ تم إنشاء المجلد
)

echo.
echo 2️⃣ اختبار رابط الصورة:
echo URL: http://localhost:5000/uploads/siteImages/my-site-1769860874431.jpg
echo.
echo 3️⃣ نقاط نهاية التشخيص المتاحة:
echo   - http://localhost:5000/api/health
echo   - http://localhost:5000/api/test-uploads
echo   - http://localhost:5000/api/test-file/siteImages/my-site-1769860874431.jpg
echo.
echo 4️⃣ ابدأ السيرفر بـ:
echo   npm run dev
echo.
pause
