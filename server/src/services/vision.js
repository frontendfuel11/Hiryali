import { pipeline } from '@huggingface/transformers';
import sharp from 'sharp';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX';
let classifierPromise;

function getClassifier() {
  classifierPromise ??= pipeline('image-classification', MODEL, { dtype: 'q8' });
  return classifierPromise;
}

const CROP_NAMES = ['Apple', 'Blueberry', 'Cherry', 'Corn', 'Grape', 'Orange', 'Peach', 'Pepper', 'Potato', 'Raspberry', 'Soybean', 'Squash', 'Strawberry', 'Tomato'];

function normalizeCrop(label, requestedCrop) {
  if (requestedCrop && requestedCrop !== 'Other') return requestedCrop;
  const match = CROP_NAMES.find((crop) => label.toLowerCase().includes(crop.toLowerCase()));
  return match || 'Crop';
}

export async function analyzeCropImage(buffer, { crop = '', lang = 'en', message = '' } = {}) {
  const normalized = await sharp(buffer)
    .rotate()
    .resize(224, 224, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();

  const tempPath = join(tmpdir(), `hiryali-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  await writeFile(tempPath, normalized);

  let predictions;
  try {
    const classifier = await getClassifier();
    predictions = await classifier(tempPath);
  } finally {
    await unlink(tempPath).catch(() => {});
  }

  const top = predictions[0];
  const confidence = Math.round(top.score * 100);
  const healthy = /^healthy/i.test(top.label);
  const label = top.label.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const cropName = normalizeCrop(top.label, crop);
  const overallLabel = healthy ? (confidence >= 50 ? 'good' : 'fair') : confidence >= 50 ? 'poor' : 'fair';
  const rating = overallLabel === 'good' ? 4 : overallLabel === 'fair' ? 3 : 1;

  const summaryEn = `The image most closely matches "${label}" (${confidence}% confidence). ` +
    (confidence < 50
      ? 'Confidence is low, so treat this as a hint and confirm with a local agriculture officer.'
      : 'Confirm the finding in the field before taking action.');
  const summaryUr = `تصویر کا تجزیہ: ${label} (${confidence}% اعتماد)۔ ` +
    (confidence < 50
      ? 'اعتماد کم ہے، اس لیے مقامی زرعی ماہر سے تصدیق کریں۔'
      : 'کوئی قدم اٹھانے سے پہلے کھیت میں تصدیق کریں۔');

  return {
    photo_ok: true,
    photo_issue: '',
    crop: cropName,
    overall: { label: overallLabel, rating, confidence: confidence >= 65 ? 'high' : confidence >= 40 ? 'medium' : 'low' },
    summary: { en: summaryEn, ur: summaryUr },
    crop_findings: predictions.slice(0, 3).map((p) => ({
      label: p.label.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim(),
      observation: `${Math.round(p.score * 100)}% confidence from the plant-disease model.`,
      status: /^healthy/i.test(p.label) ? 'ok' : 'watch',
      confidence: `${Math.round(p.score * 100)}%`,
    })),
    field_findings: [
      { label: 'Plant spacing', observation: 'Check spacing across several rows in the field.', status: 'watch' },
      { label: 'Weed pressure', observation: 'Walk the field and inspect weeds around the crop.', status: 'watch' },
      { label: 'Water stress', observation: 'Check soil moisture and plants at multiple points.', status: 'watch' },
      { label: 'Soil surface', observation: 'Look for standing water, crusting, or unusual dryness.', status: 'watch' },
    ],
    actions: healthy
      ? [
          'Keep monitoring the crop every few days for new spots or wilting.',
          'Photograph the same area again if symptoms appear.',
          'Confirm the result with a local agriculture officer before treatment.',
        ]
      : [
          'Remove and discard badly affected leaves or plants.',
          'Photograph the affected area again in daylight and check whether it is spreading.',
          'Ask a local agriculture officer to confirm before applying any treatment.',
        ],
    avoid: [
      'Do not apply pesticides based only on a photo.',
      'Do not mix chemicals without verified label guidance.',
    ],
    call_expert_if: [
      'Damage is spreading quickly or many plants are affected.',
      'You are considering pesticide use or cannot identify the cause.',
    ],
    analysisMode: 'model',
    model: 'mobilenet_v2_plant_disease',
    topScore: top.score,
    message,
  };
}
