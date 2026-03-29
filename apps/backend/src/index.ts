import express from 'express';
import cors from 'cors';
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

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/facility-types', facilityTypeRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`ERTANSA Audit API sunucusu http://localhost:${PORT} adresinde calisiyor`);
});
