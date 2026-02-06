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

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Convert to grayscale + increase contrast
            for (let i = 0; i < data.length; i += 4) {
                // Grayscale conversion
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

                // Contrast enhancement (make text pop)
                const contrast = 1.5;
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                const enhanced = factor * (gray - 128) + 128;

                data[i] = enhanced;     // R
                data[i + 1] = enhanced; // G
                data[i + 2] = enhanced; // B
                // Alpha channel (i+3) unchanged
            }

            // Put processed image back
            ctx.putImageData(imageData, 0, 0);

            resolve(canvas.toDataURL('image/jpeg', 0.95));
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
