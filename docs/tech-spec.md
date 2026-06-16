# 技术规范 (PWA 网页应用)

## 技术栈

| 层级 | 技术 |
|------|------|
| 架构 | 单页应用 (SPA) — 单个 HTML + JS 视图切换 |
| 语言 | 原生 JavaScript (ES6+)，无框架依赖 |
| 样式 | 原生 CSS3，CSS 变量管理主题色 |
| 存储 | localStorage（本地持久化） |
| 文件解析 | 纯 JS 实现（CSV/TXT 文本解析 + SheetJS xlsx 库处理 Excel） |
| 离线 | Service Worker 缓存 |
| PWA | Web App Manifest（可添加到手机桌面） |
| 托管 | GitHub Pages（免费，HTTPS） |

## 技术选型理由

- **零依赖**：不引入 Vue/React 等框架，减少学习成本和体积
- **纯前端**：无后端服务器，数据完全存用户浏览器
- **单文件入口**：一个 index.html 承载全部视图，JS 控制页面切换
- **分享即用**：链接发给任何人，浏览器打开即可使用

## 目录结构

```
test_new_project/
├── index.html              # 唯一入口，包含所有页面视图模板
├── manifest.json           # PWA 配置（图标、名称、启动方式）
├── sw.js                   # Service Worker（离线缓存）
├── css/
│   └── style.css           # 全局样式 + 各页面样式
├── js/
│   ├── app.js              # 应用入口（初始化、路由、页面切换）
│   ├── storage.js          # localStorage 封装
│   ├── parser.js           # 文件解析器（CSV/TXT/Excel）
│   ├── validator.js        # 数据校验器
│   ├── quiz-engine.js      # 答题引擎
│   └── report.js           # 报告生成器
├── assets/
│   └── icons/              # PWA 图标（192x192, 512x512）
├── docs/                   # 项目文档
├── dev-logs/               # 开发日志
└── CLAUDE.md               # AI 开发指引
```

## 数据模型（不变）

```js
// 题目 Question
{
  id: "uuid-string",
  type: "single",           // single | judge | multiple | fill
  question: "题目文字内容",
  options: ["选项A", "选项B", "选项C"], // 填空为 []
  answer: "A",              // 多选用逗号分隔 "A,C"
  analysis: "解析文字",
  tags: [],
  source: "文件名.xlsx",
  createdAt: 1700000000000
}
```

## 存储键名（使用 localStorage）

```js
const STORAGE_KEYS = {
  QUESTION_BANK:  'quiz_questionBank',
  WRONG_BOOK:     'quiz_wrongBook',
  FAVORITES:      'quiz_favorites',
  QUIZ_PROGRESS:  'quiz_progress',
  QUIZ_HISTORY:   'quiz_history',
  APP_SETTINGS:   'quiz_settings'
};
```

前缀 `quiz_` 避免与其他网站 localStorage 冲突。

## 浏览器兼容性

- Chrome 80+
- Edge 80+
- Safari 14+
- Firefox 80+
- 微信内置浏览器（iOS/Android）
- 所有现代手机浏览器

## 关键约束

- localStorage 上限约 5-10MB（各浏览器不同），题库过大会有风险
- Service Worker 仅 HTTPS 环境生效（GitHub Pages 默认 HTTPS）
- Excel 解析使用 xlsx 库 CDN 引入（约 500KB），按需加载
- 首次加载需联网，之后可离线使用
