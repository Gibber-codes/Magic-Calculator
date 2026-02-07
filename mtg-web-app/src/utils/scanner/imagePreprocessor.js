/**
 * Preprocess captured image to improve OCR accuracy
 * @param {string} imageDataUrl - Base64 image data URL
 * @returns {Promise<string>} - Preprocessed image data URL
 */
export async function preprocessImage(imageDataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Grayscale + Simple Sharpen
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }

            // Simple Sharpening placeholder (Tesseract does better with sharpened edges)
            // We'll just increase contrast slightly for now as JS sharpening is heavy
            const contrast = 20;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
                data[i + 1] = data[i];
                data[i + 2] = data[i];
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageDataUrl;
    });
}

/**
 * Crop image to region of interest (optional enhancement)
 * @param {string} imageDataUrl 
 * @param {Object} cropRegion - {x, y, width, height}
 */
export function cropImage(imageDataUrl, cropRegion) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = cropRegion.width;
            canvas.height = cropRegion.height;

            ctx.drawImage(
                img,
                cropRegion.x,
                cropRegion.y,
                cropRegion.width,
                cropRegion.height,
                0,
                0,
                cropRegion.width,
                cropRegion.height
            );

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = imageDataUrl;
    });
}
