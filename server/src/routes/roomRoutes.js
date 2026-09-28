import express from 'express';
import {
  createRoom,
  getRoom,
  joinRoom,
  getRoomResults
} from '../controllers/roomController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Host creates room
router.post('/create', authenticate, createRoom);

// Public player and host room info & join
router.get('/:code', getRoom);
router.post('/:code/join', joinRoom);
router.get('/:code/results', getRoomResults);

export default router;
