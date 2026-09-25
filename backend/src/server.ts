import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import apiRouter from '../../api/routes';

const app = express();
const PORT = process.env.PORT || 5001;

// 1. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite inline styles & scripts
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5001',
  process.env.APP_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, same-origin, mobile)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// 3. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Limit each IP to 600 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25, // 25 attempts per 15 minutes on registration/auth
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Request Body Parsers with Controlled Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Mount Unified API Router under /api
app.use('/api', apiRouter);

// 6. Production Static SPA Serving
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.use((_req, res, next) => {
  if (_req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Tela API is running. Build frontend with `npm run build` to serve client here.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Tela Server] Running on http://localhost:${PORT}`);
});

export default app;
