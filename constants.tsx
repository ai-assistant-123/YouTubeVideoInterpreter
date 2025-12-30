
import { AnalysisStyle, KnowledgeLevel, Language } from './types';

export const UI_STRINGS = {
  [Language.ZH]: {
    appTitle: 'YouTube 视频解读',
    inputPlaceholder: '粘贴 YouTube 视频 URL...',
    analyzeBtn: '开始解读',
    exportBtn: '导出 Markdown',
    exportPdfBtn: '导出 PDF',
    styleLabel: '解读风格',
    levelLabel: '掌握程度',
    historyTitle: '解读历史',
    noHistory: '暂无历史记录',
    loadingVideo: '正在获取视频元数据...',
    loadingChapters: '正在从 YouTube 探测章节信息...',
    loadingAnalysis: 'Gemini 正在深入解读章节...',
    errorInvalidUrl: '请输入有效的 YouTube URL。',
    errorFetchFailed: '视频信息获取失败，请检查 URL 或重试。',
    chaptersTitle: '视频章节',
    prevBtn: '上一个',
    nextBtn: '下一个',
    backToInput: '解读新视频',
    deleteHistory: '删除',
    styles: {
      [AnalysisStyle.CLASSROOM]: '课堂式 (严谨、结构化)',
      [AnalysisStyle.STORYTELLING]: '讲故事 (生动、趣味)',
      [AnalysisStyle.INTENSIVE]: '精读 (深度剖析细节)',
      [AnalysisStyle.FAST_TALK]: '速讲 (高效总结要点)',
      [AnalysisStyle.DIALOGUE]: '对话 (问答交互感)',
    },
    levels: {
      [KnowledgeLevel.BEGINNER]: '初学者 (通俗易懂)',
      [KnowledgeLevel.INTERMEDIATE]: '进阶者 (平衡专业与科普)',
      [KnowledgeLevel.EXPERT]: '专家 (深度专业讨论)',
    }
  },
  [Language.EN]: {
    appTitle: 'YouTube Interpreter',
    inputPlaceholder: 'Paste YouTube Video URL...',
    analyzeBtn: 'Analyze Now',
    exportBtn: 'Export Markdown',
    exportPdfBtn: 'Export PDF',
    styleLabel: 'Analysis Style',
    levelLabel: 'Knowledge Level',
    historyTitle: 'History',
    noHistory: 'No history yet',
    loadingVideo: 'Fetching metadata...',
    loadingChapters: 'Detecting chapters from YouTube...',
    loadingAnalysis: 'Gemini is interpreting the chapter...',
    errorInvalidUrl: 'Please enter a valid YouTube URL.',
    errorFetchFailed: 'Failed to fetch video info. Please check the URL.',
    chaptersTitle: 'Chapters',
    prevBtn: 'Previous',
    nextBtn: 'Next',
    backToInput: 'Interpret New',
    deleteHistory: 'Delete',
    styles: {
      [AnalysisStyle.CLASSROOM]: 'Classroom (Formal & Structured)',
      [AnalysisStyle.STORYTELLING]: 'Storytelling (Vivid & Fun)',
      [AnalysisStyle.INTENSIVE]: 'Intensive (Deep Dive Details)',
      [AnalysisStyle.FAST_TALK]: 'Fast Talk (Key Points Summary)',
      [AnalysisStyle.DIALOGUE]: 'Dialogue (Q&A Style)',
    },
    levels: {
      [KnowledgeLevel.BEGINNER]: 'Beginner (Simple & Clear)',
      [KnowledgeLevel.INTERMEDIATE]: 'Intermediate (Balanced Professionalism)',
      [KnowledgeLevel.EXPERT]: 'Expert (Technical Discussion)',
    }
  }
};
