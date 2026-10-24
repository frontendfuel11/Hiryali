import { pipeline } from '@huggingface/transformers';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX';
let classifierPromise;

function getClassifier() {
  // fp32 is noticeably better calibrated than the int8 build.
  classifierPromise ??= pipeline('image-classification', MODEL, { dtype: 'fp32' });
  return classifierPromise;
}

const CROP_NAMES = ['Apple', 'Blueberry', 'Cherry', 'Corn', 'Grape', 'Orange', 'Peach', 'Pepper', 'Potato', 'Raspberry', 'Soybean', 'Squash', 'Strawberry', 'Tomato'];

function normalizeCrop(label, requestedCrop) {
  if (requestedCrop && requestedCrop !== 'Other') return requestedCrop;
  const match = CROP_NAMES.find((crop) => label.toLowerCase().includes(crop.toLowerCase()));
  return match || 'Crop';
}

function cleanLabel(label) {
  return label.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function plantColourRatio(jpegBuffer) {
  const { data: pixels } = await sharp(jpegBuffer)
    .resize(64, 64, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let plantPixels = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const green = sat > 0.15 && g > 40 && g >= b * 1.05 && g >= r * 0.85;
    const brownOrYellow = sat > 0.2 && r > 40 && r > b * 1.08 && g >= b;
    if (green || brownOrYellow) plantPixels += 1;
  }

  return plantPixels / (pixels.length / 3);
}

export async function analyzeCropImage(buffer, { crop = '', lang = 'en', message = '' } = {}) {
  const normalized = await sharp(buffer)
    .rotate()
    .resize(224, 224, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();

  const plantRatio = await plantColourRatio(normalized);
  const imageHash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);

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
  const label = cleanLabel(top.label);
  const cropName = normalizeCrop(top.label, crop);
  const top3 = predictions.slice(0, 3).map((p) => ({ label: cleanLabel(p.label), score: Number(p.score.toFixed(3)) }));
  const debug = { imageHash, imageBytes: buffer.length, plantRatio: Number(plantRatio.toFixed(3)), top3 };

  console.log('[vision]', debug);

  // The model always returns one of its 38 PlantVillage classes. If the image
  // has almost no plant-like colours, it is probably not a crop/leaf photo.
  if (plantRatio < 0.03) {
    const issue = lang === 'ur'
      ? 'اس تصویر میں فصل یا پتے کے رنگ واضح نہیں ہیں۔ یہ فصل کی تصویر نہیں ہو سکتی۔ دن کی روشنی میں ایک متاثرہ پتے کی قریب سے تصویر لیں۔'
      : 'This image does not contain enough plant or leaf colours to analyse. It may not be a crop photo. Upload a close-up of one affected leaf in daylight.';
    return {
      photo_ok: false,
      photo_issue: issue,
      crop: cropName,
      overall: { label: 'fair', rating: 3, confidence: 'low' },
      summary: {
        en: 'The image does not look like a crop or leaf photo, so no disease class was chosen.',
        ur: 'یہ تصویر فصل یا پتے کی نہیں لگتی، اس لیے بیماری کی قسم منتخب نہیں کی گئی۔',
      },
      crop_findings: [],
      field_findings: [],
      actions: ['Take a close-up of one affected leaf in daylight, filling most of the frame.'],
      avoid: ['Do not apply any treatment based on an unclear photo.'],
      call_expert_if: ['The problem is spreading quickly or many plants are affected.'],
      analysisMode: 'model',
      model: 'mobilenet_v2_plant_disease',
      topScore: top.score,
      plantRatio,
      debug,
      notCrop: true,
      message,
    };
  }

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
      label: cleanLabel(p.label),
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
    plantRatio,
    debug,
    message,
  };
}
