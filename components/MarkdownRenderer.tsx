
import React, { useMemo } from 'react';
import { marked } from 'marked';

interface Props {
  content: string;
}

const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    
    try {
      // Configure marked instance
      const renderer = new marked.Renderer();
      
      // Ensure all links open in a new tab
      const originalLink = renderer.link.bind(renderer);
      renderer.link = (href, title, text) => {
        const html = originalLink(href, title, text);
        return html.replace(/^<a /, '<a target="_blank" rel="nofollow noopener noreferrer" ');
      };

      // Use marked.parse with the custom renderer
      return marked.parse(content, { renderer, async: false }) as string;
    } catch (error) {
      console.error("Markdown parsing failed:", error);
      return content; // Fallback to raw text
    }
  }, [content]);

  return (
    <div 
      className="prose max-w-none animate-in fade-in slide-in-from-bottom-2 duration-500"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
