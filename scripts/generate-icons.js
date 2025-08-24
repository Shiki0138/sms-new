const fs = require('fs');
const path = require('path');

// Simple placeholder icon generator using Canvas-like drawing
// Creates simple purple square icons with "SL" text

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG icon
function createSVGIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#667eea" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.35}px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">SL</text>
</svg>`;
}

// Generate icons
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.svg`);
  
  fs.writeFileSync(filename, svgContent);
  console.log(`Generated ${filename}`);
});

// Create a simple HTML file to convert SVGs to PNGs
const conversionHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Icon Converter</title>
</head>
<body>
  <h1>Icon Generation Complete</h1>
  <p>SVG icons have been generated. To convert to PNG:</p>
  <ol>
    <li>Use an online SVG to PNG converter</li>
    <li>Or install a tool like ImageMagick: <code>convert icon.svg icon.png</code></li>
    <li>Or use Node.js packages like sharp or canvas</li>
  </ol>
  <h2>Generated Icons:</h2>
  ${sizes.map(size => `<img src="/icons/icon-${size}x${size}.svg" width="${size}" height="${size}" style="margin: 5px; border: 1px solid #ccc;">`).join('\n  ')}
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon-preview.html'), conversionHTML);

console.log('\nIcon generation complete!');
console.log('SVG icons have been created in public/icons/');
console.log('Open public/icon-preview.html to view the icons');