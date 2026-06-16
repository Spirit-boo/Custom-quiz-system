# CLAUDE.md

## 项目概述
这是一个个人定制刷题 PWA 网页应用，纯前端 + 本地存储，无需后端。托管到 GitHub Pages，分享链接即可使用。支持手机和电脑浏览器，可添加到手机桌面像 App 一样。

## 标准文档路径

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求文档 | [docs/requirements.md](docs/requirements.md) | 完整功能需求列表 |
| 技术规范 | [docs/tech-spec.md](docs/tech-spec.md) | 技术栈、数据模型、目录结构、存储设计 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 色彩、排版、间距、组件、交互规范 |
| 执行步骤 | [docs/execution-plan.md](docs/execution-plan.md) | 分 9 步的详细开发计划 |
| 开发日志 | [dev-logs/](dev-logs/) | 每日开发记录 |

## 工作说明

### 开发节奏
- **一次只做一步**，不跨步骤开发
- 每一步完成后用浏览器打开 `index.html` 验证
- 每一步完成后更新 `dev-logs/` 日志和 `docs/execution-plan.md` 勾选状态

### 日志规范
- 每天在 `dev-logs/` 创建 `YYYY-MM-DD.md` 文件
- 参考 `dev-logs/template.md` 模板
- 记录：今日完成、问题、明日计划

### 代码规范
- 遵循 `docs/tech-spec.md` 中的目录结构和数据模型
- 遵循 `docs/design-spec.md` 中的 UI 规范（色彩、字号、间距）
- 纯原生 JS，不使用任何框架（Vue/React/jQuery）
- 外部库仅使用 xlsx（CDN 按需加载）
- 所有 JS 文件使用 ES6+ 模块（`export`/`import`）
- 注释使用中文，变量使用英文驼峰命名
- localStorage 键名统一前缀 `quiz_`

### 开发顺序
严格按照 `docs/execution-plan.md` 中的 9 个步骤执行：
1. PWA 骨架 → 2. 数据层 → 3. 页面视图 → 4. PWA 增强 + 部署

### 页面/视图列表（8 个）
1. 首页（home）— 题库统计 + 功能入口
2. 导入（import）— 文件上传 + 校验
3. 答题设置（setup）— 数量/模式/题型选择
4. 答题（quiz）— 核心答题交互
5. 答题报告（result）— 成绩分析
6. 错题本（wrong-book）— 错题管理
7. 收藏夹（favorites）— 收藏管理
8. 搜索（search）— 关键词搜索

### 验证方式
- 每一步完成后在 Chrome 浏览器中打开 `index.html` 测试
- 使用浏览器开发者工具（F12）查看控制台和 localStorage
- 准备测试题库文件（.csv / .txt）
- 手机测试：GitHub Pages 部署后用手机浏览器访问

### 关键约束
- 纯前端，无后端服务器
- localStorage 上限约 5-10MB
- Service Worker 仅 HTTPS 生效（本地 HTTP 测试时跳过）
- PWA「添加到桌面」需要 HTTPS（GitHub Pages 满足）
- 不使用需要企业认证的任何服务
