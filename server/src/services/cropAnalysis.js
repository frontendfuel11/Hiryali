import { analyzeCropImage } from './vision.js';
import { analyzeVitImage } from './vitVision.js';

// The ViT model is trained specifically on wheat, rice, corn, and potato.
// The MobileNet model covers the other PlantVillage crops.
const VIT_CROPS = new Set(['Wheat', 'Rice', 'Corn', 'Potato']);

export const SUPPORTED_CROPS = ['Wheat', 'Rice', 'Corn', 'Potato', 'Pepper', 'Tomato', 'Other'];

export function analyzeByCrop(buffer, options = {}) {
  const crop = String(options.crop || '').trim();
  return VIT_CROPS.has(crop)
    ? analyzeVitImage(buffer, options)
    : analyzeCropImage(buffer, options);
}
