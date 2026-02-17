import { createWorker } from 'tesseract.js';
import { preprocessImage, cropImage } from './imagePreprocessor';

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
            tessedit_pageseg_mode: '3', // Fully automatic page segmentation
            tessjs_create_osd: '1',
        });
    }
    return worker;
}

/**
 * Process image and extract text
 * @param {string} imageDataUrl - Base64 image
 * @returns {Promise<Object>} - Extracted text and debug info
 */
export async function processImage(imageDataUrl) {
    try {
        // 1. Crop to the "Alignment Zone" (Tighter focus on Name area)
        const cropConfig = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    x: img.width * 0.05,
                    y: img.height * 0.15, // Matches UI top-[25%] (centered on 0.20 height)
                    width: img.width * 0.90,
                    height: img.height * 0.20  // Tighter vertical focus
                });
            };
            img.src = imageDataUrl;
        });

        const cropped = await cropImage(imageDataUrl, cropConfig);

        // 2. Preprocess for better OCR (Binarization)
        const preprocessed = await preprocessImage(cropped);

        // Get worker
        const ocrWorker = await getWorker();

        // Perform OCR on Cropped Area
        const result = await ocrWorker.recognize(preprocessed);

        const { data } = result;
        console.log('Final OCR Text:', data.text);
        console.log('OCR Confidence:', data.confidence);

        // Map lines with their confidence
        let lines = (data.lines || []).map(line => ({
            text: (line.text || '').trim(),
            confidence: line.confidence || 0
        })).filter(l => l.text.length > 3);

        // FALLBACK: If lines are empty but we have text, split by newline
        if (lines.length === 0 && data.text) {
            console.log('OCR Result missing discrete lines, falling back to text split...');
            lines = data.text
                .split('\n')
                .map(line => ({
                    text: line.trim(),
                    confidence: data.confidence || 0
                }))
                .filter(l => l.text.length > 3);
        }

        console.log(`Final processed lines: ${lines.length}`);

        return {
            text: data.text || '',
            lines: lines,
            overallConfidence: data.confidence || 0,
            debugImage: preprocessed
        };
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
        .filter(line => line.length > 2)
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
