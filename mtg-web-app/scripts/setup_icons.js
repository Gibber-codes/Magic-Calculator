import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_IMAGE = 'C:/Users/gabri/.gemini/antigravity/brain/fc3c498e-b7a4-4be4-92cd-8becffa85e43/uploaded_image_1765934138720.png';
const TARGET_DIR = path.join(__dirname, '../public/icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const EXTRAS = ['new-game.png']; // 96x96 mostly

function setupIcons() {
    // 1. Ensure directory exists
    if (!fs.existsSync(TARGET_DIR)) {
        console.log(`Creating directory: ${TARGET_DIR}`);
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // 2. Read Source
    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error(`Source image not found at: ${SOURCE_IMAGE}`);
        process.exit(1);
    }

    console.log('Reading source image...');
    const imgData = fs.readFileSync(SOURCE_IMAGE);

    // 3. Generate Files
    console.log('Generating icons...');

    // Standard sizes
    SIZES.forEach(size => {
        const filename = `icon-${size}.png`;
        const targetPath = path.join(TARGET_DIR, filename);
        fs.writeFileSync(targetPath, imgData);
        console.log(`Created ${filename}`);
    });

    // Extras
    EXTRAS.forEach(filename => {
        const targetPath = path.join(TARGET_DIR, filename);
        fs.writeFileSync(targetPath, imgData);
        console.log(`Created ${filename}`);
    });

    console.log('Done! All icons created (using the same high-res source).');
}

setupIcons();
