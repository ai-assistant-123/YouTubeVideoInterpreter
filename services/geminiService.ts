
import { GoogleGenAI } from "@google/genai";
import { AnalysisStyle, KnowledgeLevel, Language, Chapter, VideoInfo } from '../types';

export interface AnalysisResponse {
  text: string;
  sources: { title: string; uri: string }[];
}

export async function extractChaptersFromUrl(url: string, title: string): Promise<Chapter[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `You are a YouTube Metadata Expert.
  Task: Identify the chapters/segments for this video: "${title}" (${url}).
  
  Steps:
  1. Use Google Search to find the official chapters, timestamps, or a content breakdown for this specific video.
  2. If official chapters exist, extract them exactly.
  3. If NO official chapters exist, logically divide the video content into 4-6 distinct, meaningful segments based on typical structure for this type of content.
  
  Output Format (Strictly strictly adhere to this list format):
  0:00 - Introduction
  5:30 - Topic Name
  ...

  Do not add any conversational text. Only the list.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text || "";
    const lines = text.split('\n');
    const chapters: Chapter[] = [];
    
    // Improved regex to handle various timestamp formats (e.g., [00:00], 0:00, 00:00)
    const timeRegex = /(\d{1,2}:)?\d{1,2}:\d{2}/;

    lines.forEach((line, index) => {
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        const timeStr = timeMatch[0];
        const parts = timeStr.split(':').reverse();
        let seconds = 0;
        if (parts[0]) seconds += parseInt(parts[0], 10);
        if (parts[1]) seconds += parseInt(parts[1], 10) * 60;
        if (parts[2]) seconds += parseInt(parts[2], 10) * 3600;

        // Clean title: remove timestamp, dashes, brackets
        let title = line.replace(timeStr, '').trim();
        title = title.replace(/^[\s\-\[\]\(\)\.]+/, '').trim();
        
        if (title) {
          chapters.push({
            id: `ch_${index}`,
            title,
            startTime: seconds,
            endTime: 0 // Will fix in next step
          });
        }
      }
    });

    // Fix end times
    for (let i = 0; i < chapters.length; i++) {
      if (i < chapters.length - 1) {
        chapters[i].endTime = chapters[i+1].startTime;
      } else {
        chapters[i].endTime = chapters[i].startTime + 900; // default 15 min for last chapter
      }
    }

    // Fallback if extraction failed
    if (chapters.length === 0) {
      return [
        { id: 'p1', title: 'Beginning & Context', startTime: 0, endTime: 300 },
        { id: 'p2', title: 'Core Content', startTime: 300, endTime: 600 },
        { id: 'p3', title: 'Key Details', startTime: 600, endTime: 900 },
        { id: 'p4', title: 'Conclusion', startTime: 900, endTime: 1200 }
      ];
    }

    return chapters;
  } catch (error) {
    console.error("Chapter Extraction Error:", error);
    // Fallback Mock
    return [{ id: 'full', title: 'Complete Analysis', startTime: 0, endTime: 3600 }];
  }
}

// Helper to generate style-specific instructions
function getStyleInstruction(style: AnalysisStyle): string {
  switch (style) {
    case AnalysisStyle.CLASSROOM:
      return `
      STYLE: CLASSROOM / ACADEMIC
      - Structure the output like a high-quality set of lecture notes.
      - Use headers like "## Core Concepts", "## Detailed Explanation", and "## Key Takeaways".
      - bold key terms and provide brief definitions if they are technical.
      - Tone: Educational, structured, encouraging, and clear.
      - End with a "Self-Check Question" related to the content.
      `;
    case AnalysisStyle.STORYTELLING:
      return `
      STYLE: STORYTELLING / NARRATIVE
      - Transform the information into a compelling narrative flow.
      - Use vivid language and analogies to explain what is happening in the video.
      - Connect the facts together like a story with a beginning, middle, and end.
      - Tone: Engaging, warm, captivating, like a blog post or a documentary narrator.
      - Avoid overly rigid lists; use paragraphs that flow into each other.
      `;
    case AnalysisStyle.INTENSIVE:
      return `
      STYLE: INTENSIVE / DEEP DIVE
      - Provide a rigorous, granular analysis of the content.
      - Scrutinize specific claims, data points, or arguments presented.
      - If the video mentions specific tools, theories, or people, provide context about them.
      - Tone: Critical, analytical, professional, and dense with information.
      - Highlight "Nuances" or "Hidden Details" that a casual viewer might miss.
      `;
    case AnalysisStyle.FAST_TALK:
      return `
      STYLE: FAST TALK / EXECUTIVE SUMMARY
      - Focus on high-density information with minimal fluff.
      - Use bullet points extensively.
      - Sections: "TL;DR", "Actionable Insights", "Bottom Line".
      - Tone: Direct, efficient, business-like.
      - Maximum impact, minimum reading time.
      `;
    case AnalysisStyle.DIALOGUE:
      return `
      STYLE: DIALOGUE / Q&A
      - Present the analysis as a conversation between a curious Student and an Expert Mentor.
      - The Student asks relevant questions based on the chapter title.
      - The Mentor answers using the specific content from the video.
      - Tone: Conversational, Socratic, easy to follow.
      `;
    default:
      return `STYLE: General Summary. clear and concise.`;
  }
}

// Helper to generate level-specific instructions
function getLevelInstruction(level: KnowledgeLevel): string {
  switch (level) {
    case KnowledgeLevel.BEGINNER:
      return `
      LEVEL: BEGINNER (ELI5)
      - Assume the reader has ZERO prior knowledge of this topic.
      - Use simple analogies to explain complex terms.
      - Avoid jargon where possible, or explain it immediately in plain language.
      - Keep sentences relatively short and digestible.
      `;
    case KnowledgeLevel.INTERMEDIATE:
      return `
      LEVEL: INTERMEDIATE
      - Assume the reader has a basic understanding but wants to learn more.
      - Balance professional terminology with clear explanations.
      - Focus on "How" and "Why", not just "What".
      `;
    case KnowledgeLevel.EXPERT:
      return `
      LEVEL: EXPERT
      - Use industry-standard terminology freely.
      - Don't waste time explaining basic concepts.
      - Focus on advanced implications, edge cases, and technical specifics.
      - Treat the reader as a peer in the field.
      `;
    default:
      return `LEVEL: General Audience.`;
  }
}

export async function analyzeChapter(
  videoInfo: VideoInfo,
  chapter: Chapter,
  style: AnalysisStyle,
  level: KnowledgeLevel,
  lang: Language
): Promise<AnalysisResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const targetLang = lang === Language.ZH ? 'Simplified Chinese (简体中文)' : 'English';
  
  const systemPrompt = `
  ROLE: You are an Elite Video Content Analyst and Educator.
  OBJECTIVE: specific, accurate, and high-value interpretation of a specific video chapter.
  
  TARGET VIDEO:
  - Title: "${videoInfo.title}"
  - URL: ${videoInfo.url}
  
  CURRENT CHAPTER CONTEXT:
  - Chapter Title: "${chapter.title}"
  - Timeframe: ${chapter.startTime}s to ${chapter.endTime}s
  
  ${getStyleInstruction(style)}
  
  ${getLevelInstruction(level)}
  
  CRITICAL INSTRUCTIONS:
  1. **GROUNDING**: You MUST use the 'googleSearch' tool to find the actual transcript, summary, or content discussion of THIS specific video. Do not guess.
  2. **ACCURACY**: Base your interpretation strictly on the likely content of this video chapter.
  3. **FORMAT**: Output strictly in Markdown. Use Bold for emphasis.
  4. **LANGUAGE**: Output entirely in ${targetLang}.
  `;

  const userPrompt = `
  Please interpret the chapter "${chapter.title}" of the video "${videoInfo.title}".
  
  Using the search tool, verify what is actually discussed or shown during this segment. 
  Synthesize this information according to the requested "${style}" style and "${level}" level.
  
  If the specific details of this chapter are hard to find, provide the best logical reconstruction based on the video's general topic and this chapter's title, but explicitly state you are inferring based on context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
        temperature: 0.4, // Slightly lower for more factual adherence
      },
    });

    const text = response.text || "Failed to generate interpretation.";
    const sources: { title: string; uri: string }[] = [];
    
    // Extract grounding metadata if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || "Source", uri: chunk.web.uri });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Analysis failed. Gemini API may be busy or the video content is restricted.");
  }
}
