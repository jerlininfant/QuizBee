import { AIService } from '../services/aiService.js';
import { FileService } from '../services/fileService.js';

export const generateFromText = async (req, res) => {
  try {
    const { topic, text, difficulty = 'Medium', count = 5 } = req.body;

    if (!topic && !text) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a topic title or study text to generate questions.'
      });
    }

    const questions = await AIService.generateQuestions({
      text,
      topic,
      difficulty,
      count
    });

    return res.json({
      success: true,
      questions,
      source: 'text'
    });
  } catch (err) {
    console.error('AI generate text error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate questions.' });
  }
};

export const generateFromFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { topic, difficulty = 'Medium', count = 5 } = req.body;

    // Extract text from uploaded document
    const extractedText = await FileService.extractText(file);
    if (!extractedText || extractedText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'The uploaded file does not contain enough readable text. Please check the document or enter a topic manually.'
      });
    }

    const questions = await AIService.generateQuestions({
      text: extractedText,
      topic: topic || file.originalname.replace(/\.[^/.]+$/, ''),
      difficulty,
      count
    });

    return res.json({
      success: true,
      fileInfo: {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        extractedLength: extractedText.length
      },
      questions,
      source: 'file'
    });
  } catch (err) {
    console.error('AI generate file error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to process file and generate questions.' });
  }
};

export const regenerateSingleQuestion = async (req, res) => {
  try {
    const { topic, existingQuestionText, difficulty = 'Medium' } = req.body;

    const questions = await AIService.generateQuestions({
      text: existingQuestionText || topic,
      topic,
      difficulty,
      count: 1
    });

    return res.json({
      success: true,
      question: questions[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to regenerate question.' });
  }
};
