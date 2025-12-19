/**
 * Banner Image Compression Script
 * Compresses the preset banner images to WebP format.
 * 
 * Run: node scripts/compress-banners.js
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const BANNER_IMAGES = [
    'Ouroboroid_season.png',
    'helmed_mondrak.png'
];

async function compressBanners() {
    console.log('📁 Processing banners in:', PUBLIC_DIR);
    console.log('');

    for (const filename of BANNER_IMAGES) {
        const inputPath = path.join(PUBLIC_DIR, filename);

        if (!fs.existsSync(inputPath)) {
            console.log(`⏭️  Skipping ${filename} (not found)`);
            continue;
        }

        const origStats = fs.statSync(inputPath);
        const origSizeKB = (origStats.size / 1024).toFixed(1);

        try {
            // Get image metadata to determine appropriate resize
            const metadata = await sharp(inputPath).metadata();

            // Target max width of 800px for banner images (they're not displayed huge)
            const targetWidth = Math.min(metadata.width, 800);

            // Create optimized PNG (keep format for transparency support)
            await sharp(inputPath)
                .resize(targetWidth, null, { withoutEnlargement: true })
                .png({
                    quality: 80,
                    compressionLevel: 9
                })
                .toFile(inputPath + '.tmp');

            // Replace original
            fs.unlinkSync(inputPath);
            fs.renameSync(inputPath + '.tmp', inputPath);

            const newStats = fs.statSync(inputPath);
            const newSizeKB = (newStats.size / 1024).toFixed(1);
            const reduction = (100 - (newStats.size / origStats.size * 100)).toFixed(1);

            console.log(`✅ ${filename}: ${origSizeKB} KB → ${newSizeKB} KB (-${reduction}%)`);
        } catch (error) {
            console.error(`❌ Failed to compress ${filename}:`, error.message);
        }
    }

    console.log('');
    console.log('🎉 Banner compression complete!');
}

compressBanners().catch(console.error);
