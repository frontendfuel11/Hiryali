/**
 * Demo analyzer: intentionally does not claim to inspect image pixels.
 * Replace this service with a real vision model/provider before production use.
 */
export function createDemoReport({ crop = 'Other', lang = 'en', message = '', imageCount = 1 }) {
  const unusable = /\b(blurry|blur|dark|too far|unusable|not clear)\b/i.test(message);
  if (unusable) {
    return {
      photo_ok: false,
      photo_issue: lang === 'ur'
        ? 'تصویر واضح نہیں لگ رہی۔ دن کی روشنی میں پتے کی قریب سے اور کھیت کی ایک وسیع تصویر دوبارہ لیں۔'
        : 'The photo may not be clear enough for a useful check. Retake it in daylight with one close-up of a leaf and one wide field view.',
      crop,
      overall: { label: 'fair', rating: 3, confidence: 'low' },
      summary: { en: 'No reliable grade was produced for this demo request.', ur: 'اس ڈیمو درخواست کے لیے قابلِ اعتماد درجہ تیار نہیں کیا گیا۔' },
      crop_findings: [], field_findings: [], actions: [], avoid: [], call_expert_if: [], analysisMode: 'demo'
    };
  }
  return {
    photo_ok: true,
    photo_issue: '',
    crop,
    overall: { label: 'fair', rating: 3, confidence: 'low' },
    summary: {
      en: `Demo report for ${crop.toLowerCase()}: this server has received ${imageCount} image${imageCount === 1 ? '' : 's'}, but demo mode does not inspect image pixels. Check the crop and field in daylight before acting.`,
      ur: `${crop} کے لیے ڈیمو رپورٹ: سرور کو ${imageCount} تصویر موصول ہوئی، لیکن ڈیمو موڈ تصویر کا حقیقی معائنہ نہیں کرتا۔ کوئی قدم اٹھانے سے پہلے فصل اور کھیت کو دن کی روشنی میں خود دیکھیں۔`
    },
    crop_findings: [
      { label: 'Leaf condition', observation: 'Demo only: leaf colour, spots, curling, and damage have not been verified by a vision model.', status: 'watch', confidence: 'low' },
      { label: 'Growth stage', observation: 'Confirm the growth stage in person; it cannot be inferred by this demo backend.', status: 'watch', confidence: 'low' }
    ],
    field_findings: [
      { label: 'Plant spacing', observation: 'Check spacing across several rows; this demo has not measured it from the photo.', status: 'watch', confidence: 'low' },
      { label: 'Weed pressure', observation: 'Walk the field and inspect weeds around the crop.', status: 'watch', confidence: 'low' },
      { label: 'Water stress', observation: 'Check soil moisture and plants at multiple points in the field.', status: 'watch', confidence: 'low' },
      { label: 'Soil surface', observation: 'Look for standing water, crusting, or unusual dryness.', status: 'watch', confidence: 'low' },
      { label: 'Visible pest damage', observation: 'Inspect both sides of leaves and nearby plants before identifying a pest.', status: 'watch', confidence: 'low' }
    ],
    actions: [
      'Take a sharp close-up of affected leaves and a separate wide photo of the field.',
      'Record when symptoms started and whether they are spreading.',
      'Ask a local agriculture officer to verify any suspected disease or pest.'
    ],
    avoid: [
      'Do not apply pesticides based on this demo report.',
      'Do not mix chemicals without advice from a qualified local expert.'
    ],
    call_expert_if: [
      'Damage is spreading quickly or many plants are affected.',
      'You are considering pesticide use or cannot identify the cause.'
    ],
    analysisMode: 'demo'
  };
}
