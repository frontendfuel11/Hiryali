import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { requireAuth } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';
import { createDemoReport } from '../services/analyzer.js';
import { analyzeByCrop } from '../services/cropAnalysis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();
router.post('/', requireAuth, (req, res, next) => imageUpload(req, res, (err) => err ? next(err) : next()), asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 2000);
  const crop = String(req.body.crop || 'Other').trim().slice(0, 50) || 'Other';
  const lang = req.body.lang === 'ur' ? 'ur' : 'en';
  const files = [...(req.files?.images || []), ...(req.files?.['images[]'] || [])];
  if (files.length && !String(req.body.crop || '').trim()) {
    throw new HttpError(400, 'Select a crop before sending a photo.');
  }
  let conversation;

  if (req.body.conversationId) {
    if (!mongoose.isValidObjectId(req.body.conversationId)) throw new HttpError(400, 'Invalid conversation id.');
    conversation = await Conversation.findOne({ _id: req.body.conversationId, user: req.user._id });
    if (!conversation) throw new HttpError(404, 'Conversation not found.');
  }
  if (files.length < 1 && !conversation?.lastReport) throw new HttpError(400, 'Attach at least one crop or field photo to start a check.');
  if (files.length > 4) throw new HttpError(400, 'Attach no more than 4 images at a time.');

  if (!conversation) conversation = new Conversation({ user: req.user._id, title: crop === 'Other' ? 'New crop check' : `${crop} check`, crop, language: lang, messages: [] });
  conversation.crop = crop;
  conversation.language = lang;
  conversation.lastActivityAt = new Date();
  conversation.messages.push({ role: 'user', text: message, crop, lang, imageCount: files.length });

  // Real vision when photos are attached; text-only follow-ups use the demo
  // report until a text model is wired into this DB-backed route.
  const reports = [];
  for (const file of files.slice(0, 4)) {
    reports.push(await analyzeByCrop(file.buffer, { crop, lang, message }));
  }
  reports.sort((a, b) => (b.topScore || 0) - (a.topScore || 0));
  const report = files.length
    ? reports[0]
    : createDemoReport({ crop, lang, message, imageCount: files.length });
  conversation.lastReport = report;
  conversation.messages.push({ role: 'assistant', text: report.summary[lang] || report.summary.en, crop, lang, report });
  await conversation.save();
  res.json({ conversationId: conversation._id.toString(), ...report });
}));

export default router;
