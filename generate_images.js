// Alternative image generation using Node.js and Canvas (if available)
// This is a backup method

const fs = require('fs');
const path = require('path');

// Create a simple text-based OGP image data URL
function createOGPImageDataURL() {
    // Create SVG content for OGP image
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b;stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:0.3" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0ea5e9" />
      <stop offset="100%" style="stop-color:#1e293b" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="#1e293b"/>
  
  <!-- Overlay gradient -->
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  
  <!-- Decorative circles -->
  <circle cx="100" cy="100" r="50" fill="#0ea5e9" opacity="0.1"/>
  <circle cx="1100" cy="530" r="80" fill="#0ea5e9" opacity="0.08"/>
  <circle cx="200" cy="500" r="30" fill="#fbbf24" opacity="0.15"/>
  
  <!-- Main text -->
  <text x="600" y="280" text-anchor="middle" fill="url(#textGradient)" 
        font-family="Arial, sans-serif" font-size="72" font-weight="bold">
    聖者の愛（AI）
  </text>
  
  <!-- Subtitle -->
  <text x="600" y="350" text-anchor="middle" fill="#f1f5f9" 
        font-family="Arial, sans-serif" font-size="36" font-weight="normal">
    スピリチュアル・人生相談AI
  </text>
  
  <!-- Additional decorative elements -->
  <path d="M 500 400 Q 600 420 700 400" stroke="#0ea5e9" stroke-width="2" fill="none" opacity="0.6"/>
</svg>`;

    // Convert SVG to base64 data URL
    const base64 = Buffer.from(svgContent).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

// Create simple lotus logo SVG
function createSimpleLotusLogo() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lotusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Outer petals -->
  <g transform="translate(100,100)">
    <!-- 8 outer petals -->
    <g fill="url(#lotusGradient)" opacity="0.8">
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(0)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(45)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(90)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(135)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(180)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(225)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(270)"/>
      <ellipse cx="0" cy="-45" rx="12" ry="35" transform="rotate(315)"/>
    </g>
    
    <!-- Inner petals -->
    <g fill="url(#lotusGradient)" opacity="0.9">
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(22.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(67.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(112.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(157.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(202.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(247.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(292.5)"/>
      <ellipse cx="0" cy="-30" rx="10" ry="25" transform="rotate(337.5)"/>
    </g>
    
    <!-- Center -->
    <circle cx="0" cy="0" r="15" fill="url(#centerGradient)"/>
    <circle cx="0" cy="0" r="8" fill="#fbbf24" opacity="0.8"/>
  </g>
</svg>`;
}

function main() {
    const assetsPath = '/mnt/c/Users/heali/OneDrive/デスクトップ/sage-love/public/assets';
    
    try {
        // Create logo SVG
        const logoSVG = createSimpleLotusLogo();
        fs.writeFileSync(path.join(assetsPath, 'logo.svg'), logoSVG);
        console.log('✓ Logo SVG created');
        
        // Create OGP SVG
        const ogpDataURL = createOGPImageDataURL();
        const ogpSVG = Buffer.from(ogpDataURL.split(',')[1], 'base64').toString();
        fs.writeFileSync(path.join(assetsPath, 'og-image.svg'), ogpSVG);
        console.log('✓ OGP SVG created');
        
        console.log('\n📝 Next steps:');
        console.log('1. Convert SVG files to PNG using an online converter or browser');
        console.log('2. Rename the converted files to logo.png and og-image.png');
        console.log('3. SVG files can also be used directly in some contexts');
        
    } catch (error) {
        console.error('Error creating images:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createOGPImageDataURL, createSimpleLotusLogo };