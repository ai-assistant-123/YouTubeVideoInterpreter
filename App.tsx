
import React, { useState, useEffect, useRef } from 'react';
import { Language, AnalysisStyle, KnowledgeLevel, VideoInfo, InterpretationHistory, Chapter } from './types';
import { UI_STRINGS } from './constants';
import * as youtubeService from './services/youtubeService';
import * as geminiService from './services/geminiService';
import * as storageService from './services/storageService';
import MarkdownRenderer from './components/MarkdownRenderer';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.ZH);
  const [url, setUrl] = useState('');
  const [style, setStyle] = useState<AnalysisStyle>(AnalysisStyle.CLASSROOM);
  const [level, setLevel] = useState<KnowledgeLevel>(KnowledgeLevel.BEGINNER);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'metadata' | 'chapters' | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [history, setHistory] = useState<InterpretationHistory[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [groundingSources, setGroundingSources] = useState<Record<string, {title: string, uri: string}[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');

  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const t = UI_STRINGS[lang];

  useEffect(() => {
    const prefs = storageService.getPrefs();
    if (prefs) {
      setLang(prefs.lang);
      setStyle(prefs.style);
      setLevel(prefs.level);
    }
    setHistory(storageService.getHistory());

    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    storageService.savePrefs(lang, style, level);
  }, [lang, style, level]);

  const handleStartAnalysis = async () => {
    setError(null);
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      setError(t.errorInvalidUrl);
      return;
    }

    setLoading(true);
    setLoadingStep('metadata');
    try {
      const metadata = await youtubeService.fetchVideoMetadata(url);
      setLoadingStep('chapters');
      const realChapters = await geminiService.extractChaptersFromUrl(url, metadata.title || "YouTube Video");
      
      const fullVideo: VideoInfo = {
        id: metadata.id || 'unknown',
        url: url,
        title: metadata.title || 'Untitled Video',
        thumbnail: metadata.thumbnail || '',
        duration: 0,
        chapters: realChapters
      };

      setCurrentVideo(fullVideo);
      setAnalysisResults({});
      setGroundingSources({});
      setActiveChapterIndex(0);
      setLoading(false);
      setLoadingStep(null);
      if (window.innerWidth < 768) setIsSidebarCollapsed(true);
    } catch (err: any) {
      setError(t.errorFetchFailed + (err.message ? ` (${err.message})` : ''));
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const loadFromHistory = (item: InterpretationHistory) => {
    setCurrentVideo(item.videoInfo);
    setStyle(item.style);
    setLevel(item.level);
    setAnalysisResults(item.results);
    setGroundingSources({});
    setActiveChapterIndex(0);
    setError(null);
    if (window.innerWidth < 768) setIsSidebarCollapsed(true);
  };

  const fetchAnalysisForChapter = async (index: number) => {
    if (!currentVideo) return;
    const chapter = currentVideo.chapters[index];
    if (analysisResults[chapter.id]) return;

    setIsAnalyzing(true);
    try {
      const result = await geminiService.analyzeChapter(currentVideo, chapter, style, level, lang);
      
      const newResults = { ...analysisResults, [chapter.id]: result.text };
      setAnalysisResults(newResults);
      setGroundingSources(prev => ({ ...prev, [chapter.id]: result.sources }));

      const historyItem: InterpretationHistory = {
        id: currentVideo.id,
        videoInfo: currentVideo,
        style,
        level,
        results: newResults,
        timestamp: Date.now()
      };
      storageService.saveHistory(historyItem);
      setHistory(storageService.getHistory());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (currentVideo && currentVideo.chapters.length > 0) {
      fetchAnalysisForChapter(activeChapterIndex);
    }
  }, [activeChapterIndex, currentVideo]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getYouTubeTimestampUrl = (videoId: string, startTime: number) => {
    return `https://www.youtube.com/watch?v=${videoId}&t=${startTime}s`;
  };

  const handleExportMD = () => {
    if (!currentVideo) return;

    let markdown = `# ${currentVideo.title}\n\n`;
    markdown += `**Source URL:** ${currentVideo.url}\n`;
    markdown += `**Style:** ${t.styles[style]}\n`;
    markdown += `**Level:** ${t.levels[level]}\n`;
    markdown += `**Export Date:** ${new Date().toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    currentVideo.chapters.forEach((ch, idx) => {
      const content = analysisResults[ch.id];
      if (content) {
        markdown += `## Phase ${idx + 1}: ${ch.title} (${formatTime(ch.startTime)})\n\n`;
        markdown += `[Watch on YouTube](${getYouTubeTimestampUrl(currentVideo.id, ch.startTime)})\n\n`;
        markdown += `${content}\n\n`;
        markdown += `---\n\n`;
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentVideo.title.replace(/[\\/:*?"<>|]/g, '')}_Interpretation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!currentVideo || !pdfTemplateRef.current) return;
    
    // Access html2pdf from the global window object (loaded via script tag in index.html)
    const html2pdf = (window as any).html2pdf;
    
    if (typeof html2pdf !== 'function') {
      console.error("html2pdf library not found on window object.");
      setError("PDF export failed. Library not loaded.");
      return;
    }

    setIsExportingPdf(true);

    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${currentVideo.title.replace(/[\\/:*?"<>|]/g, '')}_Interpretation.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(pdfTemplateRef.current).save();
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setError(`PDF generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const openSettings = () => {
    setCustomApiKey(storageService.getApiKey() || '');
    setIsSettingsOpen(true);
  };

  const saveSettings = () => {
    storageService.saveApiKey(customApiKey);
    setIsSettingsOpen(false);
  };

  const currentSources = currentVideo ? groundingSources[currentVideo.chapters[activeChapterIndex]?.id] || [] : [];
  const hasSomeResults = Object.keys(analysisResults).length > 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-gray-900 bg-[#f8f9fa] overflow-hidden">
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-cog text-gray-400"></i> {t.settingsTitle}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.apiKeyLabel}</label>
                <div className="relative">
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder={t.apiKeyPlaceholder}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-red-500 transition-all outline-none font-mono text-sm shadow-inner"
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fas fa-key"></i>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">{t.apiKeyHelp}</p>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  {t.cancelBtn}
                </button>
                <button 
                  onClick={saveSettings}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  {t.saveBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
          OFF-SCREEN PDF TEMPLATE 
      */}
      <div 
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }} 
        aria-hidden="true"
      >
        <div ref={pdfTemplateRef} className="pdf-content prose max-w-none p-10 bg-white">
          {currentVideo && (
            <>
              <div style={{ borderBottom: '2px solid #ef4444', marginBottom: '30px', paddingBottom: '20px' }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#111827' }}>{currentVideo.title}</h1>
                <div style={{ display: 'flex', gap: '30px', fontSize: '14px', color: '#4b5563', marginTop: '10px' }}>
                  <span><strong>{t.styleLabel}:</strong> {t.styles[style]}</span>
                  <span><strong>{t.levelLabel}:</strong> {t.levels[level]}</span>
                  <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>{currentVideo.url}</p>
              </div>

              {currentVideo.chapters.map((ch, idx) => {
                const content = analysisResults[ch.id];
                if (!content) return null;
                return (
                  <div key={ch.id} style={{ marginBottom: '50px' }}>
                    <h2 style={{ fontSize: '22px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginTop: '40px' }}>
                      Phase {idx + 1}: {ch.title} ({formatTime(ch.startTime)})
                    </h2>
                    <MarkdownRenderer content={content} />
                    <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', marginTop: '30px' }} />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:relative z-40 h-screen bg-white border-r border-gray-200 
          transition-all duration-300 ease-in-out flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]
          ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 pointer-events-none' : 'translate-x-0 w-80 opacity-100'}
        `}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between min-w-[20rem]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
               <i className="fab fa-youtube text-white text-lg"></i>
            </div>
            <h1 className="text-lg font-black tracking-tight">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={openSettings}
              className="w-8 h-7 flex items-center justify-center text-[12px] bg-gray-100 rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
              title={t.settingsTitle}
            >
              <i className="fas fa-cog"></i>
            </button>
            <button 
              onClick={() => setLang(lang === Language.ZH ? Language.EN : Language.ZH)}
              className="px-2 py-1 text-[10px] font-bold bg-gray-100 rounded-md text-gray-500 hover:bg-gray-200 uppercase transition-colors"
            >
              {lang}
            </button>
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              className="md:flex hidden w-8 h-8 items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Collapse Sidebar"
            >
              <i className="fas fa-angles-left"></i>
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto min-w-[20rem]">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">{t.historyTitle}</h2>
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-10 opacity-40">
                <i className="fas fa-history text-3xl mb-2"></i>
                <p className="text-xs">{t.noHistory}</p>
              </div>
            ) : (
              history.map(item => (
                <div 
                  key={item.timestamp}
                  onClick={() => loadFromHistory(item)}
                  className="group bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:shadow-xl hover:border-red-100 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex gap-3">
                    <img src={item.videoInfo.thumbnail} className="w-16 h-10 object-cover rounded-md shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold truncate text-gray-800">{item.videoInfo.title}</h3>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <button 
          onClick={() => setIsSidebarCollapsed(true)}
          className="md:hidden absolute -right-12 top-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg text-gray-400"
        >
          <i className="fas fa-times"></i>
        </button>
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto h-screen relative bg-white transition-all duration-300">
        
        {isSidebarCollapsed && (
          <button 
            onClick={() => setIsSidebarCollapsed(false)}
            className="fixed left-6 top-5 z-50 w-10 h-10 bg-white/80 backdrop-blur shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Expand Sidebar"
          >
            <i className="fas fa-bars"></i>
          </button>
        )}

        {!currentVideo ? (
          <div className="flex items-center justify-center min-h-full p-6">
            <div className="max-w-xl w-full">
              <div className="text-center mb-12">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse"></div>
                  <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white rounded-[2rem] shadow-2xl mb-6">
                     <i className="fab fa-youtube text-4xl text-red-600"></i>
                  </div>
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">AI 视频深度解读</h2>
                <p className="text-gray-500 text-lg">支持自动提取 YouTube 官方章节，Gemini 3 为您实时拆解</p>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-10 border border-white space-y-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{t.inputPlaceholder}</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="粘贴 URL 并获取真实章节..."
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 transition-all outline-none text-gray-800 shadow-inner font-medium"
                    />
                  </div>
                  {error && <p className="mt-3 text-sm text-red-500 flex items-center gap-2 font-bold px-1 animate-bounce"><i className="fas fa-circle-exclamation"></i> {error}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t.styleLabel}</label>
                    <select 
                      value={style} 
                      onChange={(e) => setStyle(e.target.value as AnalysisStyle)}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-red-50 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {Object.values(AnalysisStyle).map(s => (
                        <option key={s} value={s}>{t.styles[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t.levelLabel}</label>
                    <select 
                      value={level} 
                      onChange={(e) => setLevel(e.target.value as KnowledgeLevel)}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {Object.values(KnowledgeLevel).map(l => (
                        <option key={l} value={l}>{t.levels[l]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-red-200 flex flex-col items-center justify-center gap-1 text-lg group"
                >
                  <div className="flex items-center gap-3">
                    {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>}
                    <span>{loading ? (loadingStep === 'metadata' ? t.loadingVideo : t.loadingChapters) : t.analyzeBtn}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-[#fdfdfd]">
            {/* Analysis Header */}
            <div className={`bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 transition-all ${isSidebarCollapsed ? 'pl-20' : 'pl-6'}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button 
                  onClick={() => setCurrentVideo(null)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div className="truncate">
                  <h2 className="text-sm font-black text-gray-900 truncate mb-1">{currentVideo.title}</h2>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tighter">{t.styles[style]}</span>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">{t.levels[level]}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                 {hasSomeResults && (
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={handleExportMD}
                      className="hidden sm:flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl text-lg font-bold transition-all shadow-sm group"
                      title={t.exportBtn}
                    >
                      <i className="fas fa-file-code group-hover:scale-110 transition-transform"></i>
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      disabled={isExportingPdf}
                      className="hidden sm:flex items-center justify-center w-10 h-10 bg-red-600 text-white hover:bg-red-700 rounded-xl text-lg font-bold transition-all shadow-sm group disabled:opacity-50"
                      title={t.exportPdfBtn}
                    >
                      {isExportingPdf ? <i className="fas fa-circle-notch fa-spin text-sm"></i> : <i className="fas fa-file-pdf group-hover:scale-110 transition-transform"></i>}
                    </button>
                   </div>
                 )}
                 <div className="flex items-center bg-gray-100 rounded-xl p-1 ml-2">
                   <button 
                     onClick={() => setActiveChapterIndex(Math.max(0, activeChapterIndex - 1))}
                     disabled={activeChapterIndex === 0}
                     className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white rounded-lg disabled:opacity-30 transition-all shadow-sm"
                   >
                     <i className="fas fa-chevron-left text-xs"></i>
                   </button>
                   <div className="px-3 text-xs font-bold text-gray-400">
                      <span className="text-gray-900">{activeChapterIndex + 1}</span> / {currentVideo.chapters.length}
                   </div>
                   <button 
                     onClick={() => setActiveChapterIndex(Math.min(currentVideo.chapters.length - 1, activeChapterIndex + 1))}
                     disabled={activeChapterIndex === currentVideo.chapters.length - 1}
                     className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white rounded-lg disabled:opacity-30 transition-all shadow-sm"
                   >
                     <i className="fas fa-chevron-right text-xs"></i>
                   </button>
                 </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Desktop Chapters Sidebar */}
              <div className="w-80 border-r border-gray-50 bg-white overflow-y-auto hidden lg:block p-8">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">REAL CHAPTERS</h3>
                <div className="space-y-4">
                  {currentVideo.chapters.map((ch, idx) => (
                    <div key={ch.id} className="relative group/item">
                      <button
                        onClick={() => setActiveChapterIndex(idx)}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex flex-col gap-2 pr-12 ${
                          activeChapterIndex === idx 
                          ? 'bg-red-50 ring-1 ring-red-100 shadow-xl shadow-red-500/5' 
                          : 'hover:bg-gray-50 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-mono px-2 py-1 rounded-md ${activeChapterIndex === idx ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-400'}`}>
                            {formatTime(ch.startTime)}
                          </span>
                          {analysisResults[ch.id] && <i className="fas fa-check-circle text-green-500 text-[10px]"></i>}
                        </div>
                        <span className={`text-sm font-black leading-snug ${activeChapterIndex === idx ? 'text-red-900' : 'text-gray-600'}`}>
                          {ch.title}
                        </span>
                      </button>
                      <a 
                        href={getYouTubeTimestampUrl(currentVideo.id, ch.startTime)}
                        target={`yt_player_${currentVideo.id}`}
                        rel="noopener noreferrer"
                        title="Watch on YouTube"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 z-10"
                      >
                        <i className="fas fa-play text-[10px]"></i>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Analysis View */}
              <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16">
                <div className="max-w-3xl mx-auto">
                  <div className="mb-12 relative group">
                    <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl mb-10">
                       <img 
                        src={currentVideo.thumbnail} 
                        className="w-full aspect-video object-cover group-hover:scale-[1.05] transition-transform duration-700" 
                        alt="" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      <a 
                        href={getYouTubeTimestampUrl(currentVideo.id, currentVideo.chapters[activeChapterIndex].startTime)}
                        target={`yt_player_${currentVideo.id}`}
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                          <i className="fas fa-play text-2xl ml-1"></i>
                        </div>
                      </a>
                    </div>
                    
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-gray-900 text-white px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Phase {activeChapterIndex + 1}</span>
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                          <i className="far fa-clock"></i> {formatTime(currentVideo.chapters[activeChapterIndex].startTime)} 
                          <span className="text-gray-200">•</span>
                          {currentVideo.title}
                        </span>
                      </div>
                      <a 
                        href={getYouTubeTimestampUrl(currentVideo.id, currentVideo.chapters[activeChapterIndex].startTime)}
                        target={`yt_player_${currentVideo.id}`}
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest group/link"
                      >
                        <span>Watch on YouTube</span>
                        <i className="fas fa-external-link-alt group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform"></i>
                      </a>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.05] mb-8 tracking-tight">
                      {currentVideo.chapters[activeChapterIndex].title}
                    </h1>
                  </div>

                  <div className="min-h-[500px]">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-32 space-y-8">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-red-50 border-t-red-600 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fab fa-google text-red-600 text-xl animate-pulse"></i>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-gray-900 mb-2">{t.loadingAnalysis}</p>
                          <p className="text-gray-400 text-sm max-w-xs mx-auto">Gemini 正在检索此视频段落的真实内容并进行专家级解读...</p>
                        </div>
                      </div>
                    ) : analysisResults[currentVideo.chapters[activeChapterIndex].id] ? (
                      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <MarkdownRenderer content={analysisResults[currentVideo.chapters[activeChapterIndex].id]} />
                        
                        {currentSources.length > 0 && (
                          <div className="mt-20 p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
                             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                               <i className="fas fa-fingerprint text-red-600"></i> 数据源与搜索结果证据
                             </h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {currentSources.map((source, sIdx) => (
                                 <a 
                                   key={sIdx}
                                   href={source.uri}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-red-50 hover:text-red-700 text-gray-600 rounded-xl text-xs font-bold border border-gray-100 transition-all shadow-sm truncate"
                                 >
                                   <i className="fas fa-globe text-gray-300 group-hover:text-red-400"></i>
                                   <span className="truncate">{source.title}</span>
                                 </a>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-32 opacity-20">
                        <i className="fas fa-ghost text-6xl mb-6"></i>
                        <p className="font-black text-2xl tracking-tighter">EMPTY VOID</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-24 pt-12 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <button 
                      onClick={() => setActiveChapterIndex(Math.max(0, activeChapterIndex - 1))}
                      disabled={activeChapterIndex === 0}
                      className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border-2 border-gray-100 text-sm font-black text-gray-400 hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-20"
                    >
                      <i className="fas fa-chevron-left"></i>
                      {t.prevBtn}
                    </button>
                    <button 
                      onClick={() => setActiveChapterIndex(Math.min(currentVideo.chapters.length - 1, activeChapterIndex + 1))}
                      disabled={activeChapterIndex === currentVideo.chapters.length - 1}
                      className="w-full sm:w-auto flex items-center justify-center gap-4 px-12 py-4 rounded-2xl bg-gray-900 text-white text-sm font-black hover:bg-black hover:shadow-2xl active:scale-95 transition-all disabled:opacity-20"
                    >
                      {t.nextBtn}
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {!isSidebarCollapsed && (
        <div 
          onClick={() => setIsSidebarCollapsed(true)}
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity"
        />
      )}
    </div>
  );
};

export default App;
