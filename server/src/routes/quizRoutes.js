import express from 'express';
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz
} from '../controllers/quizController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listQuizzes);
router.post('/', createQuiz);
router.get('/:id', getQuiz);
router.put('/:id', updateQuiz);
router.delete('/:id', deleteQuiz);

export default router;
