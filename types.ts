
export enum Language {
  ZH = 'zh',
  EN = 'en'
}

export enum AnalysisStyle {
  CLASSROOM = 'classroom',
  STORYTELLING = 'storytelling',
  INTENSIVE = 'intensive',
  FAST_TALK = 'fast_talk',
  DIALOGUE = 'dialogue'
}

export enum KnowledgeLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert'
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number;
  description?: string;
}

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  duration: number; // seconds
  chapters: Chapter[];
}

export interface AnalysisResult {
  chapterId: string;
  content: string; // Markdown content
}

export interface InterpretationHistory {
  id: string;
  videoInfo: VideoInfo;
  style: AnalysisStyle;
  level: KnowledgeLevel;
  results: Record<string, string>; // chapterId -> content
  timestamp: number;
}
