import { io } from 'socket.io-client';

async function runComprehensiveRouteTests() {
  console.log('🔍 Executing Comprehensive Route, API & State Validation Tests...\n');
  const baseUrl = 'http://localhost:5000/api';
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Health Endpoint
  console.log('[Test Suite 1: System Health]');
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200, 'GET /api/health returned 200 OK');
  assert(healthData.status === 'online', 'Health status is online');

  // TEST 2: Registration
  console.log('\n[Test Suite 2: Authentication & Session]');
  const uniqueEmail = `test_${Date.now()}@quizbee.com`;
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Professor Unit Test',
      email: uniqueEmail,
      password: 'securePassword123'
    })
  });
  const regData = await regRes.json();
  assert(regRes.status === 201, 'POST /api/auth/register returned 201 Created');
  assert(!!regData.token, 'Registration issued JWT session token');
  const userToken = regData.token;

  // TEST 3: Login with wrong password (negative test)
  const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'wrongpassword' })
  });
  assert(badLoginRes.status === 401, 'POST /api/auth/login returned 401 on incorrect password');

  // TEST 4: Get Profile /me
  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, 'GET /api/auth/me returned 200 OK');
  assert(meData.user.email === uniqueEmail, 'Profile email matches authenticated user');

  // TEST 5: Create Quiz
  console.log('\n[Test Suite 3: Quiz Management & Question Editor]');
  const createQuizRes = await fetch(`${baseUrl}/quizzes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      title: 'Full Stack Engineering Battle',
      subject: 'Computer Science',
      difficulty: 'Hard',
      question_count: 2,
      time_per_question: 20,
      mode: 'solo',
      questions: [
        {
          question_text: 'Which transport does Socket.IO prioritize for low-latency events?',
          option_a: 'WebSocket',
          option_b: 'Long Polling',
          option_c: 'Server-Sent Events',
          option_d: 'HTTP/2 Push',
          correct_answer: 'A',
          explanation: 'WebSockets provide bidirectional, low-latency streaming.'
        },
        {
          question_text: 'What is the maximum allowed score for an answered question in Quizbee?',
          option_a: '500 points',
          option_b: '1000 points',
          option_c: '100 points',
          option_d: '5000 points',
          correct_answer: 'B',
          explanation: '500 base points + up to 500 speed bonus points.'
        }
      ]
    })
  });
  const createdQuiz = await createQuizRes.json();
  assert(createQuizRes.status === 201, 'POST /api/quizzes created quiz with status 201');
  assert(createdQuiz.quiz.questions.length === 2, 'Quiz saved with 2 questions');
  const quizId = createdQuiz.quiz.id;

  // TEST 6: Get Quiz by ID
  const getQuizRes = await fetch(`${baseUrl}/quizzes/${quizId}`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const fetchedQuiz = await getQuizRes.json();
  assert(getQuizRes.status === 200, `GET /api/quizzes/${quizId} returned 200 OK`);
  assert(fetchedQuiz.quiz.title === 'Full Stack Engineering Battle', 'Quiz title verified');

  // TEST 7: Update Quiz (Question Editor Save)
  const updateQuizRes = await fetch(`${baseUrl}/quizzes/${quizId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      title: 'Updated Full Stack Engineering Battle',
      questions: [
        ...fetchedQuiz.quiz.questions,
        {
          question_text: 'Added question #3 for testing',
          option_a: 'Alpha',
          option_b: 'Beta',
          option_c: 'Gamma',
          option_d: 'Delta',
          correct_answer: 'C',
          explanation: 'Gamma is the correct third option.'
        }
      ]
    })
  });
  const updatedQuiz = await updateQuizRes.json();
  assert(updateQuizRes.status === 200, `PUT /api/quizzes/${quizId} updated quiz with 200 OK`);
  assert(updatedQuiz.quiz.questions.length === 3, 'Questions updated to 3');

  // TEST 8: AI Question Regeneration
  console.log('\n[Test Suite 4: AI Question Synthesis]');
  const regenRes = await fetch(`${baseUrl}/ai/regenerate-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      topic: 'React & Vite Architecture',
      difficulty: 'Medium'
    })
  });
  const regenData = await regenRes.json();
  assert(regenRes.status === 200, 'POST /api/ai/regenerate-question returned 200 OK');
  assert(!!regenData.question.question_text, 'Regenerated question contains valid question text');
  assert(['A', 'B', 'C', 'D'].includes(regenData.question.correct_answer), 'Valid correct answer assigned');

  // TEST 9: Room Creation & Room Code Validation
  console.log('\n[Test Suite 5: Room Lifecycle & Player Management]');
  const roomRes = await fetch(`${baseUrl}/rooms/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ quizId })
  });
  const roomData = await roomRes.json();
  assert(roomRes.status === 201, 'POST /api/rooms/create created room with 201');
  const roomCode = roomData.room.room_code;
  assert(roomCode && roomCode.startsWith('QZB'), `Room code format correct: ${roomCode}`);

  // TEST 10: Player Joins Room
  const joinRes1 = await fetch(`${baseUrl}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'ApexCoder' })
  });
  const p1 = await joinRes1.json();
  assert(joinRes1.status === 200, 'Player 1 joined room successfully');

  // TEST 11: Duplicate Name Check
  const duplicateJoinRes = await fetch(`${baseUrl}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'ApexCoder' })
  });
  assert(duplicateJoinRes.status === 400, 'Server rejected duplicate player name with 400');

  // TEST 12: Real-time Socket.IO Gameplay & Speed Scoring
  console.log('\n[Test Suite 6: Socket.IO Engine & Authoritative Scoring]');
  const socket = io('http://localhost:5000');

  await new Promise((resolve) => {
    socket.on('connect', () => {
      assert(true, 'Socket.IO connected to backend server');
      socket.emit('join_room', { roomCode, playerId: p1.player.id, isHost: false });
      socket.emit('start_quiz', { roomCode });
    });

    socket.on('question_started', (payload) => {
      assert(payload.playerPayload.questionIndex === 0, 'First question broadcasted to player');
      // Submit answer A (correct)
      socket.emit('submit_answer', {
        roomCode,
        playerId: p1.player.id,
        questionId: payload.playerPayload.questionId,
        selectedOption: 'A',
        clientSubmitTime: Date.now()
      });
    });

    socket.on('answer_result', (result) => {
      assert(result.isCorrect === true, 'Authoritative validation confirmed answer is correct');
      assert(result.pointsAwarded >= 500 && result.pointsAwarded <= 1000, `Speed bonus score in range (awarded: ${result.pointsAwarded} pts)`);
      socket.disconnect();
      resolve();
    });
  });

  // TEST 13: Results API
  console.log('\n[Test Suite 7: Final Results & Analytics Table]');
  const resultsRes = await fetch(`${baseUrl}/rooms/${roomCode}/results`);
  const finalResults = await resultsRes.json();
  assert(resultsRes.status === 200, `GET /api/rooms/${roomCode}/results returned 200 OK`);
  assert(finalResults.results.leaderboard.length > 0, 'Leaderboard contains ranked players');
  assert(finalResults.results.leaderboard[0].name === 'ApexCoder', 'Player rank verified');

  console.log(`\n=================================================`);
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runComprehensiveRouteTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exitCode = 1;
});
