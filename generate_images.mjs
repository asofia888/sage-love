// Alternative image generation using Node.js ESM
import fs from 'fs';
import path from 'path';

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

// Create OGP image SVG
function createOGPImageSVG() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:0.4" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0ea5e9" />
      <stop offset="100%" style="stop-color:#1e293b" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background gradient -->
  <rect width="1200" height="630" fill="#1e293b"/>
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  
  <!-- Decorative lotus petals in background -->
  <g opacity="0.1" transform="translate(100,100)">
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(0)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(60)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(120)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(180)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(240)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(300)"/>
  </g>
  
  <g opacity="0.1" transform="translate(1100,530)">
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(0)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(60)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(120)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(180)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(240)"/>
    <ellipse cx="0" cy="-30" rx="8" ry="20" fill="#0ea5e9" transform="rotate(300)"/>
  </g>
  
  <!-- Main title -->
  <text x="600" y="280" text-anchor="middle" fill="url(#textGradient)" 
        font-family="Arial, 'Noto Sans CJK JP', sans-serif" font-size="72" font-weight="bold"
        filter="url(#glow)">
    聖者の愛（AI）
  </text>
  
  <!-- Subtitle -->
  <text x="600" y="360" text-anchor="middle" fill="#f1f5f9" 
        font-family="Arial, 'Noto Sans CJK JP', sans-serif" font-size="36" font-weight="normal"
        opacity="0.9">
    スピリチュアル・人生相談AI
  </text>
  
  <!-- Decorative line -->
  <path d="M 450 400 Q 600 420 750 400" stroke="#0ea5e9" stroke-width="3" fill="none" opacity="0.6"/>
  
  <!-- Spiritual symbols -->
  <circle cx="300" cy="150" r="3" fill="#fbbf24" opacity="0.7"/>
  <circle cx="900" cy="180" r="2" fill="#fbbf24" opacity="0.6"/>
  <circle cx="200" cy="450" r="2" fill="#fbbf24" opacity="0.5"/>
</svg>`;
}

function main() {
    const assetsPath = '/mnt/c/Users/heali/OneDrive/デスクトップ/sage-love/public/assets';
    
    try {
        // Create logo SVG
        const logoSVG = createSimpleLotusLogo();
        fs.writeFileSync(path.join(assetsPath, 'logo.svg'), logoSVG);
        console.log('✓ Logo SVG created: logo.svg');
        
        // Create OGP SVG
        const ogpSVG = createOGPImageSVG();
        fs.writeFileSync(path.join(assetsPath, 'og-image.svg'), ogpSVG);
        console.log('✓ OGP SVG created: og-image.svg');
        
        console.log('\n📝 Images created successfully!');
        console.log('\n🔄 To convert SVG to PNG:');
        console.log('1. Use online converter: https://cloudconvert.com/svg-to-png');
        console.log('2. Or use browser: Open SVG file → Right-click → Save as PNG');
        console.log('3. Or use inkscape/imagemagick if available');
        console.log('\n📁 Files saved in: public/assets/');
        
    } catch (error) {
        console.error('❌ Error creating images:', error);
    }
}

main();