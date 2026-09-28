/**
 * Authoritative Server-Side Scoring Service
 * 
 * Rules:
 * - Maximum question score = 1000
 * - Correct answer base points = 500
 * - Speed bonus = up to 500 based on response time vs time limit
 * - Wrong answer = 0 points (no speed bonus)
 * - Timeout / Unanswered = 0 points
 */

export class ScoringService {
  /**
   * Calculate score for an answered question
   * @param {boolean} isCorrect - Did the player pick the correct option?
   * @param {number} responseTimeSeconds - Seconds taken from question start to submit
   * @param {number} timeLimitSeconds - Total allocated seconds for the question
   * @returns {number} Final calculated points
   */
  static calculateScore(isCorrect, responseTimeSeconds, timeLimitSeconds = 20) {
    if (!isCorrect) {
      return 0;
    }

    const safeTimeLimit = Math.max(timeLimitSeconds, 5);
    const safeResponseTime = Math.max(0, responseTimeSeconds);

    // Fraction of time remaining: 1 = instant response, 0 = at the last second
    const timeRatio = Math.max(0, Math.min(1, 1 - (safeResponseTime / safeTimeLimit)));

    // Base correct reward: 500 points
    const baseScore = 500;
    // Speed bonus: up to 500 points
    const speedBonus = Math.round(500 * timeRatio);

    return baseScore + speedBonus;
  }

  /**
   * Computes comprehensive statistics for final results
   * @param {Array} players - List of players in the room
   * @param {Array} teams - List of teams in the room
   * @param {Array} answers - All submitted answers for this room
   * @param {number} totalQuestions - Total count of questions in the quiz
   * @param {string} mode - 'solo' or 'team'
   */
  static calculateFinalResults(players, teams, answers, totalQuestions, mode = 'solo') {
    // Calculate per-player aggregates
    const playerStats = players.map(player => {
      const playerAnswers = answers.filter(a => a.player_id === player.id);
      const totalAnswered = playerAnswers.length;
      const correctAnswers = playerAnswers.filter(a => a.is_correct).length;
      const wrongAnswers = totalQuestions - correctAnswers;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      const totalResponseTime = playerAnswers.reduce((sum, a) => sum + (a.response_time || 0), 0);
      const avgResponseTime = totalAnswered > 0 ? parseFloat((totalResponseTime / totalAnswered).toFixed(2)) : 0;

      return {
        id: player.id,
        name: player.name,
        team_id: player.team_id,
        team_name: player.team_name || (teams.find(t => t.id === player.team_id)?.name ?? 'Solo'),
        score: player.score || 0,
        correct_count: correctAnswers,
        wrong_count: wrongAnswers,
        unanswered_count: Math.max(0, totalQuestions - totalAnswered),
        accuracy_percent: accuracy,
        avg_response_time_seconds: avgResponseTime,
        total_questions: totalQuestions
      };
    });

    if (mode === 'team') {
      // Calculate team statistics
      const teamStats = teams.map(team => {
        const teamMembers = playerStats.filter(p => p.team_id === team.id);
        const teamScore = teamMembers.reduce((sum, m) => sum + m.score, 0);
        const totalCorrect = teamMembers.reduce((sum, m) => sum + m.correct_count, 0);
        const totalPossibleAnswers = teamMembers.length * totalQuestions;
        const accuracy = totalPossibleAnswers > 0 ? Math.round((totalCorrect / totalPossibleAnswers) * 100) : 0;

        const totalAvgTime = teamMembers.reduce((sum, m) => sum + m.avg_response_time_seconds, 0);
        const teamAvgResponseTime = teamMembers.length > 0 ? parseFloat((totalAvgTime / teamMembers.length).toFixed(2)) : 0;

        return {
          id: team.id,
          name: team.name,
          score: teamScore,
          members: teamMembers.map(m => ({ id: m.id, name: m.name, score: m.score })),
          member_count: teamMembers.length,
          correct_count: totalCorrect,
          accuracy_percent: accuracy,
          avg_response_time_seconds: teamAvgResponseTime,
          total_questions: totalQuestions
        };
      });

      // Sort teams descending by score
      teamStats.sort((a, b) => b.score - a.score);
      const rankedTeams = teamStats.map((team, idx) => ({ ...team, rank: idx + 1 }));

      // Also sort players
      playerStats.sort((a, b) => b.score - a.score);
      const rankedPlayers = playerStats.map((p, idx) => ({ ...p, rank: idx + 1 }));

      return {
        mode: 'team',
        leaderboard: rankedTeams,
        players: rankedPlayers,
        total_questions: totalQuestions
      };
    }

    // Solo mode: sort players descending by score
    playerStats.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.avg_response_time_seconds - b.avg_response_time_seconds; // tiebreaker: faster speed
    });

    const rankedSolo = playerStats.map((player, idx) => ({ ...player, rank: idx + 1 }));

    return {
      mode: 'solo',
      leaderboard: rankedSolo,
      players: rankedSolo,
      total_questions: totalQuestions
    };
  }
}
