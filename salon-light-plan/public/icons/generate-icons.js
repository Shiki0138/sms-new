const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.14}" fill="#9333EA"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.3}" fill="white" fill-opacity="0.2"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.2}" fill="white"/>
</svg>`;

sizes.forEach(size => {
  fs.writeFileSync(`icon-${size}x${size}.svg`, svgTemplate(size));
  console.log(`Created icon-${size}x${size}.svg`);
});
EOF < /dev/null