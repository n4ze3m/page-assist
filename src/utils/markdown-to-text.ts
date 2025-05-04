export function markdownToText(markdown: string): string {
    if (!markdown) {
      return '';
    }
  
    let text = markdown.replace(/```[\s\S]*?```/g, '');
  
    // Remove inline code
    text = text.replace(/`([^`]+)`/g, '$1');
  
    // Remove SVG content
    text = text.replace(/<svg[\s\S]*?<\/svg>/g, '');
  
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');
  
    // Replace headers
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');
  
    // Replace bold/italic
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  
    // Replace links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  
    // Replace images
    text = text.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  
    // Replace horizontal rules
    text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '');
  
    // Replace blockquotes
    text = text.replace(/^>\s+(.+)$/gm, '$1');
  
    // Replace ordered and unordered lists
    text = text.replace(/^(\s*)[-*+]\s+(.+)$/gm, '$1$2');
    text = text.replace(/^(\s*)\d+\.\s+(.+)$/gm, '$1$2');
  
    // Replace multiple newlines with a single one
    text = text.replace(/\n{3,}/g, '\n\n');
  
    // Trim whitespace
    text = text.trim();
  
    return text;
  }
  