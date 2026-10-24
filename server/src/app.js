import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import analyzeRoutes from './routes/analyzeRoutes.js';
import chatRoutes from './routes/chat.js';
import diseaseRoutes from './routes/disease.js';
import alertsRoutes from './routes/alerts.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL, // your deployed frontend URL later
].filter(Boolean);


app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // allow tools like curl/Postman (no Origin header) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true, // needed because login uses cookies
}));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'hariyali-api', mode: process.env.ANALYSIS_MODE || 'demo' }));
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api', diseaseRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
