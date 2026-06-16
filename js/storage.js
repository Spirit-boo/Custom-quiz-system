// js/storage.js — localStorage 封装
const Storage = (() => {
  const KEYS = {
    QUESTION_BANK: 'quiz_questionBank',
    WRONG_BOOK:    'quiz_wrongBook',
    FAVORITES:     'quiz_favorites',
    QUIZ_PROGRESS: 'quiz_progress',
    QUIZ_HISTORY:  'quiz_history',
    APP_SETTINGS:  'quiz_settings'
  };

  function get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('存储失败:', e); }
  }

  // === UUID ===
  function uuid() {
    return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // === 题库 ===
  function getQuestionBank() { return get(KEYS.QUESTION_BANK) || []; }
  function setQuestionBank(data) { set(KEYS.QUESTION_BANK, data); }
  function getQuestionById(id) { return getQuestionBank().find(q => q.id === id); }
  function addQuestions(questions) {
    const bank = getQuestionBank();
    questions.forEach(q => { if (!q.id) q.id = uuid(); });
    bank.push(...questions);
    setQuestionBank(bank);
    return questions.length;
  }
  function deleteQuestions(ids) {
    const bank = getQuestionBank().filter(q => !ids.includes(q.id));
    setQuestionBank(bank);
  }
  function getTypeStats() {
    const stats = { single: 0, judge: 0, multiple: 0, fill: 0 };
    getQuestionBank().forEach(q => { if (stats[q.type] !== undefined) stats[q.type]++; });
    return stats;
  }

  // === 错题本 ===
  function getWrongBook() { return get(KEYS.WRONG_BOOK) || {}; }
  function setWrongBook(data) { set(KEYS.WRONG_BOOK, data); }
  function addWrong(questionId) {
    const wb = getWrongBook();
    wb[questionId] = (wb[questionId] || 0) + 1;
    setWrongBook(wb);
  }
  function removeWrong(questionId) {
    const wb = getWrongBook();
    delete wb[questionId];
    setWrongBook(wb);
  }
  function getWrongList() {
    const wb = getWrongBook();
    const bank = getQuestionBank();
    return Object.entries(wb)
      .map(([id, count]) => {
        const q = bank.find(q => q.id === id);
        return q ? { ...q, wrongCount: count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.wrongCount - a.wrongCount);
  }

  // === 收藏 ===
  function getFavorites() { return get(KEYS.FAVORITES) || []; }
  function setFavorites(data) { set(KEYS.FAVORITES, data); }
  function addFavorite(questionId) {
    const favs = getFavorites();
    if (!favs.includes(questionId)) { favs.push(questionId); setFavorites(favs); }
  }
  function removeFavorite(questionId) {
    setFavorites(getFavorites().filter(id => id !== questionId));
  }
  function isFavorite(questionId) { return getFavorites().includes(questionId); }
  function getFavoriteList() {
    const favs = getFavorites();
    const bank = getQuestionBank();
    return favs.map(id => bank.find(q => q.id === id)).filter(Boolean);
  }

  // === 答题进度 ===
  function getQuizProgress() { return get(KEYS.QUIZ_PROGRESS); }
  function setQuizProgress(data) { set(KEYS.QUIZ_PROGRESS, data); }
  function clearQuizProgress() { localStorage.removeItem(KEYS.QUIZ_PROGRESS); }

  // === 答题历史 ===
  function getQuizHistory() { return get(KEYS.QUIZ_HISTORY) || []; }
  function addQuizRecord(record) {
    record.id = record.id || uuid();
    const history = [record, ...getQuizHistory()].slice(0, 50);
    set(KEYS.QUIZ_HISTORY, history);
    return record;
  }

  // === 设置 ===
  function getSettings() { return get(KEYS.APP_SETTINGS) || { theme: 'blue' }; }
  function setSettings(data) { set(KEYS.APP_SETTINGS, { ...getSettings(), ...data }); }

  return {
    KEYS, uuid,
    getQuestionBank, setQuestionBank, getQuestionById, addQuestions, deleteQuestions, getTypeStats,
    getWrongBook, addWrong, removeWrong, getWrongList,
    getFavorites, addFavorite, removeFavorite, isFavorite, getFavoriteList,
    getQuizProgress, setQuizProgress, clearQuizProgress,
    getQuizHistory, addQuizRecord,
    getSettings, setSettings
  };
})();
