/**
 * Icon Resizing Script
 * Uses sharp to generate properly sized PWA icons from a source image.
 * 
 * Run: npm install sharp && node scripts/resize-icons.js
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Source image path (the high-res icon)
const SOURCE_IMAGE = path.join(__dirname, '..', '..', '..', '.gemini', 'antigravity', 'brain', 'fc496569-2f17-4e85-bc90-0d0962bfa581', 'uploaded_image_1766111148144.png');

// Fallback: check for a local source in the scripts folder
const LOCAL_SOURCE = path.join(__dirname, 'source-icon.png');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

// Icon sizes to generate
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
    // Try to use the user's uploaded image first, then fall back to local
    let sourceImage = SOURCE_IMAGE;
    if (!fs.existsSync(sourceImage)) {
        sourceImage = LOCAL_SOURCE;
    }

    if (!fs.existsSync(sourceImage)) {
        console.error('❌ Source image not found. Please place your icon at:');
        console.error('   ', sourceImage);
        process.exit(1);
    }

    console.log('📸 Source image:', sourceImage);
    console.log('📁 Output directory:', OUTPUT_DIR);
    console.log('');

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const size of ICON_SIZES) {
        const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

        try {
            await sharp(sourceImage)
                .resize(size, size, {
                    fit: 'cover',
                    position: 'centre'
                })
                .png({
                    quality: 80,
                    compressionLevel: 9
                })
                .toFile(outputPath);

            const stats = fs.statSync(outputPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`✅ Generated icon-${size}.png (${sizeKB} KB)`);
        } catch (error) {
            console.error(`❌ Failed to generate icon-${size}.png:`, error.message);
        }
    }

    // Also generate the new-game icon
    const newGamePath = path.join(OUTPUT_DIR, 'new-game.png');
    try {
        await sharp(sourceImage)
            .resize(96, 96, {
                fit: 'cover',
                position: 'centre'
            })
            .png({
                quality: 80,
                compressionLevel: 9
            })
            .toFile(newGamePath);

        const stats = fs.statSync(newGamePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`✅ Generated new-game.png (${sizeKB} KB)`);
    } catch (error) {
        console.error('❌ Failed to generate new-game.png:', error.message);
    }

    console.log('');
    console.log('🎉 Icon generation complete!');
}

generateIcons().catch(console.error);
