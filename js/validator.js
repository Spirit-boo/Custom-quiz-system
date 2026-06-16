// js/validator.js — 数据校验器
const Validator = (() => {

  const VALID_TYPES = ['single', 'judge', 'multiple', 'fill'];
  const TYPE_LABELS = { single: '单选', judge: '判断', multiple: '多选', fill: '填空' };

  /**
   * 将解析后的行数据 + 字段映射 → 题目数组 + 校验结果
   * @param {Array<Array<string>>} rows - 原始行数据
   * @param {Array<string>} columns - 列名
   * @param {Object} mapping - { question: '题目', type: '题型', answer: '答案', analysis: '解析', options: ['A','B','C','D'] }
   */
  function process(rows, columns, mapping) {
    const results = [];

    rows.forEach((row, idx) => {
      const lineNum = idx + 1;
      const errors = [];
      const warnings = [];

      // 提取字段值
      const getVal = (field) => {
        if (!mapping[field]) return '';
        const colIdx = columns.indexOf(mapping[field]);
        return colIdx >= 0 ? (row[colIdx] || '') : '';
      };

      const question = getVal('question');
      const typeRaw = getVal('type');
      const answerRaw = getVal('answer');
      const analysis = getVal('analysis');

      // 获取选项值
      const optionFields = mapping.options || [];
      const options = optionFields
        .map(f => { const i = columns.indexOf(f); return i >= 0 ? row[i] : ''; })
        .filter(v => v !== '');

      // --- 校验 ---

      // 1. 题目非空
      if (!question) errors.push(`第${lineNum}行：题目为空`);

      // 2. 题型识别
      let type = '';
      const t = typeRaw.toLowerCase();
      if (t.includes('单选') || t === 'single') type = 'single';
      else if (t.includes('判断') || t.includes('对错') || t === 'judge') type = 'judge';
      else if (t.includes('多选') || t === 'multiple') type = 'multiple';
      else if (t.includes('填空') || t === 'fill') type = 'fill';

      if (!type) {
        errors.push(`第${lineNum}行：题型无法识别（"${typeRaw}"），应为 单选/判断/多选/填空`);
      }

      // 3. 答案不能缺失
      if (!answerRaw) {
        errors.push(`第${lineNum}行：答案缺失`);
      }

      // 4. 选项数量与题型匹配
      if (type === 'fill') {
        // 填空不需要选项
        if (options.length > 0) {
          warnings.push(`第${lineNum}行：填空类型通常不需要选项，选项将被忽略`);
        }
      } else {
        if (options.length < 2) {
          errors.push(`第${lineNum}行：选项不足（至少需要2个），当前 ${options.length} 个`);
        }
        if (type === 'multiple' && options.length < 3) {
          warnings.push(`第${lineNum}行：多选题建议至少3个选项`);
        }
      }

      // 5. 答案是否在选项范围内（非填空题）
      if (type && type !== 'fill' && options.length > 0 && answerRaw) {
        const optionLabels = options.map((_, i) => String.fromCharCode(65 + i)); // A, B, C...
        const answers = answerRaw.toUpperCase().split(/[,，]/).map(s => s.trim()).filter(Boolean);
        const invalidAnswers = answers.filter(a => !optionLabels.includes(a));
        if (invalidAnswers.length > 0) {
          errors.push(`第${lineNum}行：答案"${invalidAnswers.join(',')}"不在选项范围(${optionLabels.join(',')})内`);
        }
        if (type === 'single' && answers.length > 1) {
          warnings.push(`第${lineNum}行：单选题答案有多个，仅取第一个"${answers[0]}"`);
        }
      }

      results.push({
        lineNum,
        hasError: errors.length > 0,
        hasWarning: warnings.length > 0,
        errors,
        warnings,
        data: question ? {
          id: null, // 入库时生成
          type, question, options, answer: answerRaw.toUpperCase().split(/[,，]/).map(s => s.trim()).join(','),
          analysis, tags: [], source: '', createdAt: Date.now()
        } : null
      });
    });

    return {
      passed: results.filter(r => r.data && !r.hasError),
      withWarnings: results.filter(r => r.data && r.hasWarning && !r.hasError),
      errors: results.filter(r => r.hasError),
      all: results
    };
  }

  /**
   * 重复检测（在导入前，与已有题库比对）
   */
  function checkDuplicates(newQuestions, existingBank) {
    const dupes = [];
    newQuestions.forEach((q, i) => {
      const exists = existingBank.some(eq =>
        eq.question.trim() === q.question.trim() &&
        JSON.stringify(eq.options) === JSON.stringify(q.options)
      );
      if (exists) dupes.push({ index: i, question: q.question.slice(0, 30) });
    });
    return dupes;
  }

  return { process, checkDuplicates, VALID_TYPES, TYPE_LABELS };
})();
