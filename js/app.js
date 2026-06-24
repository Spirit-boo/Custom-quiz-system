// js/app.js — 应用入口（路由、导航、页面逻辑）
const App = (() => {
  // ===== 状态 =====
  let currentTab = 'home';       // 当前底部 Tab
  let navigationStack = [];      // 页面导航栈（非 Tab 页面）
  let quizSession = null;        // 当前答题会话

  // 非 Tab 页面列表（用 push 导航）
  const NON_TAB_VIEWS = ['import', 'setup', 'quiz', 'result', 'favorites'];

  // ===== 导航 =====
  function switchTab(tab) {
    hideAllViews();
    const view = document.getElementById(`view-${tab}`);
    if (view) view.classList.add('active');
    currentTab = tab;
    navigationStack = [];

    // 更新底部导航高亮
    document.querySelectorAll('#bottomNav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    // 更新顶部栏
    document.getElementById('btnBack').style.visibility = 'hidden';
    document.getElementById('topTitle').textContent = getTitle(tab);

    // 刷新视图数据
    if (tab === 'home') HomePage.render();
    if (tab === 'wrong-book') WrongPage.render();
    if (tab === 'search') SearchPage.reset();

    document.getElementById('viewContainer').scrollTop = 0;
  }

  function navTo(view, params) {
    hideAllViews();
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.add('active');
    navigationStack.push({ view, params });

    document.getElementById('btnBack').style.visibility = 'visible';
    document.getElementById('topTitle').textContent = getTitle(view);

    // 初始化视图
    if (view === 'setup') SetupPage.render(params);
    if (view === 'quiz') QuizPage.start(params);
    if (view === 'result') ResultPage.render(params);
    if (view === 'import') ImportPage.reset();
    if (view === 'favorites') FavPage.render();

    // 非 Tab 页面时取消底部高亮
    if (NON_TAB_VIEWS.includes(view)) {
      document.querySelectorAll('#bottomNav .nav-item').forEach(el => el.classList.remove('active'));
    }

    document.getElementById('viewContainer').scrollTop = 0;
  }

  function goBack() {
    if (navigationStack.length <= 1) {
      // 回退到当前 Tab
      switchTab(currentTab);
      return;
    }
    navigationStack.pop(); // 移除当前页
    const prev = navigationStack[navigationStack.length - 1];
    hideAllViews();
    const el = document.getElementById(`view-${prev.view}`);
    if (el) el.classList.add('active');
    document.getElementById('topTitle').textContent = getTitle(prev.view);

    if (navigationStack.length <= 1) {
      document.getElementById('btnBack').style.visibility = 'hidden';
    }
    // 刷新
    if (prev.view === 'setup') SetupPage.render(prev.params);
    if (prev.view === 'import') ImportPage.reset();
    if (prev.view === 'favorites') FavPage.render();
    document.getElementById('viewContainer').scrollTop = 0;
  }

  function hideAllViews() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  }

  function getTitle(view) {
    const titles = {
      home: '刷题助手', import: '导入题库', setup: '答题设置',
      quiz: '答题中', result: '答题报告', 'wrong-book': '错题本',
      favorites: '收藏夹', search: '搜索题目'
    };
    return titles[view] || '刷题助手';
  }

  // ===== Toast =====
  function toast(msg, dur = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), dur);
  }

  // ===== 菜单 =====
  function toggleMenu() {
    const hasData = Storage.getQuestionBank().length > 0;
    const hasHistory = Storage.getQuizHistory().length > 0;
    const options = [];
    if (hasData) options.push('📋 管理题库', '💾 导出题库', '🗑 清空题库');
    if (hasHistory) options.push('🧹 清除答题记录');
    options.push('取消');

    const menuText = options.map((o, i) => `${i + 1} - ${o}`).join('\n');
    const choice = prompt('菜单选项：\n\n' + menuText + '\n\n请输入数字：');

    let idx = 1;
    if (choice === String(idx++) && hasData) showBankManager();
    else if (choice === String(idx++) && hasData) exportBank();
    else if (choice === String(idx++) && hasData) clearAllBank();
    else if (choice === String(idx++) && hasHistory) clearHistory();
  }

  function exportBank() {
    const data = JSON.stringify(Storage.getQuestionBank(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '题库备份_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    toast('题库已导出');
  }

  function showBankManager() {
    const bank = Storage.getQuestionBank();
    document.getElementById('modalCount').textContent = `共 ${bank.length} 道题目`;
    const listEl = document.getElementById('modalList');

    if (bank.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="icon">📚</div><div class="text">题库为空</div></div>';
    } else {
      listEl.innerHTML = bank.map((q, i) => `
        <div class="question-item" style="position:relative;">
          <div class="q-title">
            <span class="tag tag-${q.type}">${QuizEngine.getTypeLabel(q.type)}</span>
            ${q.question.slice(0, 40)}${q.question.length > 40 ? '...' : ''}
          </div>
          <div class="q-meta">
            <span class="text-caption">答案：${q.answer}</span>
            <button class="btn-secondary" style="padding:4px 10px;font-size:11px;border-color:var(--wrong);color:var(--wrong);"
              onclick="App.deleteQuestion('${q.id}')">删除</button>
          </div>
        </div>`).join('');
    }

    document.getElementById('modalOverlay').classList.add('show');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
  }

  function deleteQuestion(id) {
    if (!confirm('确定删除这道题目吗？此操作不可恢复。')) return;
    Storage.deleteQuestions([id]);
    toast('已删除');
    showBankManager(); // 刷新列表
    // 同时刷新首页和导入页
    if (currentTab === 'home') HomePage.render();
  }

  function clearAllBank() {
    const bank = Storage.getQuestionBank();
    if (bank.length === 0) { toast('题库已为空'); return; }
    if (!confirm(`确定清空全部 ${bank.length} 道题目吗？\n\n此操作不可恢复！\n建议先导出备份。\n\n确定清空？`)) return;
    Storage.setQuestionBank([]);
    Storage.setWrongBook({});
    Storage.setFavorites([]);
    Storage.clearQuizProgress();
    toast('题库已清空');
    closeModal();
    if (currentTab === 'home') HomePage.render();
  }

  function clearHistory() {
    const history = Storage.getQuizHistory();
    if (history.length === 0) { toast('没有答题记录'); return; }
    if (!confirm(`确定清除全部 ${history.length} 条答题记录吗？`)) return;
    localStorage.removeItem(Storage.KEYS.QUIZ_HISTORY);
    toast('答题记录已清除');
    if (currentTab === 'home') HomePage.render();
  }

  // ===== 初始化 =====
  function init() {
    switchTab('home');
    // 检查是否有未完成的答题
    const progress = Storage.getQuizProgress();
    if (progress && progress.answers && progress.answers.length > 0) {
      setTimeout(() => {
        if (confirm(`检测到未完成的答题进度（已完成 ${progress.answers.length} 题），是否继续？`)) {
          navTo('quiz', { resume: true });
        }
      }, 500);
    }
  }

  return { switchTab, navTo, goBack, toast, toggleMenu, init, getTitle, showBankManager, closeModal, deleteQuestion, clearAllBank, clearHistory };
})();

// ===== 首页 =====
const HomePage = {
  // 清理无效的错题记录（题目已从题库删除但错题本还有）
  cleanupWrongBook() {
    const wb = Storage.getWrongBook();
    const bankIds = new Set(Storage.getQuestionBank().map(q => q.id));
    let cleaned = false;
    for (const id of Object.keys(wb)) {
      if (!bankIds.has(id)) { delete wb[id]; cleaned = true; }
    }
    if (cleaned) Storage.setWrongBook(wb);
    return cleaned;
  },

  render() {
    this.cleanupWrongBook(); // 先清理无效记录
    const stats = Storage.getTypeStats();
    const bank = Storage.getQuestionBank();
    const total = bank.length;
    const wrongCount = Object.keys(Storage.getWrongBook()).length;
    const favCount = Storage.getFavorites().length;

    let statsHtml = '';
    if (total === 0) {
      statsHtml = `<div class="empty-state"><div class="icon">📚</div><div class="text">暂无题目，请先导入题库</div></div>`;
    } else {
      statsHtml = `
        <div class="flex-between" style="text-align:center;">
          <div><div class="text-title">${total}</div><div class="text-caption">总题数</div></div>
          <div style="color:var(--primary);"><div class="text-subtitle">${stats.single}</div><div class="text-caption">单选</div></div>
          <div style="color:var(--correct);"><div class="text-subtitle">${stats.judge}</div><div class="text-caption">判断</div></div>
          <div style="color:#FA8C16;"><div class="text-subtitle">${stats.multiple}</div><div class="text-caption">多选</div></div>
          <div style="color:#722ED1;"><div class="text-subtitle">${stats.fill}</div><div class="text-caption">填空</div></div>
        </div>`;
    }
    document.getElementById('statsContent').innerHTML = statsHtml;

    // 按钮状态
    const startBtn = document.querySelector('#homeActions .btn-primary');
    if (startBtn) startBtn.disabled = total === 0;

    // 错题本和收藏数量
    const wrongBtn = document.getElementById('btnWrongBook');
    const favBtn = document.getElementById('btnFavorites');
    if (wrongBtn) wrongBtn.textContent = `📕 错题本 (${wrongCount})`;
    if (favBtn) favBtn.textContent = `⭐ 收藏夹 (${favCount})`;

    // 最近记录
    const recent = document.getElementById('homeRecent');
    const history = Storage.getQuizHistory();
    if (history.length > 0) {
      const r = history[0];
      const acc = r.totalQuestions > 0 ? Math.round((r.correctCount / r.totalQuestions) * 100) : 0;
      const d = new Date(r.date || r.endTime);
      recent.style.display = 'block';
      recent.innerHTML = `
        <div class="text-heading">最近答题</div>
        <div class="divider"></div>
        <div class="flex-between">
          <div><div class="text-caption">正确率</div><div class="text-subtitle" style="color:var(--correct);">${acc}%</div></div>
          <div><div class="text-caption">答对/总题</div><div class="text-subtitle">${r.correctCount}/${r.totalQuestions}</div></div>
          <div><div class="text-caption">日期</div><div class="text-caption">${d.toLocaleDateString('zh-CN')}</div></div>
        </div>`;
    } else {
      recent.style.display = 'none';
    }
  }
};

// ===== 导入页 =====
const ImportPage = {
  file: null,
  parsed: null,
  mapping: {},
  validationResult: null,

  reset() {
    this.file = null;
    this.parsed = null;
    this.mapping = {};
    this.validationResult = null;
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importDropZone').style.display = 'block';
    document.getElementById('fileInput').value = '';
    this.showBankInfo();
  },

  showBankInfo() {
    const bank = Storage.getQuestionBank();
    const stats = Storage.getTypeStats();
    const parts = [];
    if (stats.single > 0) parts.push(`单选${stats.single}道`);
    if (stats.judge > 0) parts.push(`判断${stats.judge}道`);
    if (stats.multiple > 0) parts.push(`多选${stats.multiple}道`);
    if (stats.fill > 0) parts.push(`填空${stats.fill}道`);
    document.getElementById('importBankStats').textContent =
      bank.length > 0 ? `总计 ${bank.length} 道题目（${parts.join('，')}）` : '暂无题目，请导入题库';
  },

  clearBank() {
    const bank = Storage.getQuestionBank();
    if (bank.length === 0) { App.toast('题库已为空'); return; }
    if (!confirm(`当前题库有 ${bank.length} 道题目。\n\n确定全部清空吗？\n建议先导出备份（点右上角 ⋯ → 导出题库）。\n\n确定清空？`)) return;
    Storage.setQuestionBank([]);
    Storage.setWrongBook({});
    Storage.setFavorites([]);
    Storage.clearQuizProgress();
    this.showBankInfo();
    App.toast('题库已清空');
  },

  async handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.file = file;

    try {
      App.toast('正在解析文件...');
      this.parsed = await Parser.parse(file);
      if (this.parsed.rows.length === 0) {
        App.toast('文件为空或无法解析'); return;
      }
      this.showMapping();
      document.getElementById('importDropZone').style.display = 'none';
      document.getElementById('importPreview').style.display = 'block';
    } catch (e) {
      App.toast('解析失败：' + e.message);
    }
  },

  showMapping() {
    const { columns, rows } = this.parsed;
    const mapArea = document.getElementById('mappingArea');

    // 自动映射
    const autoMap = {};
    const colLower = columns.map(c => c.toLowerCase().trim());
    const patterns = {
      question: ['题目', '问题', 'question', '题干', 'title'],
      type: ['题型', '类型', 'type', '种类'],
      answer: ['答案', 'answer', '正确', '结果'],
      analysis: ['解析', 'analysis', '解释', '详解', '说明']
    };

    for (const [field, keywords] of Object.entries(patterns)) {
      for (const kw of keywords) {
        const idx = colLower.findIndex(c => c.includes(kw));
        if (idx >= 0) { autoMap[field] = columns[idx]; break; }
      }
    }

    // 自动映射选项列（A, B, C, D, E, F, G 或 选项A, 选项B...）
    const optCols = [];
    for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      const idx = colLower.findIndex(c => c === label.toLowerCase() || c.includes(`选项${label}`) || c.includes(`选项 ${label}`));
      if (idx >= 0) optCols.push(columns[idx]);
    }
    if (optCols.length === 0) {
      // 尝试匹配 "选项1", "选项2" 等
      for (let i = 1; i <= 7; i++) {
        const idx = colLower.findIndex(c => c.includes(`选项${i}`) || c.includes(`选项 ${i}`));
        if (idx >= 0) optCols.push(columns[idx]);
      }
    }
    autoMap.options = optCols;
    this.mapping = autoMap;

    // 渲染映射 UI
    const fields = [
      { key: 'question', label: '题目内容', required: true },
      { key: 'type', label: '题型', required: true },
      { key: 'answer', label: '正确答案', required: true },
      { key: 'analysis', label: '解析（可选）', required: false }
    ];

    let html = '<div class="text-heading">字段映射</div>';
    html += '<div class="text-caption mb-8">请确认列对应关系：</div>';

    fields.forEach(f => {
      const selected = autoMap[f.key] || '';
      html += `<div class="flex-between mb-8">
        <span class="text-body">${f.label} ${f.required ? '<span style="color:var(--wrong);">*</span>' : ''}</span>
        <select data-mapping="${f.key}" class="map-select" onchange="ImportPage.onMappingChange()">
          <option value="">-- 不映射 --</option>
          ${columns.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>`;
    });

    html += '<div class="text-caption mt-8">选项列（多选）：</div>';
    html += '<div class="chip-row" id="optionMapping">';
    columns.forEach(c => {
      const isOpt = optCols.includes(c);
      html += `<span class="chip ${isOpt ? 'selected' : ''}" data-col="${c}" onclick="ImportPage.toggleOptionCol(this)">${c}</span>`;
    });
    html += '</div>';

    html += '<button class="btn-secondary btn-block mt-8" onclick="ImportPage.validate()">校验数据</button>';
    mapArea.innerHTML = html;
  },

  onMappingChange() {
    document.querySelectorAll('.map-select').forEach(sel => {
      this.mapping[sel.dataset.mapping] = sel.value;
    });
  },

  toggleOptionCol(el) {
    el.classList.toggle('selected');
    this.mapping.options = [];
    document.querySelectorAll('#optionMapping .chip.selected').forEach(c => {
      this.mapping.options.push(c.dataset.col);
    });
  },

  validate() {
    // 更新映射
    this.onMappingChange();
    this.mapping.options = [];
    document.querySelectorAll('#optionMapping .chip.selected').forEach(c => {
      this.mapping.options.push(c.dataset.col);
    });

    if (!this.mapping.question || !this.mapping.type || !this.mapping.answer) {
      App.toast('请映射必填字段（题目、题型、答案）'); return;
    }

    const result = Validator.process(this.parsed.rows, this.parsed.columns, this.mapping);
    const dupes = Validator.checkDuplicates(
      result.passed.map(r => r.data),
      Storage.getQuestionBank()
    );

    // 标记重复为警告
    dupes.forEach(d => {
      const item = result.passed[d.index];
      if (item) {
        item.hasWarning = true;
        item.warnings.push(`与题库中已有题目重复：「${d.question}...」`);
      }
    });

    this.validationResult = result;

    // 显示校验结果
    const area = document.getElementById('validationArea');
    const passCount = result.passed.length;
    const warnCount = result.withWarnings.length;
    const errCount = result.errors.length;

    let html = '<div class="text-heading">校验结果</div>';
    html += `<div class="flex-between mb-8">
      <span class="text-caption">✅ 通过：${passCount} 题</span>
      ${warnCount > 0 ? `<span class="text-caption" style="color:var(--warn);">⚠️ 警告：${warnCount} 题</span>` : ''}
      ${errCount > 0 ? `<span class="text-caption" style="color:var(--wrong);">❌ 错误：${errCount} 题</span>` : ''}
    </div>`;

    // 错误列表（可折叠）
    if (errCount > 0) {
      html += '<div class="text-caption" style="color:var(--wrong);margin-top:8px;">以下题目存在错误，将跳过导入：</div>';
      result.errors.forEach(e => {
        html += `<div style="font-size:12px;color:var(--wrong);margin:4px 0;">${e.errors.join('；')}</div>`;
      });
    }

    area.innerHTML = html;
  },

  confirm() {
    if (!this.validationResult) {
      App.toast('请先校验数据'); return;
    }

    const toImport = this.validationResult.passed.map(r => r.data);
    if (toImport.length === 0) {
      App.toast('没有可导入的有效题目'); return;
    }

    const count = Storage.addQuestions(toImport);
    this.showBankInfo();
    App.toast(`成功导入 ${count} 道题目`);
    this.reset();
  }
};

// ===== 答题设置页 =====
const SetupPage = {
  config: {
    count: 10,
    mode: 'random',
    typeFilter: ['single', 'judge', 'multiple', 'fill']
  },

  render(params) {
    const stats = Storage.getTypeStats();
    const total = Storage.getQuestionBank().length;

    // 数量选择
    const countOptions = [
      { label: '10题', value: 10 },
      { label: '20题', value: 20 },
      { label: '50题', value: 50 },
      { label: `全部(${total})`, value: 0 }
    ];
    document.getElementById('countChips').innerHTML = countOptions.map(c =>
      `<span class="chip ${this.config.count === c.value ? 'selected' : ''}" onclick="SetupPage.selectCount(${c.value})">${c.label}</span>`
    ).join('');

    // 模式选择
    const modes = [
      { label: '随机出题', value: 'random' },
      { label: '顺序出题', value: 'sequential' },
      { label: '错题重做', value: 'wrong' },
      { label: '收藏专练', value: 'favorite' }
    ];
    document.getElementById('modeChips').innerHTML = modes.map(m =>
      `<span class="chip ${this.config.mode === m.value ? 'selected' : ''}" onclick="SetupPage.selectMode('${m.value}')">${m.label}</span>`
    ).join('');

    // 题型筛选
    const types = [
      { label: '单选', value: 'single' },
      { label: '判断', value: 'judge' },
      { label: '多选', value: 'multiple' },
      { label: '填空', value: 'fill' }
    ];
    document.getElementById('typeChips').innerHTML = types.map(t =>
      `<span class="chip ${this.config.typeFilter.includes(t.value) ? 'selected' : ''}" onclick="SetupPage.toggleType('${t.value}')">${t.label} (${stats[t.value]})</span>`
    ).join('');

    this.updateFilteredCount();

    // 进度恢复
    const progress = Storage.getQuizProgress();
    const resume = document.getElementById('resumeBanner');
    if (progress && progress.answers && progress.answers.length > 0) {
      resume.style.display = 'block';
      resume.innerHTML = `
        <div class="flex-between">
          <span class="text-body">上次未完成（${progress.answers.length}题已答）</span>
          <button class="btn-secondary" style="padding:6px 16px;font-size:13px;" onclick="App.navTo('quiz',{resume:true})">继续</button>
        </div>`;
    } else {
      resume.style.display = 'none';
    }
  },

  selectCount(val) { this.config.count = val; this.render(); },
  selectMode(val) { this.config.mode = val; this.render(); },

  toggleType(val) {
    const idx = this.config.typeFilter.indexOf(val);
    if (idx >= 0) {
      if (this.config.typeFilter.length > 1) this.config.typeFilter.splice(idx, 1);
    } else {
      this.config.typeFilter.push(val);
    }
    this.render();
  },

  updateFilteredCount() {
    const pool = QuizEngine.generate(this.config);
    document.getElementById('filteredCount').textContent = `当前设置可出 ${pool.length} 道题目`;
  },

  start() {
    const questions = QuizEngine.generate(this.config);
    if (questions.length === 0) {
      App.toast('当前设置下没有题目，请调整筛选条件');
      return;
    }
    App.navTo('quiz', { questions, config: this.config });
  }
};

// ===== 答题页 =====
const QuizPage = {
  questions: [],
  currentIndex: 0,
  answers: [],
  startTime: 0,
  config: null,
  selectedOptions: [], // 当前题选中的选项索引（多选/单选）
  fillInput: '',

  start(params) {
    if (params.resume) {
      const progress = Storage.getQuizProgress();
      if (progress) {
        this.questions = progress.questions;
        this.currentIndex = progress.currentIndex;
        this.answers = progress.answers || [];
        this.startTime = progress.startTime;
        this.config = progress.config;
      }
    } else {
      this.questions = params.questions;
      this.currentIndex = 0;
      this.answers = [];
      this.startTime = Date.now();
      this.config = params.config;
    }
    this.selectedOptions = [];
    this.fillInput = '';
    quizSession = this;
    this.renderQuestion();
  },

  renderQuestion() {
    if (this.currentIndex >= this.questions.length) {
      this.finish();
      return;
    }

    const q = this.questions[this.currentIndex];
    const total = this.questions.length;
    const idx = this.currentIndex;
    const progress = Math.round(((idx) / total) * 100);

    document.getElementById('quizProgress').style.width = progress + '%';
    document.getElementById('quizCounter').textContent = `第 ${idx + 1} / ${total} 题`;

    const typeLabel = QuizEngine.getTypeLabel(q.type);
    const tagEl = document.getElementById('quizTypeTag');
    tagEl.textContent = typeLabel;
    tagEl.className = 'tag tag-' + q.type;

    document.getElementById('quizQuestion').textContent = q.question;

    // 选项
    const optsArea = document.getElementById('quizOptions');
    const isMulti = q.type === 'multiple';

    if (q.type === 'fill') {
      optsArea.innerHTML = `
        <input class="search-input" id="fillInput" placeholder="请输入答案..." value="${this.fillInput}"
          oninput="QuizPage.fillInput=this.value" style="width:100%;">`;
    } else {
      const labels = q.options.map((_, i) => String.fromCharCode(65 + i));
      optsArea.innerHTML = q.options.map((opt, i) => `
        <div class="option-item ${this.selectedOptions.includes(i) ? 'selected' : ''}"
             onclick="QuizPage.toggleOption(${i}, '${isMulti}')">
          <span class="option-prefix">${labels[i]}.</span>${opt}
        </div>`).join('');
    }

    // 收藏按钮
    const favBtn = document.getElementById('quizFavBtn');
    favBtn.textContent = Storage.isFavorite(q.id) ? '★' : '☆';
    favBtn.style.color = Storage.isFavorite(q.id) ? '#FAAD14' : '#999';

    // 按钮状态
    document.getElementById('quizFeedback').style.display = 'none';
    document.getElementById('quizSubmitBtn').style.display = 'block';
    document.getElementById('quizNextBtn').style.display = 'none';
  },

  toggleOption(index, isMulti) {
    if (isMulti) {
      const pos = this.selectedOptions.indexOf(index);
      if (pos >= 0) this.selectedOptions.splice(pos, 1);
      else this.selectedOptions.push(index);
    } else {
      this.selectedOptions = [index];
    }
    // 重新渲染选项样式
    const items = document.querySelectorAll('.option-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', this.selectedOptions.includes(i));
    });
  },

  submit() {
    const q = this.questions[this.currentIndex];
    let userAnswer;

    if (q.type === 'fill') {
      userAnswer = document.getElementById('fillInput')?.value?.trim() || this.fillInput;
      if (!userAnswer) { App.toast('请输入答案'); return; }
    } else {
      if (this.selectedOptions.length === 0) { App.toast('请选择答案'); return; }
      const labels = q.options.map((_, i) => String.fromCharCode(65 + i));
      userAnswer = this.selectedOptions.map(i => labels[i]).join(',');
    }

    const isCorrect = QuizEngine.checkAnswer(userAnswer, q.answer, q.type);

    this.answers.push({
      questionId: q.id,
      userAnswer,
      isCorrect,
      question: q
    });

    // 显示反馈
    const fb = document.getElementById('quizFeedback');
    fb.style.display = 'block';
    const isWrongMode = this.config && this.config.mode === 'wrong';
    fb.innerHTML = `
      <div class="answer-reveal ${isCorrect ? 'correct' : 'wrong'}">
        <div style="font-size:20px;margin-bottom:8px;">${isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}</div>
        <div class="text-body">正确答案：<b>${q.answer}</b></div>
        ${q.analysis ? `<div class="text-caption mt-8">📖 解析：${q.analysis}</div>` : ''}
        ${(isCorrect && isWrongMode) ? `
          <button class="btn-secondary" style="margin-top:12px;padding:8px 20px;font-size:14px;border-color:var(--correct);color:var(--correct);"
            onclick="QuizPage.removeFromWrong('${q.id}')">✅ 已掌握，从错题本移除</button>
        ` : ''}
      </div>`;

    // 高亮选项
    if (q.type !== 'fill') {
      const items = document.querySelectorAll('.option-item');
      const correctLabels = q.answer.toUpperCase().split(',').map(s => s.trim());
      const labels = q.options.map((_, i) => String.fromCharCode(65 + i));
      items.forEach((item, i) => {
        item.style.pointerEvents = 'none';
        if (correctLabels.includes(labels[i])) item.classList.add('correct');
        if (this.selectedOptions.includes(i) && !correctLabels.includes(labels[i])) item.classList.add('wrong');
      });
    }

    // 自动收录错题
    if (!isCorrect) Storage.addWrong(q.id);

    // 切换按钮
    document.getElementById('quizSubmitBtn').style.display = 'none';
    const nextBtn = document.getElementById('quizNextBtn');
    nextBtn.style.display = 'block';
    nextBtn.textContent = this.currentIndex < this.questions.length - 1 ? '下一题 ▶' : '查看报告 📊';

    // 保存进度
    this.saveProgress();
  },

  next() {
    this.currentIndex++;
    this.selectedOptions = [];
    this.fillInput = '';

    if (this.currentIndex >= this.questions.length) {
      this.finish();
    } else {
      this.renderQuestion();
      document.getElementById('viewContainer').scrollTop = 0;
    }
  },

  removeFromWrong(id) {
    Storage.removeWrong(id);
    App.toast('已从错题本移除 ✅');
    // 隐藏按钮，防止重复点击
    const fb = document.getElementById('quizFeedback');
    if (fb) {
      const btn = fb.querySelector('button');
      if (btn) { btn.textContent = '✓ 已移除'; btn.disabled = true; btn.style.opacity = '0.6'; }
    }
  },

  toggleFav() {
    const q = this.questions[this.currentIndex];
    if (!q || !q.id) return;
    if (Storage.isFavorite(q.id)) {
      Storage.removeFavorite(q.id);
      App.toast('已取消收藏');
    } else {
      Storage.addFavorite(q.id);
      App.toast('已收藏 ⭐');
    }
    const favBtn = document.getElementById('quizFavBtn');
    favBtn.textContent = Storage.isFavorite(q.id) ? '★' : '☆';
    favBtn.style.color = Storage.isFavorite(q.id) ? '#FAAD14' : '#999';
  },

  saveProgress() {
    Storage.setQuizProgress({
      questions: this.questions,
      currentIndex: this.currentIndex,
      answers: this.answers,
      startTime: this.startTime,
      config: this.config
    });
  },

  finish() {
    Storage.clearQuizProgress();
    const record = {
      questions: this.questions,
      answers: this.answers,
      startTime: this.startTime,
      endTime: Date.now(),
      mode: this.config?.mode || 'random',
      typeFilter: this.config?.typeFilter || []
    };
    Storage.addQuizRecord(record);
    App.navTo('result', { record });
  }
};

// ===== 答题报告页 =====
const ResultPage = {
  render(params) {
    const report = Report.generate(params.record);

    // 表情
    const emoji = report.accuracy >= 90 ? '🎉' : report.accuracy >= 60 ? '👍' : '💪';
    document.getElementById('resultEmoji').textContent = emoji;
    document.getElementById('resultAccuracy').innerHTML = `<span style="color:${report.accuracy >= 60 ? 'var(--correct)' : 'var(--wrong)'};">${report.accuracy}%</span>`;
    document.getElementById('resultStats').innerHTML = `
      <div class="result-stat"><div class="val">${report.totalQuestions}</div><div class="text-caption">总题数</div></div>
      <div class="result-stat"><div class="val" style="color:var(--correct);">${report.correctCount}</div><div class="text-caption">答对</div></div>
      <div class="result-stat"><div class="val" style="color:var(--wrong);">${report.wrongCount}</div><div class="text-caption">答错</div></div>
      <div class="result-stat"><div class="val">${report.durationStr}</div><div class="text-caption">用时</div></div>
    `;

    // 题型分析
    let typeHtml = '<div class="text-heading">题型分析</div>';
    for (const [type, stat] of Object.entries(report.typeStats)) {
      const label = QuizEngine.getTypeLabel(type);
      const acc = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      typeHtml += `
        <div class="flex-between mb-8">
          <span class="tag tag-${type}">${label}</span>
          <span class="text-body">${stat.correct}/${stat.total} 正确</span>
          <span class="text-caption" style="color:${acc >= 60 ? 'var(--correct)' : 'var(--wrong)'};">${acc}%</span>
        </div>`;
    }
    document.getElementById('resultTypeStats').innerHTML = typeHtml;

    // 错题列表
    const wlArea = document.getElementById('resultWrongList');
    if (report.wrongQuestions.length > 0) {
      let wlHtml = '<div class="text-heading">错题列表</div>';
      report.wrongQuestions.forEach((q, i) => {
        wlHtml += `
          <div class="question-item" onclick="ResultPage.showWrongDetail('${q.id}', ${i})">
            <div class="q-title"><span class="tag tag-${q.type}">${QuizEngine.getTypeLabel(q.type)}</span> ${q.question}</div>
            <div class="q-meta">
              <span class="text-caption">你的答案：<span style="color:var(--wrong);">${q.userAnswer}</span></span>
              <span class="text-caption">正确：<span style="color:var(--correct);">${q.answer}</span></span>
            </div>
          </div>`;
      });
      wlArea.innerHTML = wlHtml;
      document.getElementById('btnRedoWrong').style.display = 'block';
    } else {
      wlArea.innerHTML = '<div class="empty-state"><div class="icon">🎯</div><div class="text">全部正确，没有错题！</div></div>';
      document.getElementById('btnRedoWrong').style.display = 'none';
    }

    // 重做错题按钮
    document.getElementById('btnRedoWrong').onclick = () => {
      if (report.wrongQuestions.length > 0) {
        App.navTo('quiz', {
          questions: report.wrongQuestions,
          config: { mode: 'wrong', typeFilter: [], count: 0 }
        });
      }
    };
  },

  showWrongDetail(id, idx) {
    App.toast('请前往错题本查看详情');
  }
};

// ===== 错题本页 =====
const WrongPage = {
  render() {
    const list = Storage.getWrongList();
    const area = document.getElementById('wrongList');
    const empty = document.getElementById('wrongEmpty');

    if (list.length === 0) {
      area.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    let html = `<div class="text-heading">错题本 (${list.length})</div>`;
    list.forEach(q => {
      html += `
        <div class="question-item" onclick="WrongPage.showDetail('${q.id}')">
          <div class="q-title">
            <span class="tag tag-${q.type}">${QuizEngine.getTypeLabel(q.type)}</span>
            <span class="text-caption ml-8">错${q.wrongCount}次</span>
          </div>
          <div class="q-title">${q.question}</div>
          <div class="q-meta">
            <span class="text-caption">答案：${q.answer}</span>
            <button class="btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="event.stopPropagation();WrongPage.remove('${q.id}')">移除</button>
          </div>
          <div id="wrongDetail-${q.id}" style="display:none;" class="mt-8">
            <div class="divider"></div>
            <div class="text-caption">选项：${q.options.map((o,i) => String.fromCharCode(65+i)+'. '+o).join('；')}</div>
            ${q.analysis ? `<div class="text-caption">解析：${q.analysis}</div>` : ''}
          </div>
        </div>`;
    });
    html += `<button class="btn-primary btn-block mt-8" onclick="WrongPage.redoAll()">重做全部错题</button>`;
    area.innerHTML = html;
  },

  showDetail(id) {
    const el = document.getElementById(`wrongDetail-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },

  remove(id) {
    if (confirm('确定移除这道错题吗？')) {
      Storage.removeWrong(id);
      this.render();
      App.toast('已移除');
    }
  },

  redoAll() {
    const questions = Storage.getWrongList();
    if (questions.length === 0) { App.toast('没有错题'); return; }
    App.navTo('quiz', { questions, config: { mode: 'wrong', typeFilter: [], count: 0 } });
  }
};

// ===== 收藏页 =====
const FavPage = {
  render() {
    const list = Storage.getFavoriteList();
    const area = document.getElementById('favList');
    const empty = document.getElementById('favEmpty');

    if (list.length === 0) {
      area.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    let html = `<div class="text-heading">收藏夹 (${list.length})</div>`;
    list.forEach(q => {
      html += `
        <div class="question-item">
          <div class="q-title"><span class="tag tag-${q.type}">${QuizEngine.getTypeLabel(q.type)}</span> ${q.question}</div>
          <div class="q-meta">
            <span class="text-caption">答案：${q.answer}</span>
            <button class="btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="FavPage.remove('${q.id}')">取消收藏</button>
          </div>
        </div>`;
    });
    html += `<button class="btn-primary btn-block mt-8" onclick="FavPage.practice()">练习收藏题目</button>`;
    area.innerHTML = html;
  },

  remove(id) {
    Storage.removeFavorite(id);
    this.render();
    App.toast('已取消收藏');
  },

  practice() {
    const questions = Storage.getFavoriteList();
    if (questions.length === 0) { App.toast('没有收藏题目'); return; }
    App.navTo('quiz', { questions, config: { mode: 'favorite', typeFilter: [], count: 0 } });
  }
};

// ===== 搜索页 =====
const SearchPage = {
  keyword: '',

  onInput() {
    this.keyword = document.getElementById('searchInput').value.trim();
    if (!this.keyword) this.reset();
  },

  search() {
    this.keyword = document.getElementById('searchInput').value.trim();
    if (!this.keyword) { App.toast('请输入关键词'); return; }

    const kw = this.keyword.toLowerCase();
    const bank = Storage.getQuestionBank();
    const results = bank.filter(q =>
      q.question.toLowerCase().includes(kw) ||
      q.analysis.toLowerCase().includes(kw) ||
      (q.tags && q.tags.some(t => t.toLowerCase().includes(kw)))
    );

    const area = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');

    if (results.length === 0) {
      area.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    // 高亮关键词
    const highlight = (text) => {
      const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(re, '<span class="search-highlight">$1</span>');
    };

    area.innerHTML = `<div class="text-caption mb-8">找到 ${results.length} 道题目</div>` +
      results.map(q => `
        <div class="question-item">
          <div class="q-title"><span class="tag tag-${q.type}">${QuizEngine.getTypeLabel(q.type)}</span> ${highlight(q.question)}</div>
          <div class="q-meta">
            <span class="text-caption">答案：${q.answer}</span>
            <span class="text-caption">${q.analysis ? highlight(q.analysis.slice(0, 30)) + '...' : ''}</span>
          </div>
        </div>
      `).join('');
  },

  reset() {
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchEmpty').style.display = 'block';
  }
};

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', () => App.init());
