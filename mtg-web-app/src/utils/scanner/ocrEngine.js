import { createWorker } from 'tesseract.js';
import { preprocessImage } from './imagePreprocessor';

let worker = null;

/**
 * Initialize Tesseract worker (reusable)
 */
async function getWorker() {
    if (!worker) {
        worker = await createWorker('eng', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        // Configure for MTG card names
        await worker.setParameters({
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,'-. ",
            tessedit_pageseg_mode: '11', // Sparse text
        });
    }
    return worker;
}

/**
 * Process image and extract text
 * @param {string} imageDataUrl - Base64 image
 * @returns {Promise<string>} - Extracted text
 */
export async function processImage(imageDataUrl) {
    try {
        // Preprocess for better OCR
        const preprocessed = await preprocessImage(imageDataUrl);

        // Get worker
        const ocrWorker = await getWorker();

        // Perform OCR
        const { data } = await ocrWorker.recognize(preprocessed);

        console.log('Raw OCR text:', data.text);

        // Clean up extracted text
        const cleaned = cleanOCRText(data.text);

        return cleaned;
    } catch (error) {
        console.error('OCR failed:', error);
        throw error;
    }
}

/**
 * Clean up OCR output
 */
function cleanOCRText(rawText) {
    return rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 2) // Remove single char noise
        .join('\n');
}

/**
 * Cleanup when done
 */
export async function terminateWorker() {
    if (worker) {
        await worker.terminate();
        worker = null;
    }
}
