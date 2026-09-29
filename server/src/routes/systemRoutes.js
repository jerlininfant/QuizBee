import express from 'express';
import { getSystemStatus, updateSystemConfig } from '../controllers/systemController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Status can be queried by host
router.get('/status', getSystemStatus);

// Updating configuration requires authenticated host
router.post('/configure', authenticate, updateSystemConfig);

export default router;
