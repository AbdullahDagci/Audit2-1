import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import branchRoutes from './routes/branches';
import templateRoutes from './routes/templates';
import inspectionRoutes from './routes/inspections';
import userRoutes from './routes/users';
import scheduleRoutes from './routes/schedules';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import facilityTypeRoutes from './routes/facility-types';
import correctiveActionRoutes from './routes/corrective-actions';
import tutanakRoutes from './routes/tutanak';
import activityLogRoutes from './routes/activity-logs';
import settingsRoutes from './routes/settings';
import { startReminderScheduler } from './services/reminder-scheduler';

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet());

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Gzip compression (API yanıtları %60-80 küçülür)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    // Görseller zaten sıkıştırılmış, tekrar sıkıştırma
    if (req.path.startsWith('/uploads/')) return false;
    return compression.filter(req, res);
  },
}));

app.use(express.json({ limit: '50mb' }));

// Static dosyalar (7 gün cache, immutable)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: true,
  etag: true,
}));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/facility-types', facilityTypeRoutes);
app.use('/api/corrective-actions', correctiveActionRoutes);
app.use('/api/tutanak', tutanakRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

app.listen(PORT, () => {
  console.log(`ERTANSA Audit API http://localhost:${PORT} aktif`);
  startReminderScheduler();
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM alındı, kapatılıyor...');
  await prisma.$disconnect();
  process.exit(0);
});
