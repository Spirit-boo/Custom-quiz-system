// js/report.js — 答题报告生成器
const Report = (() => {

  /**
   * 根据答题记录生成报告数据
   * @param {Object} record
   * @param {Array} record.questions - 题目列表
   * @param {Array} record.answers - 作答详情 [{questionId, userAnswer, isCorrect}]
   * @param {number} record.startTime
   * @param {number} record.endTime
   * @returns {Object} 报告数据
   */
  function generate(record) {
    const { questions, answers, startTime, endTime } = record;

    const totalQuestions = questions.length;
    const correctCount = answers.filter(a => a.isCorrect).length;
    const wrongCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 用时
    const durationSec = Math.round(((endTime || Date.now()) - startTime) / 1000);
    const durationStr = formatDuration(durationSec);

    // 各题型统计
    const typeStats = {};
    questions.forEach((q, i) => {
      if (!typeStats[q.type]) typeStats[q.type] = { total: 0, correct: 0 };
      typeStats[q.type].total++;
      if (answers[i] && answers[i].isCorrect) typeStats[q.type].correct++;
    });

    // 错题列表
    const wrongQuestions = [];
    answers.forEach((a, i) => {
      if (!a.isCorrect && questions[i]) {
        wrongQuestions.push({
          ...questions[i],
          userAnswer: a.userAnswer,
          index: i
        });
      }
    });

    return {
      totalQuestions,
      correctCount,
      wrongCount,
      accuracy,
      durationSec,
      durationStr,
      typeStats,
      wrongQuestions,
      date: new Date().toLocaleString('zh-CN')
    };
  }

  function formatDuration(sec) {
    if (sec < 60) return `${sec}秒`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
  }

  return { generate };
})();
