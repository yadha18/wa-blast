import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import './db/index.js';
import { initWhatsApp } from './whatsapp.js';
import uploadRouter from './routes/upload.js';
import campaignRouter from './routes/campaign.js';
import waRouter from './routes/wa.js';
import { DATA_DIR } from './config.js';

const PORT = process.env.PORT || 4000;
// Comma-separated list so both a local dev origin and a deployed frontend
// origin can be allowed at once, e.g. "http://localhost:5173,https://app.vercel.app"
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS },
});

app.set('io', io);

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

app.use('/api/upload', uploadRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/wa', waRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

initWhatsApp(io);

httpServer.listen(PORT, () => {
  console.log(`WA Bulk Blast server running on http://localhost:${PORT}`);
});
