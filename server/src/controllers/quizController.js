import { store } from '../data/store.js';

export const listQuizzes = async (req, res) => {
  try {
    const hostId = req.user.id;
    const quizzes = store.getQuizzesByHost(hostId);
    
    // Attach question counts and active room info
    const enriched = quizzes.map(q => {
      const questions = store.getQuestionsByQuizId(q.id);
      return {
        ...q,
        actual_question_count: questions.length
      };
    });

    return res.json({ success: true, quizzes: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch quizzes.' });
  }
};

export const getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = store.getQuizById(id);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found.' });
    }

    const questions = store.getQuestionsByQuizId(id);
    return res.json({
      success: true,
      quiz: {
        ...quiz,
        questions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quiz details.' });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const hostId = req.user.id;
    const {
      title,
      subject,
      difficulty = 'Medium',
      question_count = 5,
      time_per_question = 20,
      mode = 'solo',
      questions = []
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Quiz title is required.' });
    }

    const quiz = store.createQuiz({
      host_id: hostId,
      title: title.trim(),
      subject: (subject || 'General Knowledge').trim(),
      difficulty,
      question_count: parseInt(question_count, 10) || 5,
      time_per_question: parseInt(time_per_question, 10) || 20,
      mode: mode === 'team' ? 'team' : 'solo'
    });

    let savedQuestions = [];
    if (questions && questions.length > 0) {
      savedQuestions = store.saveQuestions(quiz.id, questions);
    }

    return res.status(201).json({
      success: true,
      quiz: {
        ...quiz,
        questions: savedQuestions
      }
    });
  } catch (err) {
    console.error('Create quiz error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create quiz.' });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = store.getQuizById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quiz not found.' });
    }

    const {
      title,
      subject,
      difficulty,
      question_count,
      time_per_question,
      mode,
      questions
    } = req.body;

    const updated = store.updateQuiz(id, {
      title: title !== undefined ? title.trim() : existing.title,
      subject: subject !== undefined ? subject.trim() : existing.subject,
      difficulty: difficulty || existing.difficulty,
      question_count: question_count ? parseInt(question_count, 10) : existing.question_count,
      time_per_question: time_per_question ? parseInt(time_per_question, 10) : existing.time_per_question,
      mode: mode || existing.mode
    });

    let savedQuestions = store.getQuestionsByQuizId(id);
    if (questions && Array.isArray(questions)) {
      savedQuestions = store.saveQuestions(id, questions);
    }

    return res.json({
      success: true,
      quiz: {
        ...updated,
        questions: savedQuestions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update quiz.' });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = store.deleteQuiz(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Quiz not found.' });
    }
    return res.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete quiz.' });
  }
};
