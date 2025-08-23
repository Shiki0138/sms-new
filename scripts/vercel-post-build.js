#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Running Vercel post-build script...');

// Ensure customer-edit.html exists by copying customer-detail.html
const publicDir = path.join(__dirname, '..', 'public');
const sourceFile = path.join(publicDir, 'customer-detail.html');
const targetFile = path.join(publicDir, 'customer-edit.html');

try {
  // Check if source file exists
  if (fs.existsSync(sourceFile)) {
    // Copy file to create customer-edit.html
    fs.copyFileSync(sourceFile, targetFile);
    console.log('✓ Created customer-edit.html from customer-detail.html');
  } else {
    console.error('✗ Source file customer-detail.html not found');
  }
  
  // Ensure all required directories exist
  const requiredDirs = ['assets', 'css', 'js', 'icons'];
  requiredDirs.forEach(dir => {
    const dirPath = path.join(publicDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
  
} catch (error) {
  console.error('Error in post-build script:', error);
  process.exit(1);
}

console.log('Post-build script completed successfully');