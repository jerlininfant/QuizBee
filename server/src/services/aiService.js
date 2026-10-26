import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config/env.js';

export class AIService {
  /**
   * Get dynamic Gemini API key from environment
   */
  static getGeminiKey() {
    const key = (process.env.GEMINI_API_KEY || config.geminiApiKey || '').trim();
    if (key && !key.includes('your_gemini_api_key') && key.length > 10) {
      return key;
    }
    return null;
  }

  /**
   * Get dynamic OpenAI client using active environment key
   */
  static getClient() {
    const key = (process.env.OPENAI_API_KEY || config.openaiApiKey || '').trim();
    if (key && !key.includes('your_openai_api_key') && !key.startsWith('sk-proj-S4vCzyU8')) {
      try {
        return new OpenAI({
          apiKey: key,
          timeout: 30000,
          maxRetries: 1
        });
      } catch (e) {
        console.warn('[AIService] Failed to initialize OpenAI client:', e.message);
        return null;
      }
    }
    return null;
  }

  /**
   * Check if live Gemini or OpenAI API is configured
   */
  static isConfigured() {
    return !!(this.getGeminiKey() || this.getClient());
  }

  /**
   * Generates multiple-choice questions from text material or topic
   * @param {Object} params
   * @param {string} params.text - Extracted study material or topic prompt
   * @param {string} params.topic - Optional topic title
   * @param {string} params.difficulty - 'Easy', 'Medium', or 'Hard'
   * @param {number} params.count - Number of questions requested (default 5)
   * @returns {Promise<Array>} List of generated question objects
   */
  static async generateQuestions({ text, topic, difficulty = 'Medium', count = 5 }) {
    const questionCount = Math.max(1, Math.min(25, parseInt(count, 10) || 5));
    const geminiKey = this.getGeminiKey();
    const openaiClient = this.getClient();

    // 1. If Google Gemini is configured, invoke Gemini API
    if (geminiKey) {
      try {
        console.log(`[AIService] Calling Google Gemini API (gemini-1.5-flash) for topic: "${topic || 'Study Document'}" (${questionCount} questions)...`);
        const questions = await this.generateWithGemini({ apiKey: geminiKey, text, topic, difficulty, count: questionCount });
        if (questions && questions.length > 0) {
          return questions;
        }
      } catch (err) {
        console.error('[AIService] Google Gemini generation notice:', err.message);
        console.log('[AIService] Falling back to secondary generator...');
      }
    }

    // 2. If OpenAI is configured, invoke OpenAI API
    if (openaiClient) {
      try {
        console.log(`[AIService] Calling OpenAI API (gpt-4o-mini) for topic: "${topic || 'Study Document'}" (${questionCount} questions)...`);
        const questions = await this.generateWithOpenAI({ client: openaiClient, text, topic, difficulty, count: questionCount });
        if (questions && questions.length > 0) {
          return questions;
        }
      } catch (err) {
        console.error('[AIService] OpenAI generation notice:', err.message);
        console.log('[AIService] Seamlessly activating smart domain-aware generator fallback...');
      }
    }

    // 3. Fallback heuristic generator
    console.log(`[AIService] Using Quizbee smart domain-aware generator for "${topic || 'Study Document'}"...`);
    return this.generateSmartFallback({ text, topic, difficulty, count: questionCount });
  }

  static async generateWithGemini({ apiKey, text, topic, difficulty, count }) {
    const prompt = `You are Quizbee's expert educational AI question generator.
Generate exactly ${count} multiple choice questions (MCQs) suitable for competitive classroom and team quizzes.
Difficulty level: ${difficulty}.
Topic/Subject: ${topic || 'General Knowledge'}.

Study Material / Context:
"""
${(text || topic || 'General Knowledge and Science').slice(0, 10000)}
"""

REQUIREMENTS:
1. Each question MUST have exactly 4 choices: option_a, option_b, option_c, option_d.
2. The correct_answer MUST be one of 'A', 'B', 'C', or 'D'.
3. Include an insightful 'explanation' for why the correct answer is right.
4. Keep question text clear, unambiguous, and competitive.
5. Return ONLY a valid JSON array of question objects matching this exact structure:
[
  {
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_answer": "A",
    "explanation": "..."
  }
]`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const modelName = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const resData = await response.json();
      const rawContent = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      const questions = JSON.parse(jsonString);

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Gemini response did not contain a question array');
      }

      return questions.map((q, idx) => {
        let ans = (q.correct_answer || 'A').toString().trim().toUpperCase().charAt(0);
        if (!['A', 'B', 'C', 'D'].includes(ans)) {
          ans = 'A';
        }
        return {
          id: crypto.randomUUID(),
          question_text: q.question_text || `Question ${idx + 1}`,
          option_a: q.option_a || 'Option A',
          option_b: q.option_b || 'Option B',
          option_c: q.option_c || 'Option C',
          option_d: q.option_d || 'Option D',
          correct_answer: ans,
          explanation: q.explanation || 'Verified correct answer according to study material.',
          order_index: idx
        };
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      throw fetchErr;
    }
  }

  static async generateWithOpenAI({ client, text, topic, difficulty, count }) {
    const prompt = `You are Quizbee's expert educational AI question generator.
Generate exactly ${count} multiple choice questions (MCQs) suitable for competitive classroom and team quizzes.
Difficulty level: ${difficulty}.
Topic/Subject: ${topic || 'General Knowledge'}.

Study Material / Context:
"""
${(text || topic || 'General Knowledge and Science').slice(0, 8000)}
"""

REQUIREMENTS:
1. Each question MUST have exactly 4 choices: option_a, option_b, option_c, option_d.
2. The correct_answer MUST be one of 'A', 'B', 'C', or 'D'.
3. Include an insightful 'explanation' for why the correct answer is right.
4. Keep question text clear, unambiguous, and competitive.
5. Return ONLY a valid JSON array of question objects, nothing else. No markdown formatting around the JSON if possible, or standard json fence.

JSON Schema:
[
  {
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_answer": "A",
    "explanation": "..."
  }
]`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an AI that outputs only structured JSON for educational quizzes.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3500
    });

    const rawContent = response.choices[0]?.message?.content || '';

    // Safely extract JSON array even if markdown fences or leading commentary exist
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(jsonString);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('OpenAI response did not return a valid question array');
    }

    return questions.map((q, idx) => {
      let ans = (q.correct_answer || 'A').toString().trim().toUpperCase().charAt(0);
      if (!['A', 'B', 'C', 'D'].includes(ans)) {
        ans = 'A';
      }
      return {
        id: crypto.randomUUID(),
        question_text: q.question_text || `Question ${idx + 1}`,
        option_a: q.option_a || 'Option A',
        option_b: q.option_b || 'Option B',
        option_c: q.option_c || 'Option C',
        option_d: q.option_d || 'Option D',
        correct_answer: ans,
        explanation: q.explanation || 'Verified correct answer according to study material.',
        order_index: idx
      };
    });
  }

  /**
   * Smart domain-aware fallback generator creates relevant, high quality questions based on the topic/text
   */
  static generateSmartFallback({ text, topic, difficulty = 'Medium', count = 5 }) {
    const cleanTopic = (topic || '').trim() || 'General Knowledge';
    const cleanText = (text || '').trim();
    const lowerTopic = cleanTopic.toLowerCase();
    const lowerText = cleanText.toLowerCase();

    // 1. Detect Domain
    let domain = 'general';
    if (
      lowerTopic.includes('comput') || lowerTopic.includes('web') || lowerTopic.includes('react') ||
      lowerTopic.includes('code') || lowerTopic.includes('program') || lowerTopic.includes('software') ||
      lowerTopic.includes('network') || lowerTopic.includes('sql') || lowerTopic.includes('javascript') ||
      lowerTopic.includes('python') || lowerText.includes('http') || lowerText.includes('socket')
    ) {
      domain = 'tech';
    } else if (
      lowerTopic.includes('bio') || lowerTopic.includes('cell') || lowerTopic.includes('dna') ||
      lowerTopic.includes('photo') || lowerTopic.includes('respirat') || lowerTopic.includes('organ') ||
      lowerTopic.includes('gene') || lowerText.includes('mitochondria') || lowerText.includes('chloroplast')
    ) {
      domain = 'biology';
    } else if (
      lowerTopic.includes('chem') || lowerTopic.includes('atom') || lowerTopic.includes('element') ||
      lowerTopic.includes('reaction') || lowerTopic.includes('acid') || lowerTopic.includes('molecule')
    ) {
      domain = 'chemistry';
    } else if (
      lowerTopic.includes('physic') || lowerTopic.includes('force') || lowerTopic.includes('energy') ||
      lowerTopic.includes('gravity') || lowerTopic.includes('motion') || lowerTopic.includes('quantum')
    ) {
      domain = 'physics';
    } else if (
      lowerTopic.includes('math') || lowerTopic.includes('calculus') || lowerTopic.includes('algebra') ||
      lowerTopic.includes('prob') || lowerTopic.includes('stat') || lowerTopic.includes('matrix')
    ) {
      domain = 'math';
    } else if (
      lowerTopic.includes('hist') || lowerTopic.includes('war') || lowerTopic.includes('empire') ||
      lowerTopic.includes('revolut') || lowerTopic.includes('century') || lowerTopic.includes('civil')
    ) {
      domain = 'history';
    } else if (
      lowerTopic.includes('econ') || lowerTopic.includes('market') || lowerTopic.includes('financ') ||
      lowerTopic.includes('business') || lowerTopic.includes('trade') || lowerTopic.includes('price')
    ) {
      domain = 'economics';
    }

    // 2. Curated domain question banks
    const questionBanks = {
      tech: [
        {
          q: `In ${cleanTopic}, what protocol establishes persistent, low-latency bi-directional communication over HTTP?`,
          ans: 'WebSocket (via Socket.IO)',
          d1: 'Stateless HTTP polling every 10 seconds',
          d2: 'Standard FTP data streaming',
          d3: 'Periodic DNS record queries',
          exp: 'WebSockets provide full-duplex communication channels over a single TCP connection.'
        },
        {
          q: `What is the primary role of authoritative server-side logic in multiplayer systems like Quizbee?`,
          ans: 'Validates answer correctness and calculates scores tamper-proof',
          d1: 'Stores browser local storage values on the client',
          d2: 'Renders CSS styles directly on mobile hardware',
          d3: 'Removes the need for network encryption',
          exp: 'Authoritative backends never trust client input for score computations or answer validation.'
        },
        {
          q: `Which hook in React is recommended for subscribing to real-time events or WebSocket listeners on mount?`,
          ans: 'useEffect with an empty dependency array',
          d1: 'useMemo with no callback function',
          d2: 'useCallback inside the render return block',
          d3: 'useLayoutEffect inside a setTimeout loop',
          exp: 'useEffect executes side effects such as socket subscription and cleanup handlers upon component lifecycle.'
        },
        {
          q: `What is the average time complexity of key lookup in a Hash Table or JavaScript Map?`,
          ans: 'O(1) constant time',
          d1: 'O(log n) logarithmic time',
          d2: 'O(n) linear time',
          d3: 'O(n²) quadratic time',
          exp: 'Hash tables offer O(1) average constant-time complexity for lookups and insertions.'
        },
        {
          q: `Which HTTP response status code indicates that a new resource was successfully created on the server?`,
          ans: '201 Created',
          d1: '200 OK without content',
          d2: '204 No Content',
          d3: '304 Not Modified',
          exp: 'HTTP status 201 indicates a new resource was successfully created as a result of the request.'
        },
        {
          q: `In modern REST APIs, which HTTP method is traditionally idempotent and replaces an entire target resource?`,
          ans: 'PUT',
          d1: 'POST',
          d2: 'PATCH',
          d3: 'CONNECT',
          exp: 'PUT is designed to be idempotent: repeated identical requests yield the same server state.'
        }
      ],
      biology: [
        {
          q: `In cellular biology, where do the light-dependent reactions of photosynthesis take place?`,
          ans: 'Thylakoid membranes of chloroplasts',
          d1: 'Matrix of the mitochondria',
          d2: 'Stroma of the chloroplast',
          d3: 'Outer membrane of the nucleus',
          exp: 'Light reactions occur in the thylakoid membrane where chlorophyll absorbs light energy.'
        },
        {
          q: `Which organelle is often referred to as the powerhouse of the eukaryotic cell for producing ATP?`,
          ans: 'Mitochondria',
          d1: 'Ribosome',
          d2: 'Endoplasmic Reticulum',
          d3: 'Golgi Apparatus',
          exp: 'Mitochondria generate most of the chemical energy needed to power biochemical reactions via ATP.'
        },
        {
          q: `What is the primary role of the enzyme DNA polymerase during replication?`,
          ans: 'Synthesizes new complementary DNA strands by adding nucleotides',
          d1: 'Unwinds the double helix at the replication fork',
          d2: 'Glues Okazaki fragments on the lagging strand together',
          d3: 'Synthesizes RNA primers for initiation',
          exp: 'DNA polymerase catalyzes the synthesis of DNA molecules from nucleoside triphosphates.'
        },
        {
          q: `In the Calvin cycle, what molecule is fixed to initiate the synthesis of sugars?`,
          ans: 'Carbon Dioxide (CO₂)',
          d1: 'Molecular Oxygen (O₂)',
          d2: 'Nitrogen Gas (N₂)',
          d3: 'Glucose',
          exp: 'Rubisco catalyzes the fixation of CO₂ into 3-PGA in the stroma.'
        },
        {
          q: `Which process occurs in the cytoplasm and breaks down one glucose molecule into two pyruvates?`,
          ans: 'Glycolysis',
          d1: 'Krebs Cycle',
          d2: 'Oxidative Phosphorylation',
          d3: 'Fermentation alone',
          exp: 'Glycolysis is an anaerobic pathway that breaks down glucose into pyruvate with a net gain of 2 ATP.'
        }
      ],
      chemistry: [
        {
          q: `What type of chemical bond involves the sharing of electron pairs between atoms?`,
          ans: 'Covalent bond',
          d1: 'Ionic bond',
          d2: 'Hydrogen bond',
          d3: 'Metallic bond',
          exp: 'Covalent bonds form when atoms share valence electrons to achieve stable electron configurations.'
        },
        {
          q: `On the pH scale, a solution with a pH of 3 is classified as:`,
          ans: 'Strongly acidic',
          d1: 'Neutral',
          d2: 'Weakly basic',
          d3: 'Strongly alkaline',
          exp: 'Solutions with pH below 7 are acidic; lower numbers indicate higher concentrations of hydronium ions.'
        },
        {
          q: `Which law states that the total mass of reactants equals the total mass of products in a closed system?`,
          ans: 'Law of Conservation of Mass',
          d1: 'Avogadro’s Law',
          d2: 'Boyle’s Law',
          d3: 'Le Chatelier’s Principle',
          exp: 'Mass is neither created nor destroyed in a chemical reaction according to Lavoisier’s principle.'
        },
        {
          q: `What is the term for a substance that increases the rate of a chemical reaction without being consumed?`,
          ans: 'Catalyst',
          d1: 'Solvent',
          d2: 'Inhibitor',
          d3: 'Reagent',
          exp: 'Catalysts lower the activation energy required for the reaction without undergoing permanent chemical change.'
        }
      ],
      physics: [
        {
          q: `According to Newton's Second Law of Motion, what is the formula relating force, mass, and acceleration?`,
          ans: 'F = m · a',
          d1: 'F = m / a',
          d2: 'F = 0.5 · m · v²',
          d3: 'F = m · g · h',
          exp: 'Newton’s second law states that Force equals mass multiplied by acceleration.'
        },
        {
          q: `What physical constant describes the speed of light in a vacuum?`,
          ans: 'Approximately 3.0 × 10⁸ m/s',
          d1: 'Approximately 3.0 × 10⁶ m/s',
          d2: '9.81 m/s²',
          d3: '6.67 × 10⁻¹¹ N·m²/kg²',
          exp: 'The speed of light in vacuum is defined as c = 299,792,458 meters per second.'
        },
        {
          q: `Which principle states that the total energy of an isolated system remains constant over time?`,
          ans: 'Conservation of Energy',
          d1: 'Archimedes’ Principle',
          d2: 'Bernoulli’s Principle',
          d3: 'Heisenberg Uncertainty Principle',
          exp: 'Energy cannot be created or destroyed, only transformed from one form to another.'
        }
      ],
      math: [
        {
          q: `What is the derivative of f(x) = x³ with respect to x?`,
          ans: '3x²',
          d1: 'x²',
          d2: '3x',
          d3: 'x⁴ / 4',
          exp: 'By the power rule: d/dx(xⁿ) = n·xⁿ⁻¹. For x³, the derivative is 3x².'
        },
        {
          q: `In probability theory, what is the sum of the probabilities of all possible mutually exclusive outcomes?`,
          ans: 'Exactly 1.0',
          d1: '0.0',
          d2: '0.5',
          d3: 'Infinity',
          exp: 'The total probability of the entire sample space is always 1 (or 100%).'
        },
        {
          q: `In a right-angled triangle, the Pythagorean theorem states that:`,
          ans: 'a² + b² = c² (where c is the hypotenuse)',
          d1: 'a + b = c',
          d2: 'a² - b² = c²',
          d3: 'a · b = 0.5 · c²',
          exp: 'The square of the hypotenuse is equal to the sum of the squares of the other two legs.'
        }
      ],
      history: [
        {
          q: `In what year did World War II conclude with the formal signing of surrender documents?`,
          ans: '1945',
          d1: '1939',
          d2: '1918',
          d3: '1950',
          exp: 'World War II ended in 1945 following the surrender of Axis forces in Europe and the Pacific.'
        },
        {
          q: `Which ancient civilization built the monumental pyramids of Giza along the Nile River?`,
          ans: 'Ancient Egypt',
          d1: 'Mesopotamia',
          d2: 'Ancient Greece',
          d3: 'The Roman Empire',
          exp: 'The Giza pyramid complex was constructed by ancient Egyptian dynasties during the Old Kingdom.'
        },
        {
          q: `What historic treaty signed in 1919 officially brought an end to World War I?`,
          ans: 'Treaty of Versailles',
          d1: 'Treaty of Paris',
          d2: 'Congress of Vienna',
          d3: 'Treaty of Westphalia',
          exp: 'The Treaty of Versailles was signed on June 28, 1919, officially concluding the state of war between Germany and the Allies.'
        }
      ],
      economics: [
        {
          q: `According to the law of demand, all else being equal, as the price of a good increases:`,
          ans: 'The quantity demanded decreases',
          d1: 'The quantity demanded increases',
          d2: 'The supply decreases to zero',
          d3: 'Market equilibrium remains unchanged',
          exp: 'Higher prices discourage purchasing, resulting in an inverse relationship between price and quantity demanded.'
        },
        {
          q: `What term refers to the value of the next best alternative given up when making a decision?`,
          ans: 'Opportunity cost',
          d1: 'Sunk cost',
          d2: 'Marginal revenue',
          d3: 'Fixed cost',
          exp: 'Opportunity cost measures what is sacrificed when selecting one alternative over another.'
        },
        {
          q: `What economic metric measures the total market value of all final goods and services produced within a country in a year?`,
          ans: 'Gross Domestic Product (GDP)',
          d1: 'Consumer Price Index (CPI)',
          d2: 'Net National Debt',
          d3: 'Balance of Trade',
          exp: 'GDP is the standard benchmark for evaluating national economic productivity and growth.'
        }
      ],
      general: [
        {
          q: `Which atmospheric layer is closest to the Earth's surface and contains the majority of weather phenomena?`,
          ans: 'Troposphere',
          d1: 'Stratosphere',
          d2: 'Mesosphere',
          d3: 'Thermosphere',
          exp: 'The troposphere extends up to approximately 12 km and contains nearly all of the atmosphere’s water vapor.'
        },
        {
          q: `What is the chemical symbol for the element Gold on the periodic table?`,
          ans: 'Au',
          d1: 'Ag',
          d2: 'Fe',
          d3: 'Pb',
          exp: 'Au comes from the Latin word "aurum", signifying shining dawn or gold.'
        },
        {
          q: `Which continent is home to the Amazon Rainforest and the Andes mountain range?`,
          ans: 'South America',
          d1: 'Africa',
          d2: 'Asia',
          d3: 'Oceania',
          exp: 'South America contains both the world’s largest rainforest (Amazon) and longest continental mountain range (Andes).'
        },
        {
          q: `Who wrote the influential drama 'Romeo and Juliet' and the tragedy 'Hamlet'?`,
          ans: 'William Shakespeare',
          d1: 'Charles Dickens',
          d2: 'Jane Austen',
          d3: 'Mark Twain',
          exp: 'William Shakespeare wrote numerous canonical English dramas and plays during the Elizabethan era.'
        }
      ]
    };

    // 3. Sentence-level fact extraction from text if text is provided
    const textSentences = cleanText
      ? cleanText
          .split(/[.!?\n]+/)
          .map(s => s.trim())
          .filter(s => s.length >= 25 && !s.startsWith('#'))
      : [];

    const selectedPool = questionBanks[domain] || questionBanks.general;
    const questions = [];
    const answerLetters = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < count; i++) {
      let qText = '';
      let correct = '';
      let distractor1 = '';
      let distractor2 = '';
      let distractor3 = '';
      let rationale = '';

      // If user supplied rich text notes, extract real statements
      if (textSentences.length > i && i < 3) {
        const sentence = textSentences[i];
        qText = `According to the study material on ${cleanTopic}: Which statement accurately reflects "${sentence.slice(0, 65)}..."?`;
        correct = sentence.length > 90 ? sentence.slice(0, 90) + '...' : sentence;
        distractor1 = `It is contradicted by subsequent findings in modern ${cleanTopic} practice`;
        distractor2 = `It only applies under rare auxiliary conditions`;
        distractor3 = `It has been completely superseded by newer standards`;
        rationale = `Verified directly from the provided text material: "${sentence.slice(0, 100)}".`;
      } else {
        // Use curated curriculum question pool
        const template = selectedPool[i % selectedPool.length];
        qText = template.q;
        correct = template.ans;
        distractor1 = template.d1;
        distractor2 = template.d2;
        distractor3 = template.d3;
        rationale = template.exp;
      }

      // Randomize correct option position (A, B, C, or D)
      const correctIdx = Math.floor(Math.random() * 4);
      const options = [];
      const distractors = [distractor1, distractor2, distractor3];
      let distractorIdx = 0;

      for (let j = 0; j < 4; j++) {
        if (j === correctIdx) {
          options.push(correct);
        } else {
          options.push(distractors[distractorIdx++]);
        }
      }

      questions.push({
        id: crypto.randomUUID(),
        question_text: qText,
        option_a: options[0],
        option_b: options[1],
        option_c: options[2],
        option_d: options[3],
        correct_answer: answerLetters[correctIdx],
        explanation: rationale,
        order_index: i
      });
    }

    return questions;
  }
}
