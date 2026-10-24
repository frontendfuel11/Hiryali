import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .select('title crop language lastActivityAt createdAt updatedAt')
    .sort({ lastActivityAt: -1 }).limit(100).lean();
  res.json({ conversations: conversations.map(c => ({ id: c._id.toString(), title: c.title, crop: c.crop, language: c.language, lastActivityAt: c.lastActivityAt, createdAt: c.createdAt })) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid conversation id.');
  const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!conversation) throw new HttpError(404, 'Conversation not found.');
  res.json({ conversation: { id: conversation._id.toString(), title: conversation.title, crop: conversation.crop, language: conversation.language, messages: conversation.messages, lastActivityAt: conversation.lastActivityAt } });
}));

export default router;
