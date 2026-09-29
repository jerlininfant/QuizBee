import { getSupabase } from '../config/supabase.js';

export class SupabaseRepository {
  /**
   * Get active Supabase client instance
   */
  static getClient() {
    return getSupabase();
  }

  /**
   * Check if Supabase client is initialized with credentials
   */
  static isConfigured() {
    return !!this.getClient();
  }

  /**
   * Test database connectivity and table accessibility
   */
  static async testConnection() {
    const client = this.getClient();
    if (!client) {
      return {
        connected: false,
        message: 'Supabase URL or Service Role Key not set in server/.env'
      };
    }

    try {
      // Query users table with limit 1
      const { data, error } = await client.from('users').select('id').limit(1);
      if (error) {
        return {
          connected: false,
          error: error.message,
          code: error.code
        };
      }
      return {
        connected: true,
        message: 'Successfully connected to Supabase PostgreSQL database.'
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message
      };
    }
  }

  // --- USERS ---
  static async findUserByEmail(email) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();
    if (error) {
      console.error('[Supabase] findUserByEmail error:', error.message);
      return null;
    }
    return data;
  }

  static async findUserById(id) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return data;
  }

  static async createUser(userData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        password_hash: userData.password,
        role: userData.role || 'host'
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase] createUser error:', error.message);
      throw error;
    }
    return data;
  }

  // --- QUIZZES ---
  static async getQuizzesByHost(hostId) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('quizzes')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });
    if (error) return null;
    return data;
  }

  static async getQuizById(id) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('quizzes')
      .select('*, questions(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return data;
  }

  static async createQuiz(quizData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('quizzes')
      .insert([{
        host_id: quizData.host_id,
        title: quizData.title,
        subject: quizData.subject,
        difficulty: quizData.difficulty,
        question_count: quizData.question_count,
        time_per_question: quizData.time_per_question,
        mode: quizData.mode
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateQuiz(id, updateData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('quizzes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteQuiz(id) {
    const client = this.getClient();
    if (!client) return null;
    const { error } = await client.from('quizzes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // --- QUESTIONS ---
  static async getQuestionsByQuizId(quizId) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    if (error) return null;
    return data;
  }

  static async saveQuestions(quizId, questionList) {
    const client = this.getClient();
    if (!client) return null;
    // Delete old
    await client.from('questions').delete().eq('quiz_id', quizId);

    const rows = questionList.map((q, idx) => ({
      quiz_id: quizId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: (q.correct_answer || 'A').toUpperCase().charAt(0),
      explanation: q.explanation || '',
      order_index: idx
    }));

    const { data, error } = await client.from('questions').insert(rows).select();
    if (error) throw error;
    return data;
  }

  // --- ROOMS ---
  static async createRoom(roomData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('rooms')
      .insert([{
        quiz_id: roomData.quiz_id,
        room_code: roomData.room_code.toUpperCase(),
        status: roomData.status || 'waiting',
        current_question_index: 0
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getRoomByCode(code) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('rooms')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .maybeSingle();
    if (error) return null;
    return data;
  }

  static async updateRoom(code, updateData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('rooms')
      .update(updateData)
      .eq('room_code', code.toUpperCase())
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- PLAYERS ---
  static async addPlayer(playerData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('players')
      .insert([{
        room_id: playerData.room_id,
        user_id: playerData.user_id || null,
        team_id: playerData.team_id || null,
        name: playerData.name,
        score: playerData.score || 0,
        socket_id: playerData.socket_id,
        connected: true
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getPlayersByRoomId(roomId) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('players')
      .select('*')
      .eq('room_id', roomId);
    if (error) return null;
    return data;
  }

  static async updatePlayer(id, updateData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- TEAMS ---
  static async createTeam(teamData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('teams')
      .insert([{
        room_id: teamData.room_id,
        name: teamData.name,
        score: 0
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getTeamsByRoomId(roomId) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('teams')
      .select('*')
      .eq('room_id', roomId);
    if (error) return null;
    return data;
  }

  // --- ANSWERS ---
  static async recordAnswer(answerData) {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('answers')
      .insert([{
        room_id: answerData.room_id,
        player_id: answerData.player_id,
        question_id: answerData.question_id,
        answer: answerData.answer,
        is_correct: answerData.is_correct,
        response_time: answerData.response_time,
        points: answerData.points
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
