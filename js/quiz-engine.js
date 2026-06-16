// js/quiz-engine.js — 答题引擎
const QuizEngine = (() => {

  /**
   * 生成答题题目列表
   * @param {Object} config
   * @param {string} config.mode - 'random' | 'sequential' | 'wrong' | 'favorite'
   * @param {string[]} config.typeFilter - 题型筛选
   * @param {number} config.count - 题目数量（0 = 全部）
   * @returns {Array} 题目对象数组
   */
  function generate(config) {
    let pool = [];

    switch (config.mode) {
      case 'wrong':
        pool = Storage.getWrongList();
        break;
      case 'favorite':
        pool = Storage.getFavoriteList();
        break;
      case 'random':
      case 'sequential':
      default:
        pool = [...Storage.getQuestionBank()];
        break;
    }

    // 题型筛选
    if (config.typeFilter && config.typeFilter.length > 0) {
      pool = pool.filter(q => config.typeFilter.includes(q.type));
    }

    // 排序
    if (config.mode === 'random') {
      pool = shuffle([...pool]);
    }
    // sequential 保持原序

    // 截取数量
    if (config.count > 0 && config.count < pool.length) {
      pool = pool.slice(0, config.count);
    }

    return pool;
  }

  /**
   * Fisher-Yates 洗牌
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * 判断答案是否正确
   * @param {string} userAnswer - 用户答案（多选用逗号分隔）
   * @param {string} correctAnswer - 正确答案
   * @param {string} type - 题型
   */
  function checkAnswer(userAnswer, correctAnswer, type) {
    if (type === 'fill') {
      // 填空：模糊匹配（去除首尾空格，忽略大小写）
      const ua = userAnswer.trim().toLowerCase();
      const ca = correctAnswer.trim().toLowerCase();
      return ua === ca || ua.includes(ca) || ca.includes(ua);
    }
    // 选择和判断：标准化后比较
    const normalize = (s) => (s || '').toUpperCase().split(/[,，]/).map(x => x.trim()).filter(Boolean).sort().join(',');
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  /**
   * 获取题型中文标签
   */
  function getTypeLabel(type) {
    const labels = { single: '单选', judge: '判断', multiple: '多选', fill: '填空' };
    return labels[type] || type;
  }

  return { generate, shuffle, checkAnswer, getTypeLabel };
})();
