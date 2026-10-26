import { AIService } from '../services/aiService.js';
import { FileService } from '../services/fileService.js';

export const generateFromText = async (req, res) => {
  try {
    const { topic, text, difficulty = 'Medium', count = 5 } = req.body;
    const cleanTopic = (topic || '').trim();
    const cleanText = (text || '').trim();

    if (!cleanTopic && !cleanText) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a topic title or study notes to generate questions.'
      });
    }

    const questionCount = Math.max(1, Math.min(25, parseInt(count, 10) || 5));

    const questions = await AIService.generateQuestions({
      text: cleanText,
      topic: cleanTopic || cleanText.slice(0, 50),
      difficulty,
      count: questionCount
    });

    return res.json({
      success: true,
      questions,
      source: 'text'
    });
  } catch (err) {
    console.error('[AI Controller] generateFromText error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate questions.' });
  }
};

export const generateFromFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Please select a document.' });
    }

    const { topic, difficulty = 'Medium', count = 5 } = req.body;
    const questionCount = Math.max(1, Math.min(25, parseInt(count, 10) || 5));

    // Extract text from uploaded document safely
    let extractedText = '';
    try {
      extractedText = await FileService.extractText(file);
    } catch (err) {
      console.warn('[AI Controller] FileService extraction notice:', err.message);
    }

    const cleanFilename = file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const effectiveTopic = (topic || '').trim() || cleanFilename;

    // Supplement context if extracted text is sparse, so AI generation never fails
    const effectiveText = (extractedText && extractedText.trim().length >= 15)
      ? extractedText.trim()
      : `Key principles, concepts, and foundational subject material regarding ${effectiveTopic}.`;

    const questions = await AIService.generateQuestions({
      text: effectiveText,
      topic: effectiveTopic,
      difficulty,
      count: questionCount
    });

    return res.json({
      success: true,
      fileInfo: {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        extractedLength: extractedText ? extractedText.length : 0
      },
      questions,
      source: 'file'
    });
  } catch (err) {
    console.error('[AI Controller] generateFromFile error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to process file and generate questions.' });
  }
};

export const regenerateSingleQuestion = async (req, res) => {
  try {
    const { topic, existingQuestionText, difficulty = 'Medium' } = req.body;
    const cleanTopic = (topic || 'General Knowledge').trim();

    const questions = await AIService.generateQuestions({
      text: existingQuestionText || cleanTopic,
      topic: cleanTopic,
      difficulty,
      count: 1
    });

    return res.json({
      success: true,
      question: questions[0]
    });
  } catch (err) {
    console.error('[AI Controller] regenerateSingleQuestion error:', err);
    return res.status(500).json({ success: false, error: 'Failed to regenerate question.' });
  }
};
