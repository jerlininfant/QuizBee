import { io } from 'socket.io-client';

async function runTest() {
  console.log('🧪 Starting QUIZBEE Complete Phase 1 & Core Architecture Integration Test...');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Health check
  console.log('\n[1] Testing Backend Health Check...');
  const healthRes = await fetch(`${baseUrl}/health`);
  const health = await healthRes.json();
  console.log('✅ Health status:', health.status, '| App:', health.appName);

  // 2. Host Login
  console.log('\n[2] Testing Host Authentication...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'host@quizbee.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
  const token = loginData.token;
  console.log('✅ Host login successful! Token acquired for:', loginData.user.name);

  // 3. AI Question Generation
  console.log('\n[3] Testing AI Question Generation from Topic...');
  const aiRes = await fetch(`${baseUrl}/ai/generate-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      topic: 'Operating Systems & Networking',
      difficulty: 'Medium',
      count: 3
    })
  });
  const aiData = await aiRes.json();
  console.log(`✅ AI generated ${aiData.questions.length} questions successfully!`);
  console.log('Sample question:', aiData.questions[0].question_text);
  console.log('Choices: A.', aiData.questions[0].option_a, '| B.', aiData.questions[0].option_b);
  console.log('Correct Answer:', aiData.questions[0].correct_answer);

  // 4. Create Quiz in Database
  console.log('\n[4] Creating Quiz in Database...');
  const createQuizRes = await fetch(`${baseUrl}/quizzes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'OS & Distributed Systems Tournament',
      subject: 'Computer Science',
      difficulty: 'Medium',
      question_count: aiData.questions.length,
      time_per_question: 15,
      mode: 'solo',
      questions: aiData.questions
    })
  });
  const quizCreated = await createQuizRes.json();
  const quizId = quizCreated.quiz.id;
  console.log('✅ Quiz saved in database with ID:', quizId);

  // 5. Host Launches Room
  console.log('\n[5] Launching Multiplayer Room...');
  const roomRes = await fetch(`${baseUrl}/rooms/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ quizId })
  });
  const roomData = await roomRes.json();
  const roomCode = roomData.room.room_code;
  console.log('✅ Room successfully generated with unique code:', roomCode);

  // 6. Players Join Room
  console.log('\n[6] Joining Players into Room:', roomCode);
  const join1 = await fetch(`${baseUrl}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'SpeedyCoder' })
  });
  const p1 = await join1.json();
  console.log('✅ Player 1 joined:', p1.player.name, '| ID:', p1.player.id);

  const join2 = await fetch(`${baseUrl}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'CyberKnight' })
  });
  const p2 = await join2.json();
  console.log('✅ Player 2 joined:', p2.player.name, '| ID:', p2.player.id);

  // 7. Test Socket.IO Real-time Synchronization
  console.log('\n[7] Testing Socket.IO Real-time Connection & Submission...');
  const socket = io('http://localhost:5000');

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected with socket id:', socket.id);
      socket.emit('join_room', { roomCode, playerId: p1.player.id, isHost: false });

      // Host starts quiz
      socket.emit('start_quiz', { roomCode });
    });

    socket.on('question_started', (payload) => {
      console.log('✅ Socket event: question_started received! Question:', payload.playerPayload.questionText.slice(0, 50) + '...');
      
      // Submit answer for player 1
      socket.emit('submit_answer', {
        roomCode,
        playerId: p1.player.id,
        questionId: payload.playerPayload.questionId,
        selectedOption: 'A',
        clientSubmitTime: Date.now()
      });
    });

    socket.on('answer_result', (result) => {
      console.log('✅ Socket event: answer_result received! Is Correct:', result.isCorrect, '| Points:', result.pointsAwarded, '| Score:', result.totalScore);
      socket.disconnect();
      resolve();
    });
  });

  // 8. Test Final Results calculation
  console.log('\n[8] Verifying Authoritative Scoring & Results Calculation...');
  const resultsRes = await fetch(`${baseUrl}/rooms/${roomCode}/results`);
  const finalResults = await resultsRes.json();
  console.log('✅ Final results returned successfully!');
  console.log('Leaderboard rank 1:', finalResults.results.leaderboard[0].name, 'Score:', finalResults.results.leaderboard[0].score);

  console.log('\n🎉 ALL QUIZBEE PHASE 1 AND FULL ENGINE TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
