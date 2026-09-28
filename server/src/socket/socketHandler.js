import { store } from '../data/store.js';
import { ScoringService } from '../services/scoringService.js';
import { RoomService } from '../services/roomService.js';

// Timer storage for active questions: roomCode -> timeout
const questionTimers = new Map();

export function setupSocketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    // 1. Join room lobby or quiz channel
    socket.on('join_room', ({ roomCode, playerId, isHost }) => {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      console.log(`[Socket] join_room | code=${code} | playerId=${playerId || 'N/A'} | isHost=${!!isHost} | socket=${socket.id}`);
      socket.join(code);
      socket.roomCode = code;
      socket.playerId = playerId;
      socket.isHost = !!isHost;

      if (playerId) {
        store.updatePlayer(playerId, { socket_id: socket.id, connected: true });
      }

      // Broadcast updated lobby/room details to everyone in room
      emitRoomState(io, code);

      const currentRoom = store.getRoomByCode(code);
      if (currentRoom && currentRoom.status === 'live') {
        const quiz = store.getQuizById(currentRoom.quiz_id);
        const questions = store.getQuestionsByQuizId(currentRoom.quiz_id);
        const currentQ = questions[currentRoom.current_question_index];
        if (currentQ) {
          const timeLimit = quiz ? quiz.time_per_question : 20;
          const playerPayload = {
            questionIndex: currentRoom.current_question_index,
            totalQuestions: questions.length,
            questionId: currentQ.id,
            questionText: currentQ.question_text,
            optionA: currentQ.option_a,
            optionB: currentQ.option_b,
            optionC: currentQ.option_c,
            optionD: currentQ.option_d,
            timeLimit,
            startTime: currentRoom.question_start_time || Date.now()
          };
          const hostPayload = {
            ...playerPayload,
            correctAnswer: currentQ.correct_answer,
            explanation: currentQ.explanation
          };
          socket.emit('question_started', { playerPayload, hostPayload });
        }
      }
    });

    // 2. Team creation
    socket.on('create_team', ({ roomCode, teamName, playerId }) => {
      try {
        const code = roomCode.toUpperCase();
        const team = RoomService.createTeam({ roomCode: code, teamName, playerId });
        io.to(code).emit('team_created', { team });
        emitRoomState(io, code);
      } catch (err) {
        socket.emit('error_message', { message: err.message });
      }
    });

    // 3. Team join
    socket.on('join_team', ({ roomCode, teamId, playerId }) => {
      try {
        const code = roomCode.toUpperCase();
        RoomService.assignPlayerToTeam(playerId, teamId);
        io.to(code).emit('team_joined', { teamId, playerId });
        emitRoomState(io, code);
      } catch (err) {
        socket.emit('error_message', { message: err.message });
      }
    });

    // 4. Host starts quiz
    socket.on('start_quiz', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const room = store.getRoomByCode(code);
      if (!room) return;

      const quiz = store.getQuizById(room.quiz_id);
      const questions = store.getQuestionsByQuizId(room.quiz_id);
      if (!questions || questions.length === 0) {
        socket.emit('error_message', { message: 'Quiz has no questions to start.' });
        return;
      }

      store.updateRoom(code, {
        status: 'live',
        current_question_index: 0,
        question_start_time: Date.now()
      });

      io.to(code).emit('quiz_started', {
        roomCode: code,
        totalQuestions: questions.length
      });

      sendCurrentQuestion(io, code, 0);
    });

    // 5. Host pauses quiz
    socket.on('pause_quiz', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const room = store.getRoomByCode(code);
      if (!room || room.status !== 'live') return;

      // Clear current question timer
      if (questionTimers.has(code)) {
        clearTimeout(questionTimers.get(code));
        questionTimers.delete(code);
      }

      store.updateRoom(code, { status: 'paused' });
      io.to(code).emit('quiz_paused', { roomCode: code });
    });

    // 6. Host resumes quiz
    socket.on('resume_quiz', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const room = store.getRoomByCode(code);
      if (!room || room.status !== 'paused') return;

      store.updateRoom(code, { status: 'live' });
      io.to(code).emit('quiz_resumed', { roomCode: code });
      
      // Send question timer continuation or proceed
      const questions = store.getQuestionsByQuizId(room.quiz_id);
      const currentQ = questions[room.current_question_index];
      if (currentQ) {
        sendCurrentQuestion(io, code, room.current_question_index);
      }
    });

    // 7. Host requests next question
    socket.on('next_question', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const room = store.getRoomByCode(code);
      if (!room) return;

      if (questionTimers.has(code)) {
        clearTimeout(questionTimers.get(code));
        questionTimers.delete(code);
      }

      const questions = store.getQuestionsByQuizId(room.quiz_id);
      const nextIndex = room.current_question_index + 1;

      if (nextIndex >= questions.length) {
        finishQuiz(io, code);
      } else {
        store.updateRoom(code, {
          status: 'live',
          current_question_index: nextIndex,
          question_start_time: Date.now()
        });
        sendCurrentQuestion(io, code, nextIndex);
      }
    });

    // 8. Host ends quiz manually
    socket.on('end_quiz', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      finishQuiz(io, code);
    });

    // 9. Player submits answer
    socket.on('submit_answer', ({ roomCode, playerId, questionId, selectedOption, clientSubmitTime }) => {
      const code = roomCode.toUpperCase();
      const room = store.getRoomByCode(code);
      if (!room || room.status !== 'live') {
        socket.emit('answer_result', { error: 'Quiz is not active.' });
        return;
      }

      const questions = store.getQuestionsByQuizId(room.quiz_id);
      const currentQ = questions[room.current_question_index];

      // Validate question ID matches currently active question
      if (!currentQ || currentQ.id !== questionId) {
        socket.emit('answer_result', { error: 'Answer submitted for invalid or expired question.' });
        return;
      }

      // Prevent duplicate submission
      if (store.hasPlayerAnswered(code, playerId, questionId)) {
        socket.emit('answer_result', { error: 'You have already submitted an answer for this question.' });
        return;
      }

      const player = store.getPlayerById(playerId);
      if (!player) {
        socket.emit('answer_result', { error: 'Player record not found.' });
        return;
      }

      // Authoritative response time calculation
      const now = Date.now();
      const startTime = room.question_start_time || now;
      const responseTimeSeconds = Math.max(0.1, (now - startTime) / 1000);
      const quiz = store.getQuizById(room.quiz_id);
      const timeLimit = quiz ? quiz.time_per_question : 20;

      // Validate correct option server-side
      const isCorrect = (selectedOption || '').toUpperCase() === currentQ.correct_answer.toUpperCase();
      const points = ScoringService.calculateScore(isCorrect, responseTimeSeconds, timeLimit);

      // Record answer
      store.recordAnswer({
        room_code: code,
        player_id: playerId,
        question_id: questionId,
        answer: selectedOption,
        is_correct: isCorrect,
        response_time: parseFloat(responseTimeSeconds.toFixed(2)),
        points: points
      });

      // Update player score
      const newScore = (player.score || 0) + points;
      store.updatePlayer(playerId, { score: newScore });

      // If player is in a team, update team score
      if (player.team_id) {
        const team = store.getTeamById(player.team_id);
        if (team) {
          store.updateTeam(team.id, { score: (team.score || 0) + points });
        }
      }

      // Send individual result back to player
      socket.emit('answer_result', {
        isCorrect,
        pointsAwarded: points,
        correctAnswer: currentQ.correct_answer,
        explanation: currentQ.explanation,
        totalScore: newScore
      });

      // Notify host and room that an answer was submitted
      const answeredCount = store.getAnswersByRoomAndQuestion(code, questionId).length;
      const totalPlayers = store.getPlayersByRoom(code).length;

      io.to(code).emit('answer_submitted', {
        playerId,
        answeredCount,
        totalPlayers
      });

      // Update live leaderboard for Host & players
      emitLeaderboardUpdate(io, code);

      // Check if all players have answered
      if (answeredCount >= totalPlayers && totalPlayers > 0) {
        // All players answered early! End current question
        handleQuestionTimeout(io, code, room.current_question_index);
      }
    });

    // 10. Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} | reason=${reason} | playerId=${socket.playerId || 'N/A'}`);
      if (socket.playerId) {
        store.updatePlayer(socket.playerId, { connected: false });
        if (socket.roomCode) {
          io.to(socket.roomCode).emit('player_left', { playerId: socket.playerId });
          emitRoomState(io, socket.roomCode);
        }
      }
    });
  });
}

/**
 * Sends current question to players (without correct_answer) and host (with correct_answer)
 */
function sendCurrentQuestion(io, roomCode, questionIndex) {
  const code = roomCode.toUpperCase();
  const room = store.getRoomByCode(code);
  if (!room) return;

  const quiz = store.getQuizById(room.quiz_id);
  const questions = store.getQuestionsByQuizId(room.quiz_id);
  const currentQ = questions[questionIndex];
  if (!currentQ) return;

  const timeLimit = quiz ? quiz.time_per_question : 20;
  store.updateRoom(code, { question_start_time: Date.now() });

  // Player payload DOES NOT include correct_answer or explanation
  const playerPayload = {
    questionIndex,
    totalQuestions: questions.length,
    questionId: currentQ.id,
    questionText: currentQ.question_text,
    optionA: currentQ.option_a,
    optionB: currentQ.option_b,
    optionC: currentQ.option_c,
    optionD: currentQ.option_d,
    timeLimit,
    startTime: Date.now()
  };

  // Host payload includes correct answer and stats
  const hostPayload = {
    ...playerPayload,
    correctAnswer: currentQ.correct_answer,
    explanation: currentQ.explanation
  };

  // Broadcast to room
  io.to(code).emit('question_started', {
    playerPayload,
    hostPayload
  });

  // Set authoritative question timeout
  if (questionTimers.has(code)) {
    clearTimeout(questionTimers.get(code));
  }

  const timer = setTimeout(() => {
    handleQuestionTimeout(io, code, questionIndex);
  }, (timeLimit + 1) * 1000);

  questionTimers.set(code, timer);
}

/**
 * Handle question timer expiration
 */
function handleQuestionTimeout(io, roomCode, questionIndex) {
  const code = roomCode.toUpperCase();
  if (questionTimers.has(code)) {
    clearTimeout(questionTimers.get(code));
    questionTimers.delete(code);
  }

  const room = store.getRoomByCode(code);
  if (!room) return;

  const questions = store.getQuestionsByQuizId(room.quiz_id);
  const currentQ = questions[questionIndex];
  if (!currentQ) return;

  // Reveal correct answer and statistics for this question
  const answers = store.getAnswersByRoomAndQuestion(code, currentQ.id);
  const answerBreakdown = { A: 0, B: 0, C: 0, D: 0 };
  answers.forEach(a => {
    const opt = (a.answer || '').toUpperCase();
    if (answerBreakdown[opt] !== undefined) answerBreakdown[opt]++;
  });

  io.to(code).emit('question_ended', {
    questionIndex,
    questionId: currentQ.id,
    correctAnswer: currentQ.correct_answer,
    explanation: currentQ.explanation,
    answerBreakdown,
    totalSubmissions: answers.length
  });

  emitLeaderboardUpdate(io, code);
}

/**
 * Finish quiz and calculate final authoritative results
 */
function finishQuiz(io, roomCode) {
  const code = roomCode.toUpperCase();
  if (questionTimers.has(code)) {
    clearTimeout(questionTimers.get(code));
    questionTimers.delete(code);
  }

  const room = store.getRoomByCode(code);
  if (!room) return;

  store.updateRoom(code, { status: 'finished' });

  const quiz = store.getQuizById(room.quiz_id);
  const questions = store.getQuestionsByQuizId(room.quiz_id);
  const players = store.getPlayersByRoom(code);
  const teams = store.getTeamsByRoom(code);
  const answers = store.getAnswersByRoom(code);

  const finalResults = ScoringService.calculateFinalResults(
    players,
    teams,
    answers,
    questions.length,
    room.mode || 'solo'
  );

  io.to(code).emit('quiz_finished', {
    roomCode: code,
    finalResults
  });
}

/**
 * Helper to emit lobby and room state
 */
function emitRoomState(io, roomCode) {
  const code = roomCode.toUpperCase();
  const room = store.getRoomByCode(code);
  if (!room) {
    console.log(`[Socket] emitRoomState: room ${code} not found in store`);
    return;
  }

  const quiz = store.getQuizById(room.quiz_id);
  const players = store.getPlayersByRoom(code);
  const teams = store.getTeamsByRoom(code);

  console.log(`[Socket] emitRoomState: room=${code}, players=${players.length}, status=${room.status}`);

  io.to(code).emit('room_state_update', {
    room,
    quiz,
    players,
    teams
  });
}

/**
 * Helper to emit live leaderboard
 */
function emitLeaderboardUpdate(io, roomCode) {
  const code = roomCode.toUpperCase();
  const room = store.getRoomByCode(code);
  if (!room) return;

  const players = store.getPlayersByRoom(code);
  const teams = store.getTeamsByRoom(code);
  const quiz = store.getQuizById(room.quiz_id);
  const questions = store.getQuestionsByQuizId(room.quiz_id);
  const answers = store.getAnswersByRoom(code);

  const stats = ScoringService.calculateFinalResults(
    players,
    teams,
    answers,
    questions.length,
    room.mode || 'solo'
  );

  io.to(code).emit('leaderboard_updated', {
    mode: room.mode || 'solo',
    leaderboard: stats.leaderboard,
    players: stats.players
  });
}
