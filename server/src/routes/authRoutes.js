import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { cookieOptions, issueAuthCookie, requireAuth } from '../middleware/auth.js';

const router = Router();
const safeUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email, language: user.language });

router.post('/signup', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const language = req.body.language === 'ur' ? 'ur' : 'en';
  if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Name must be between 2 and 80 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'Enter a valid email address.');
  if (password.length < 8 || password.length > 128) throw new HttpError(400, 'Password must be at least 8 characters.');
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists.');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, language });
  issueAuthCookie(res, user._id);
  res.status(201).json({ user: safeUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.');
  issueAuthCookie(res, user._id);
  res.json({ user: safeUser(user) });
}));

router.post('/logout', (_req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || 'hariyali_token', { ...cookieOptions(), maxAge: undefined });
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', (req, res, next) => {
  const token = req.cookies?.[process.env.COOKIE_NAME || 'hariyali_token'];
  if (!token) return res.json({ user: null });
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    res.json({ user: safeUser(req.user) });
  });
});

export default router;
