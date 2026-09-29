import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAIFlow() {
  console.log('🤖 Starting Quizbee AI Generation & File Upload Complete Test...\n');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Authenticate host
  console.log('[1] Logging in as Host...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'host@quizbee.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('  ✅ Authenticated as:', loginData.user.name);

  // 2. Test manual topic question generation
  console.log('\n[2] Testing AI Quiz Generation from Manual Topic...');
  const manualRes = await fetch(`${baseUrl}/ai/generate-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      topic: 'Molecular Biology & DNA Replication',
      difficulty: 'Hard',
      count: 4
    })
  });
  const manualData = await manualRes.json();
  console.log('  ✅ Generated questions count:', manualData.questions.length);

  // Validate every MCQ structure
  manualData.questions.forEach((q, idx) => {
    if (!q.question_text) throw new Error(`Missing question_text on question ${idx + 1}`);
    if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) {
      throw new Error(`Missing 4 options on question ${idx + 1}`);
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
      throw new Error(`Invalid correct_answer on question ${idx + 1}: ${q.correct_answer}`);
    }
    if (!q.explanation) {
      throw new Error(`Missing explanation on question ${idx + 1}`);
    }
  });
  console.log('  ✅ Verified all MCQs have Question, Option A, B, C, D, Correct Answer, and Explanation!');
  console.log('  📝 Sample MCQ:');
  console.log(`     Q: ${manualData.questions[0].question_text}`);
  console.log(`     A: ${manualData.questions[0].option_a}`);
  console.log(`     B: ${manualData.questions[0].option_b}`);
  console.log(`     C: ${manualData.questions[0].option_c}`);
  console.log(`     D: ${manualData.questions[0].option_d}`);
  console.log(`     Correct: Option ${manualData.questions[0].correct_answer}`);
  console.log(`     Rationale: ${manualData.questions[0].explanation}`);

  // 3. Test File Upload & Text Extraction
  console.log('\n[3] Testing Study Material File Upload (Multipart Form Data)...');
  const sampleTextPath = path.join(__dirname, 'sample_notes.txt');
  fs.writeFileSync(sampleTextPath, `
  Photosynthesis and Cellular Respiration Lecture Notes
  Photosynthesis occurs in chloroplasts, where light energy is converted into chemical energy stored in glucose.
  The light-dependent reactions take place in the thylakoid membranes, producing ATP and NADPH while releasing oxygen.
  The Calvin cycle occurs in the stroma and fixes carbon dioxide into glyceraldehyde-3-phosphate (G3P).
  Cellular respiration takes place in the mitochondria to break down glucose into ATP, water, and carbon dioxide.
  The four main stages of cellular respiration are glycolysis, the pyruvate oxidation step, the citric acid cycle (Krebs cycle), and oxidative phosphorylation.
  `, 'utf-8');

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(sampleTextPath)], { type: 'text/plain' });
  formData.append('file', fileBlob, 'sample_biology_notes.txt');
  formData.append('topic', 'Photosynthesis & Respiration');
  formData.append('difficulty', 'Medium');
  formData.append('count', '3');

  const fileRes = await fetch(`${baseUrl}/ai/generate-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const fileData = await fileRes.json();
  if (!fileData.success) {
    throw new Error('File generation failed: ' + JSON.stringify(fileData));
  }

  console.log('  ✅ Extracted and parsed file:', fileData.fileInfo.name);
  console.log('  ✅ Generated questions from file count:', fileData.questions.length);
  console.log('  📝 Sample Question from Uploaded Notes:');
  console.log(`     Q: ${fileData.questions[0].question_text}`);
  console.log(`     Correct: Option ${fileData.questions[0].correct_answer}`);
  console.log(`     Explanation: ${fileData.questions[0].explanation}`);

  // 4. Test Single Question Regeneration
  console.log('\n[4] Testing Single Question Regeneration...');
  const regenRes = await fetch(`${baseUrl}/ai/regenerate-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      topic: 'Photosynthesis',
      difficulty: 'Medium',
      existingQuestionText: fileData.questions[0].question_text
    })
  });
  const regenData = await regenRes.json();
  console.log('  ✅ Regenerated question:', regenData.question.question_text);
  console.log('  ✅ New correct option:', regenData.question.correct_answer);

  // Clean up sample file
  if (fs.existsSync(sampleTextPath)) fs.unlinkSync(sampleTextPath);

  console.log('\n🎉 ALL AI GENERATION & FILE UPLOAD TESTS PASSED SUCCESSFULLY!\n');
}

testAIFlow().catch(err => {
  console.error('❌ AI Test Error:', err);
  process.exitCode = 1;
});
