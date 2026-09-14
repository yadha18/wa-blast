import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

import './db/index.js';
import { initWhatsApp } from './whatsapp.js';
import uploadRouter from './routes/upload.js';
import campaignRouter from './routes/campaign.js';
import waRouter from './routes/wa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
});

app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
