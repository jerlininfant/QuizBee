import { store } from '../data/store.js';
import { RoomService } from '../services/roomService.js';
import { ScoringService } from '../services/scoringService.js';

export const createRoom = async (req, res) => {
  try {
    const { quizId } = req.body;
    const hostId = req.user.id;

    if (!quizId) {
      return res.status(400).json({ success: false, error: 'quizId is required to create a room.' });
    }

    const { room, quiz } = RoomService.createRoom({ quizId, hostId });
    const questions = store.getQuestionsByQuizId(quizId);

    console.log(`[API] Room created: ${room.room_code} | quiz="${quiz.title}" | hostId=${hostId}`);

    return res.status(201).json({
      success: true,
      room,
      quiz: {
        ...quiz,
        total_questions: questions.length
      }
    });
  } catch (err) {
    console.error('[API] Create room error:', err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const room = store.getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const quiz = store.getQuizById(room.quiz_id);
    const questions = store.getQuestionsByQuizId(room.quiz_id);
    const players = store.getPlayersByRoom(code);
    const teams = store.getTeamsByRoom(code);

    return res.json({
      success: true,
      room,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject,
        time_per_question: quiz.time_per_question,
        mode: quiz.mode,
        total_questions: questions.length
      },
      players,
      teams
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve room.' });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const { playerName, teamId, socketId } = req.body;

    console.log(`[API] POST /rooms/${code}/join | playerName="${playerName}"`);

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter your player nickname.' });
    }

    const { player, room } = RoomService.joinRoom({
      roomCode: code,
      playerName,
      teamId,
      socketId
    });

    const quiz = store.getQuizById(room.quiz_id);

    console.log(`[API] Player "${player.name}" (id=${player.id}) joined room ${code}`);

    return res.json({
      success: true,
      player,
      room: {
        code: room.room_code,
        status: room.status,
        mode: quiz ? quiz.mode : 'solo',
        quiz_title: quiz ? quiz.title : 'Quizbee Challenge'
      }
    });
  } catch (err) {
    console.error(`[API] Join room error:`, err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getRoomResults = async (req, res) => {
  try {
    const { code } = req.params;
    const room = store.getRoomByCode(code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const quiz = store.getQuizById(room.quiz_id);
    const questions = store.getQuestionsByQuizId(room.quiz_id);
    const players = store.getPlayersByRoom(code);
    const teams = store.getTeamsByRoom(code);
    const answers = store.getAnswersByRoom(code);

    const results = ScoringService.calculateFinalResults(
      players,
      teams,
      answers,
      questions.length,
      room.mode || 'solo'
    );

    return res.json({
      success: true,
      room,
      quiz: {
        title: quiz?.title || 'Quiz',
        subject: quiz?.subject || 'Subject'
      },
      results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to calculate room results.' });
  }
};
