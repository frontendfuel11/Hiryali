import ort from 'onnxruntime-node';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plantColourRatio } from './vision.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = process.env.VIT_MODEL_PATH || join(HERE, '../../.cache/crop_leaf_diseases_vit.onnx');
const MODEL_URL = 'https://huggingface.co/wambugu71/crop_leaf_diseases_vit_onnx/resolve/main/crop_leaf_diseases_vit.onnx';

const LABELS = {
  0: 'Corn___Common_Rust',
  1: 'Corn___Gray_Leaf_Spot',
  2: 'Corn___Healthy',
  3: 'Invalid',
  4: 'Potato___Early_Blight',
  5: 'Potato___Healthy',
  6: 'Potato___Late_Blight',
  7: 'Rice___Brown_Spot',
  8: 'Rice___Healthy',
  9: 'Rice___Leaf_Blast',
  10: 'Wheat___Brown_Rust',
  11: 'Wheat___Healthy',
  12: 'Wheat___Yellow_Rust',
};

let sessionPromise;

async function ensureModel() {
  try {
    await access(MODEL_PATH);
    return;
  } catch {
    // Download once, then reuse the cached ONNX file.
  }
  await mkdir(dirname(MODEL_PATH), { recursive: true });
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Could not download the crop model (${response.status}).`);
  await writeFile(MODEL_PATH, Buffer.from(await response.arrayBuffer()));
}

function getSession() {
  sessionPromise ??= (async () => {
    await ensureModel();
    return ort.InferenceSession.create(MODEL_PATH);
  })();
  return sessionPromise;
}

function decode(label) {
  if (label === 'Invalid') return { crop: 'Other', disease: 'Invalid', healthy: false, text: 'Invalid / unsupported crop' };
  const [crop, disease] = label.split('___');
  const diseaseText = (disease || '').replace(/_/g, ' ');
  return {
    crop,
    disease: diseaseText,
    healthy: /^healthy$/i.test(diseaseText),
    text: `${crop} — ${diseaseText}`,
  };
}

export async function analyzeVitImage(buffer, { crop = '', lang = 'en', message = '' } = {}) {
  const normalized = await sharp(buffer)
    .rotate()
    .resize(224, 224, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();

  const plantRatio = await plantColourRatio(normalized);
  const imageHash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const { data: pixels } = await sharp(normalized)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const input = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i += 1) {
    input[i] = (pixels[i * 3] / 255 - 0.5) / 0.5;
    input[224 * 224 + i] = (pixels[i * 3 + 1] / 255 - 0.5) / 0.5;
    input[2 * 224 * 224 + i] = (pixels[i * 3 + 2] / 255 - 0.5) / 0.5;
  }

  const session = await getSession();
  const output = await session.run({
    pixel_values: new ort.Tensor('float32', input, [1, 3, 224, 224]),
  });

  const logits = Array.from(output.output.data);
  const maxLogit = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  const predictions = exps
    .map((value, index) => ({ label: LABELS[index], score: value / sum }))
    .sort((a, b) => b.score - a.score);

  const top = predictions[0];
  const decoded = decode(top.label);
  const confidence = Math.round(top.score * 100);
  const top3 = predictions.slice(0, 3).map((p) => ({ label: decode(p.label).text, score: Number(p.score.toFixed(3)) }));
  const debug = { imageHash, imageBytes: buffer.length, plantRatio: Number(plantRatio.toFixed(3)), top3 };
  console.log('[vit]', debug);

  if (plantRatio < 0.03) {
    const issue = lang === 'ur'
      ? 'اس تصویر میں فصل یا پتے کے رنگ واضح نہیں ہیں۔ یہ فصل کی تصویر نہیں ہو سکتی۔ دن کی روشنی میں ایک متاثرہ پتے کی قریب سے تصویر لیں۔'
      : 'This image does not contain enough plant or leaf colours to analyse. It may not be a crop photo. Upload a close-up of one affected leaf in daylight.';
    return {
      photo_ok: false,
      photo_issue: issue,
      crop: crop || decoded.crop,
      overall: { label: 'fair', rating: 3, confidence: 'low' },
      summary: { en: 'The image does not look like a crop or leaf photo.', ur: 'یہ تصویر فصل یا پتے کی نہیں لگتی۔' },
      crop_findings: [],
      field_findings: [],
      actions: ['Take a close-up of one affected leaf in daylight.'],
      avoid: ['Do not apply any treatment based on an unclear photo.'],
      call_expert_if: ['The problem is spreading quickly or many plants are affected.'],
      analysisMode: 'model',
      model: 'vit_crop_leaf_diseases',
      topScore: top.score,
      plantRatio,
      debug,
      notCrop: true,
      message,
    };
  }

  if (decoded.disease === 'Invalid' || top.score < 0.2) {
    const issue = lang === 'ur'
      ? 'ماڈل اس تصویر کو معاون فصل یا بیماری سے نہیں ملا سکا۔ فصل منتخب کریں اور دن کی روشنی میں ایک واضح قریب کی تصویر لیں۔'
      : 'The model could not match this image to a supported crop disease. Select the crop and retake a clear close-up in daylight.';
    return {
      photo_ok: false,
      photo_issue: issue,
      crop: crop || decoded.crop,
      overall: { label: 'fair', rating: 3, confidence: 'low' },
      summary: { en: 'No reliable supported crop/disease class was found.', ur: 'کوئی قابلِ اعتماد فصل یا بیماری کی قسم نہیں ملی۔' },
      crop_findings: [],
      field_findings: [],
      actions: ['Select the crop and retake a close-up of one affected leaf.'],
      avoid: ['Do not apply any treatment based on an unclear result.'],
      call_expert_if: ['The problem is spreading quickly or many plants are affected.'],
      analysisMode: 'model',
      model: 'vit_crop_leaf_diseases',
      topScore: top.score,
      plantRatio,
      debug,
      notCrop: true,
      message,
    };
  }

  const healthy = decoded.healthy;
  const overallLabel = healthy ? (confidence >= 50 ? 'good' : 'fair') : confidence >= 50 ? 'poor' : 'fair';
  const rating = overallLabel === 'good' ? 4 : overallLabel === 'fair' ? 3 : 1;
  const summaryEn = `The image most closely matches "${decoded.text}" (${confidence}% confidence). ` +
    (confidence < 50
      ? 'Confidence is low, so treat this as a hint and confirm with a local agriculture officer.'
      : 'Confirm the finding in the field before taking action.');
  const summaryUr = `تصویر کا تجزیہ: ${decoded.text} (${confidence}% اعتماد)۔ ` +
    (confidence < 50 ? 'اعتماد کم ہے، مقامی زرعی ماہر سے تصدیق کریں۔' : 'کھیت میں تصدیق کے بعد اقدام کریں۔');

  return {
    photo_ok: true,
    photo_issue: '',
    crop: crop || decoded.crop,
    overall: { label: overallLabel, rating, confidence: confidence >= 65 ? 'high' : confidence >= 40 ? 'medium' : 'low' },
    summary: { en: summaryEn, ur: summaryUr },
    crop_findings: predictions.slice(0, 3).map((p) => {
      const item = decode(p.label);
      return {
        label: item.text,
        observation: `${Math.round(p.score * 100)}% confidence from the crop-disease model.`,
        status: item.healthy ? 'ok' : 'watch',
        confidence: `${Math.round(p.score * 100)}%`,
      };
    }),
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
    model: 'vit_crop_leaf_diseases',
    topScore: top.score,
    plantRatio,
    debug,
    message,
  };
}
