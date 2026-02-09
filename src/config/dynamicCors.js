// config/dynamicCors.js
const redis = require('redis'); // أو أي قاعدة بيانات

class DynamicCORS {
  constructor() {
    this.allowedOrigins = new Set([
      'http://localhost:3000',
      'https://yourdomain.com'
    ]);
    
    this.allowedPatterns = [
      /^http:\/\/(.+\.)?localhost(:\d+)?$/,
      /^https?:\/\/(.+\.)?yourdomain\.com$/
    ];
    
    this.loadFromDatabase();
  }
  
  async loadFromDatabase() {
    // تحميل من قاعدة البيانات أو Redis
    // ...
  }
  
  async addOrigin(origin) {
    this.allowedOrigins.add(origin);
    await this.saveToDatabase();
  }
  
  async removeOrigin(origin) {
    this.allowedOrigins.delete(origin);
    await this.saveToDatabase();
  }
  
  async addSubdomain(subdomain) {
    const pattern = new RegExp(`^https?://${subdomain}\\.yourdomain\\.com$`);
    this.allowedPatterns.push(pattern);
    await this.saveToDatabase();
  }
  
  isOriginAllowed(origin) {
    if (!origin) return true;
    
    if (this.allowedOrigins.has(origin)) return true;
    
    for (const pattern of this.allowedPatterns) {
      if (pattern.test(origin)) return true;
    }
    
    return false;
  }
}

module.exports = new DynamicCORS();