#!/usr/bin/env python3
"""
Create OGP image and logo for Sage's Love AI application
Using basic Python without external dependencies
"""
import os
import base64
from math import sin, cos, pi

def create_svg_logo():
    """Create a lotus flower SVG logo"""
    svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
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
</svg>'''
    return svg_content

def svg_to_png_fallback(svg_content, output_path):
    """Fallback method to convert SVG to PNG using simple replacement"""
    # Since we can't use PIL, we'll create a simple HTML file that can be used
    # to generate the PNG manually or through a browser
    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lotus Logo</title>
    <style>
        body {{ margin: 0; padding: 20px; background: white; }}
        .logo {{ width: 200px; height: 200px; }}
    </style>
</head>
<body>
    <div class="logo">
        {svg_content}
    </div>
    <script>
        // This HTML can be used to generate PNG manually
        // Right-click on the SVG and save as image
        console.log('Logo generated. Right-click to save as PNG.');
    </script>
</body>
</html>'''
    
    # Save HTML file for manual conversion
    html_path = output_path.replace('.png', '.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTML file created at: {html_path}")
    print("Open this file in a browser and save the SVG as PNG manually.")

def create_ogp_image_html():
    """Create an HTML template for OGP image generation"""
    html_content = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>OGP Image Generator</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Noto Sans JP', sans-serif;
        }
        
        .ogp-container {
            width: 1200px;
            height: 630px;
            position: relative;
            background-image: url('../dist/assets/nature-background-ICtu82nj.jpg');
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                135deg,
                rgba(30, 41, 59, 0.7) 0%,
                rgba(14, 165, 233, 0.3) 100%
            );
        }
        
        .content {
            position: relative;
            z-index: 2;
            text-align: center;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        
        .main-title {
            font-size: 72px;
            font-weight: bold;
            margin: 0 0 20px 0;
            background: linear-gradient(135deg, #0ea5e9, #1e293b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: none;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        }
        
        .subtitle {
            font-size: 36px;
            font-weight: 500;
            margin: 0;
            color: #f1f5f9;
            letter-spacing: 2px;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
    </style>
</head>
<body>
    <div class="ogp-container">
        <div class="overlay"></div>
        <div class="content">
            <h1 class="main-title">聖者の愛（AI）</h1>
            <p class="subtitle">スピリチュアル・人生相談AI</p>
        </div>
    </div>
    
    <script>
        console.log('OGP image template generated.');
        console.log('Screenshot this page at 1200x630 resolution for the OGP image.');
        
        // Set viewport for screenshot
        document.querySelector('meta[name="viewport"]')?.remove();
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=1200,height=630,initial-scale=1';
        document.head.appendChild(viewport);
    </script>
</body>
</html>'''
    return html_content

def main():
    """Main function to create images"""
    base_path = "/mnt/c/Users/heali/OneDrive/デスクトップ/sage-love/public/assets"
    
    # Create logo
    print("Creating lotus logo...")
    svg_logo = create_svg_logo()
    
    # Save SVG logo
    svg_path = os.path.join(base_path, "logo.svg")
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_logo)
    print(f"SVG logo saved at: {svg_path}")
    
    # Create HTML for PNG conversion
    logo_png_path = os.path.join(base_path, "logo.png")
    svg_to_png_fallback(svg_logo, logo_png_path)
    
    # Create OGP image HTML template
    print("Creating OGP image template...")
    ogp_html = create_ogp_image_html()
    ogp_html_path = os.path.join(base_path, "ogp-generator.html")
    with open(ogp_html_path, 'w', encoding='utf-8') as f:
        f.write(ogp_html)
    print(f"OGP HTML template saved at: {ogp_html_path}")
    
    print("\n=== INSTRUCTIONS ===")
    print("1. For Logo (PNG):")
    print(f"   - Open: {base_path}/logo.html")
    print("   - Right-click on the lotus logo and 'Save image as...'")
    print(f"   - Save as: {base_path}/logo.png")
    print()
    print("2. For OGP Image (PNG):")
    print(f"   - Open: {base_path}/ogp-generator.html")
    print("   - Take a screenshot at 1200x630 resolution")
    print(f"   - Save as: {base_path}/og-image.png")
    print()
    print("Alternative: Use browser developer tools to set viewport to 1200x630 and screenshot")

if __name__ == "__main__":
    main()