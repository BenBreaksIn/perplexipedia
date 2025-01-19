interface InfoBox {
  title: string;
  image: number;
  key_facts: Record<string, string>;
}

interface FormattedResponse {
  title: string;
  content: string;
  references: string[];
  infobox?: InfoBox;
}

export const formatPerplexityResponse = (response: any, citations: Array<{ id: number; url: string; title: string }> = []): FormattedResponse | null => {
  try {
    // Get the raw content
    let content = typeof response === 'string' ? response : (response?.content || response?.text || '');
    if (!content) return null;

    // Extract title - look for both # and ## at the start of lines
    let title = '';
    const titleMatch = content.match(/^(?:#{1,2})\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      // Remove the title line from content
      content = content.replace(/^(?:#{1,2})\s+.+$/m, '').trim();
    } else {
      // If no title with #, try to get first line as title
      const lines = content.split('\n');
      if (lines.length > 0) {
        title = lines[0].trim();
        content = lines.slice(1).join('\n').trim();
      }
    }

    // Split content into sections while preserving empty lines between sections
    const sections = content.split(/(?=##\s+)/);

    // Format each section
    const formattedSections = sections.map((section: string) => {
      // Ensure proper spacing around headings while preserving other formatting
      return section
        .replace(/##\s+([^\n]+)/g, '\n## $1\n')
        .replace(/###\s+([^\n]+)/g, '\n### $1\n')
        // Fix bullet point formatting - ensure text is on same line as bullet
        .replace(/^-\s*\n+([^\n]+)/gm, '- $1')  // Fix bullet points where text is on next line
        .replace(/^-\s*([^\n]+)/gm, '- $1')     // Fix bullet points with single space
        .replace(/^\*\s*\n+([^\n]+)/gm, '* $1') // Fix asterisk bullets where text is on next line
        .replace(/^\*\s*([^\n]+)/gm, '* $1')    // Fix asterisk bullet points
        .trim();
    });

    // Add citations section
    const references: string[] = [];
    if (citations.length > 0) {
      formattedSections.push('\n## References');
      citations.forEach(citation => {
        // Try to make URL more readable by removing protocol and trailing slashes
        const cleanUrl = citation.url
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
          .split('/')
          .slice(0, 3) // Take only domain and first path segment
          .join('/');

        // Format reference like OpenAI style
        const ref = `[${citation.id}] ${cleanUrl}`;
        references.push(citation.url);
        formattedSections.push(ref);
      });
    }

    // Combine sections with proper spacing
    const formattedContent = formattedSections
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .trim();

    return {
      title: title || 'Untitled Article',
      content: formattedContent,
      references
    };
  } catch (error) {
    console.error('Error formatting Perplexity response:', error);
    return null;
  }
}; 