import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema({
  label: { type: String, required: true },
  observation: { type: String, required: true },
  status: { type: String, enum: ['ok', 'watch', 'problem'], default: 'watch' },
  confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  photo_ok: { type: Boolean, default: true },
  photo_issue: { type: String, default: '' },
  crop: { type: String, default: 'Unknown crop' },
  overall: { label: { type: String, enum: ['good', 'fair', 'poor'], default: 'fair' }, rating: { type: Number, min: 1, max: 5, default: 3 }, confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'low' } },
  summary: { en: String, ur: String },
  crop_findings: [findingSchema],
  field_findings: [findingSchema],
  actions: [String], avoid: [String], call_expert_if: [String],
  analysisMode: { type: String, default: 'demo' }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, default: '' },
  crop: { type: String, default: 'Other' },
  lang: { type: String, enum: ['en', 'ur'], default: 'en' },
  imageCount: { type: Number, default: 0 },
  report: { type: reportSchema, default: undefined },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const conversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New crop check', maxlength: 120 },
  crop: { type: String, default: 'Other' },
  language: { type: String, enum: ['en', 'ur'], default: 'en' },
  messages: [messageSchema],
  lastReport: { type: reportSchema, default: undefined },
  lastActivityAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

conversationSchema.index({ user: 1, lastActivityAt: -1 });
export default mongoose.model('Conversation', conversationSchema);
