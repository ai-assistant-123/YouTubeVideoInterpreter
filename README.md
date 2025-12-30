# YouTube Video Interpreter (AI 视频深度解读)

**YouTube Video Interpreter** 是一个基于 React 19 和 Google Gemini 3 API 构建的下一代视频分析工具。它不仅仅是一个摘要生成器，更是一个智能的学习助手，利用最新的 Gemini 3 Flash 模型结合 Google Search Grounding 能力，为 YouTube 视频提供精确、可信且高度定制化的章节级解读。

无论是用于学术研究、技能学习还是快速获取信息，本应用都能通过定制化的风格（如课堂讲义、故事叙述）和难度分级，将非结构化的长视频转化为结构化的深度知识。

## ✨ 主要特性 (Features)

### 🧠 智能核心
*   **混合式章节提取**: 自动探测 YouTube 官方章节；若无官方章节，AI 会利用搜索工具分析视频内容逻辑，自动划分出有意义的片段。
*   **Search Grounding (事实核查)**: 集成 Google Search 工具，AI 在解读时会实时检索相关信息以验证准确性，并提供可点击的数据来源链接（Citations）。

### 🎨 高度定制化分析
支持多种解读风格以适应不同场景：
*   **Classroom (课堂式)**: 严谨、结构化，生成高质量的讲义笔记。
*   **Storytelling (讲故事)**: 生动有趣，利用类比将知识点串联成引人入胜的故事。
*   **Intensive (精读)**: 深度剖析细节、数据与具体论点。
*   **Fast Talk (速讲)**: 高效总结核心要点 (TL;DR)，适合赶时间的用户。
*   **Dialogue (对话)**: 模拟“学生提问-专家解答”的 Socratic 教学模式。

### 📊 动态知识分级
AI 会根据选定的水平调整解释的深度与术语的使用：
*   **Beginner (初学者)**: 通俗易懂，多用类比，避免晦涩术语。
*   **Intermediate (进阶者)**: 平衡专业性与可读性。
*   **Expert (专家)**: 聚焦技术细节与边缘案例，默认读者具备专业背景。

### 🛠 实用工具
*   **多格式导出**: 支持一键导出 **Markdown** 笔记或排版精美的 **PDF** 报告。
*   **双语界面**: 内置中/英双语 UI，一键切换。
*   **历史记录**: 本地存储分析历史，方便随时回看之前的解读。
*   **精准跳转**: 章节标题与视频时间戳深度绑定，点击即可跳转至 YouTube 对应位置。

## 🏗 技术栈 (Tech Stack)

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS (CDN), FontAwesome 6
*   **AI Model**: Google Gemini 3 Flash Preview (`gemini-3-flash-preview`)
*   **SDK**: `@google/genai`
*   **Utilities**: 
    *   `marked` (Markdown 渲染)
    *   `html2pdf.js` (PDF 生成)

## 🚀 快速开始 (Getting Started)

### 前置要求
你需要一个 Google Cloud Project 并启用 Gemini API，获取有效的 **API Key**。

### 安装与运行
本项目是一个现代前端应用。

1.  **配置 API Key**:
    确保你的运行环境（如 Vite, Webpack 或简单的构建脚本）注入了 `process.env.API_KEY`。

2.  **安装依赖**:
    ```bash
    npm install
    ```

3.  **启动应用**:
    ```bash
    npm start
    ```

## 📝 使用指南

1.  **输入 URL**: 在主页输入框粘贴任意 YouTube 视频链接 (支持 `youtube.com` 和 `youtu.be` 短链)。
2.  **定制配置**: 
    *   在下方下拉菜单中选择 **解读风格 (Style)**。
    *   选择 **掌握程度 (Level)**。
3.  **开始分析**: 点击红色分析按钮。
    *   *Step 1*: 系统获取视频元数据。
    *   *Step 2*: Gemini 探测并提取视频章节。
4.  **浏览解读**: 
    *   左侧（桌面端）显示章节列表，点击切换。
    *   右侧显示 AI 生成的深度解读内容。
    *   底部提供数据来源链接。
5.  **导出**: 点击右上角的图标导出为本地文件。

## 📄 License

MIT