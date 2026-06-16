// js/parser.js — 文件解析器（CSV / TXT / Excel）
const Parser = (() => {

  /**
   * 检测文件类型
   */
  function detectType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'txt') return 'txt';
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'excel';
    return 'unknown';
  }

  /**
   * 解析文件内容 → 题目二维数组（未校验）
   * @param {File} file
   * @returns {Promise<{columns: string[], rows: Array<Array<string>>}>}
   */
  async function parse(file) {
    const type = detectType(file.name);
    if (type === 'txt') return parseText(await file.text());
    if (type === 'csv') return parseCSV(await file.text());
    if (type === 'excel') return parseExcel(file);
    throw new Error('不支持的文件格式');
  }

  /**
   * 解析 TXT（Tab 或空格分隔，每行一道题）
   * 格式：题型 | 题目 | 选项A | 选项B | ... | 答案 | 解析
   */
  function parseText(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return { columns: [], rows: [] };

    // 检测分隔符（Tab 优先，否则 |
    const sep = lines[0].includes('\t') ? '\t' : '|';

    const rows = lines.map(line =>
      line.split(sep).map(s => s.trim())
    );

    const headers = rows[0];
    // 如果第一行看起来像表头（包含常见字段名）
    const headerKeywords = ['题目', '问题', '类型', '题型', '答案', '解析', '选项', 'A', 'B'];
    const isHeader = headers.some(h => headerKeywords.some(k => h.includes(k)));

    if (isHeader) {
      return { columns: headers, rows: rows.slice(1) };
    }
    // 无表头，生成默认列名
    const cols = ['题型', '题目', 'A', 'B', 'C', 'D', 'E', 'F', 'G', '答案', '解析'].slice(0, rows[0].length);
    return { columns: cols, rows };
  }

  /**
   * 解析 CSV（逗号分隔，支持引号转义）
   */
  function parseCSV(text) {
    const rows = [];
    const lines = text.trim().split(/\r?\n/);
    for (const line of lines) {
      const row = [];
      let cell = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === ',' && !inQuote) {
          row.push(cell.trim()); cell = '';
        } else {
          cell += ch;
        }
      }
      row.push(cell.trim());
      if (row.length > 0 && row.some(c => c !== '')) rows.push(row);
    }

    if (rows.length === 0) return { columns: [], rows: [] };

    const headers = rows[0];
    const headerKeywords = ['题目', '问题', '类型', '题型', '答案', '解析', '选项', 'A', 'a'];
    const isHeader = headers.some(h => headerKeywords.some(k => (h || '').includes(k)));

    if (isHeader) {
      return { columns: headers, rows: rows.slice(1) };
    }
    const cols = ['题型', '题目', 'A', 'B', 'C', 'D', 'E', 'F', 'G', '答案', '解析'].slice(0, rows[0].length);
    return { columns: cols, rows };
  }

  /**
   * 解析 Excel（使用 xlsx 库，需 CDN 加载）
   */
  async function parseExcel(file) {
    if (typeof XLSX === 'undefined') {
      await loadXLSX();
    }
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (json.length === 0) return { columns: [], rows: [] };

    const headers = json[0].map(h => String(h));
    const rows = json.slice(1).map(row => row.map(c => String(c).trim()));

    return { columns: headers, rows };
  }

  function loadXLSX() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Excel 解析库加载失败，请检查网络'));
      document.head.appendChild(script);
    });
  }

  return { detectType, parse };
})();
