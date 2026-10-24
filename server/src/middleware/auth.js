import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const issueAuthCookie = (res, userId) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  const token = jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.cookie(process.env.COOKIE_NAME || 'hariyali_token', token, cookieOptions());
};

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[process.env.COOKIE_NAME || 'hariyali_token'];
  if (!token) throw new HttpError(401, 'Please log in to continue.');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new HttpError(401, 'Your session has expired. Please log in again.'); }
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account not found. Please log in again.');
  req.user = user;
  next();
});
