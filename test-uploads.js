// ملف اختبار سريع للتحقق من مشكلة الملفات
const path = require('path');
const fs = require('fs');

const uploadsDir = path.resolve(__dirname, 'uploads');
const siteImagesDir = path.join(uploadsDir, 'siteImages');

console.log('📁 Testing uploads configuration:\n');
console.log('Base directory:', uploadsDir);
console.log('Site images directory:', siteImagesDir);

console.log('\n✅ Directory exists:', fs.existsSync(uploadsDir));
console.log('✅ Site images dir exists:', fs.existsSync(siteImagesDir));

// قائمة الملفات
if (fs.existsSync(siteImagesDir)) {
  const files = fs.readdirSync(siteImagesDir);
  console.log('\n📸 Files in siteImages:');
  files.forEach(file => {
    const fullPath = path.join(siteImagesDir, file);
    const stats = fs.statSync(fullPath);
    console.log(`  - ${file} (${stats.size} bytes)`);
  });
}

// جرب طلب HTTP
const http = require('http');

console.log('\n🧪 Testing HTTP requests:\n');

// 1. اختبر الصورة
const testUrl = 'http://localhost:5000/uploads/siteImages/my-site-1769860874431.jpg';
console.log(`Trying to fetch: ${testUrl}`);

const req = http.get(testUrl, (res) => {
  console.log(`\n✅ Response status: ${res.statusCode}`);
  console.log('Headers:', {
    'content-type': res.headers['content-type'],
    'content-length': res.headers['content-length'],
    'cache-control': res.headers['cache-control']
  });
  
  if (res.statusCode === 200) {
    console.log('✅ File is accessible!');
  } else {
    console.log(`❌ Error: Got status ${res.statusCode}`);
  }
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  console.log('💡 Make sure the server is running on port 5000');
});

// اختبر health endpoint
setTimeout(() => {
  const healthUrl = 'http://localhost:5000/api/health';
  console.log(`\nTrying health check: ${healthUrl}`);
  
  http.get(healthUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('✅ Health check:', json.success ? 'OK' : 'ERROR');
      } catch (e) {
        console.error('❌ Failed to parse health response');
      }
      process.exit(0);
    });
  }).on('error', () => {
    console.log('⚠️ Could not reach server. Is it running?');
    process.exit(0);
  });
}, 1000);
