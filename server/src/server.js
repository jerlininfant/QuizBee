import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { setupSocketHandler } from './socket/socketHandler.js';

const app = express();
const server = http.createServer(app);

// Realtime Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middlewares
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Quizbee Backend API & Realtime Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);

// Socket.IO Handler
setupSocketHandler(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 QUIZBEE Server running on http://localhost:${PORT}`);
  console.log(`⚡ Real-Time Socket.IO engine ready`);
  console.log(`🔑 Environment: ${config.nodeEnv}`);
  console.log(`===============================================`);
});

export { app, server, io };
