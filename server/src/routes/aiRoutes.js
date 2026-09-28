import express from 'express';
import {
  generateFromText,
  generateFromFile,
  regenerateSingleQuestion
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/generate-text', generateFromText);
router.post('/generate-file', upload.single('file'), generateFromFile);
router.post('/regenerate-question', regenerateSingleQuestion);

export default router;
