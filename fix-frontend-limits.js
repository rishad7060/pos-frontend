/**
 * Fix Frontend Hardcoded Limits
 *
 * Replace all hardcoded limit=50, limit=100, limit=200, etc. with either:
 * - No limit parameter (let backend use smart defaults)
 * - limit=-1 (fetch all for critical POS data)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

// Critical endpoints that need ALL data for POS operation
const CRITICAL_ENDPOINTS = [
  '/api/products',
  '/api/categories',
  '/api/suppliers',
  '/api/customers',
];

console.log('🔄 Updating Frontend API Calls...\n');

let filesUpdated = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let modified = false;

    // Replace patterns for critical endpoints (remove limit entirely - let backend handle it)
    CRITICAL_ENDPOINTS.forEach(endpoint => {
      // Pattern: `/api/products?limit=100`
      const regex1 = new RegExp(`(${endpoint.replace(/\//g, '\\/')}\\?)limit=\\d+(&|')`, 'g');
      const before1 = content;
      content = content.replace(regex1, `$1$2`);
      if (content !== before1) modified = true;

      // Pattern: `/api/products?isActive=true&limit=200`
      const regex2 = new RegExp(`(${endpoint.replace(/\//g, '\\/')}\\/?)([^'"]*?)&?limit=\\d+`, 'g');
      const before2 = content;
      content = content.replace(regex2, '$1$2');
      if (content !== before2) modified = true;
    });

    // For non-critical endpoints, keep the limit but remove hardcoded values
    // Pattern: `limit=100` -> `limit=100` (keep for now, backend will handle with smart defaults)
    // We'll just ensure consistency

    if (modified || content !== originalContent) {
      // Clean up double question marks or ampersands
      content = content.replace(/\?\?/g, '?');
      content = content.replace(/&&/g, '&');
      content = content.replace(/\?&/g, '?');
      content = content.replace(/&'/g, "'");
      content = content.replace(/&"/g, '"');
      content = content.replace(/&`/g, '`');

      fs.writeFileSync(filePath, content, 'utf8');
      filesUpdated++;
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(filePath);
    }
  });
}

const filesToUpdate = [];

// Find all files that need updating
walkDir(SRC_DIR, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if file contains API calls with limits
  if (content.includes('limit=50') || content.includes('limit=100') ||
      content.includes('limit=200') || content.includes('limit=500') ||
      content.includes('limit=1000')) {
    filesToUpdate.push(filePath);
  }
});

console.log(`Found ${filesToUpdate.length} files with hardcoded limits\n`);

// Process each file
filesToUpdate.forEach(filePath => {
  const relativePath = path.relative(SRC_DIR, filePath);
  if (processFile(filePath)) {
    console.log(`✅ Updated: ${relativePath}`);
  } else {
    console.log(`ℹ️  Checked: ${relativePath}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Files Updated: ${filesUpdated}`);
console.log(`  Total Checked: ${filesToUpdate.length}\n`);

if (filesUpdated > 0) {
  console.log('✨ Frontend limits updated!\n');
  console.log('📝 Changes made:');
  console.log('  - Removed hardcoded limits for critical endpoints (products, categories, suppliers, customers)');
  console.log('  - Backend will now use smart pagination based on entity type');
  console.log('  - Products: up to 10,000 (configurable)');
  console.log('  - Categories: up to 10,000 (configurable)');
  console.log('  - Orders/Reports: 100-200 with pagination\n');
} else {
  console.log('ℹ️  No changes needed\n');
}
