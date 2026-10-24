import { Router } from 'express';
import { imageUpload } from '../middleware/upload.js';
import { analyzeCropImage } from '../services/vision.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

// /api/detect-disease (original path) and /api/disease/detect (new path)
router.post(['/detect-disease', '/detect'], (req, res, next) => {
  imageUpload(req, res, (err) => (err ? next(err) : next()));
}, asyncHandler(async (req, res) => {
  const files = [
    ...(req.files?.cropImage || []),
    ...(req.files?.images || []),
    ...(req.files?.['images[]'] || []),
  ];
  if (!files.length) throw new HttpError(400, 'No image provided. Attach a crop photo.');
  if (files.length > 4) throw new HttpError(400, 'Attach no more than 4 images at a time.');

  const reports = [];
  for (const file of files.slice(0, 4)) {
    reports.push(await analyzeCropImage(file.buffer, {
      crop: String(req.body?.crop || '').trim().slice(0, 50),
      lang: req.body?.lang === 'ur' ? 'ur' : 'en',
      message: String(req.body?.message || '').slice(0, 2000),
    }));
  }

  // Use the most confident photo when several are attached.
  reports.sort((a, b) => (b.topScore || 0) - (a.topScore || 0));
  const report = reports[0];

  res.json({
    success: true,
    conversationId: `disease-${Date.now()}`,
    disease: report.crop_findings?.[0]?.label || report.crop,
    confidence: report.overall?.confidence,
    imagesAnalyzed: reports.length,
    predictions: reports.map((r) => ({
      crop: r.crop,
      label: r.crop_findings?.[0]?.label || '',
      score: r.topScore || 0,
    })),
    ...report,
  });
}));

export default router;
