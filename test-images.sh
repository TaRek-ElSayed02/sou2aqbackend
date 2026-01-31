#!/bin/bash
# ملف اختبار سريع للتحقق من الصور

echo "🔧 اختبار توفر الصور..."
echo ""

# تحقق من وجود مجلد uploads
echo "1️⃣ التحقق من مجلد uploads:"
if [ -d "uploads/siteImages" ]; then
    echo "✅ مجلد uploads/siteImages موجود"
    echo "📁 الملفات الموجودة:"
    ls -lh uploads/siteImages/
else
    echo "❌ مجلد uploads/siteImages غير موجود"
    mkdir -p uploads/siteImages
    echo "✅ تم إنشاء المجلد"
fi

echo ""
echo "2️⃣ اختبار رابط الصورة:"
echo "URL: http://localhost:5000/uploads/siteImages/my-site-1769860874431.jpg"
echo ""
echo "3️⃣ نقاط نهاية التشخيص المتاحة:"
echo "  - http://localhost:5000/api/health - صحة الخادم"
echo "  - http://localhost:5000/api/test-uploads - قائمة الملفات المتاحة"
echo "  - http://localhost:5000/api/test-file/siteImages/my-site-1769860874431.jpg - اختبار ملف محدد"
echo ""
echo "4️⃣ ابدأ السيرفر بـ:"
echo "  npm run dev"
