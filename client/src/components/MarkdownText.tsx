import React from 'react';

// Renders the markdown subset the AI actually produces:
//   **bold**, numbered lists (1. 2. 3.), bullet lists (• - *), paragraphs

function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i}>{part.slice(2, -2)}</strong>
            : part
    );
}

const MarkdownText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const isNumbered = (line: string) => /^\d+\.\s/.test(line.trim());
    const isBullet   = (line: string) => /^[•\-\*]\s/.test(line.trim());

    // Group consecutive lines of the same type into segments
    type SegType = 'numbered' | 'bullet' | 'text';
    const segments: { type: SegType; lines: string[] }[] = [];

    for (const raw of text.split('\n')) {
        const line = raw; // preserve original indentation for text
        if (line.trim() === '') {
            // Empty line = paragraph break — close current segment
            if (segments.length > 0) segments.push({ type: 'text', lines: [''] });
            continue;
        }
        const type: SegType = isNumbered(line) ? 'numbered' : isBullet(line) ? 'bullet' : 'text';
        const last = segments[segments.length - 1];
        if (last && last.type === type && type !== 'text') {
            last.lines.push(line);
        } else {
            segments.push({ type, lines: [line] });
        }
    }

    // Collapse adjacent text segments and drop blank separators at start/end
    const trimmed = segments.filter((s, i) =>
        !(s.type === 'text' && s.lines.every(l => l.trim() === '') && (i === 0 || i === segments.length - 1))
    );

    return (
        <div className={className}>
            {trimmed.map((seg, si) => {
                if (seg.type === 'numbered') {
                    return (
                        <ol key={si} className={`list-decimal list-outside ml-4 space-y-0.5 ${si > 0 ? 'mt-1.5' : ''}`}>
                            {seg.lines.map((line, li) => (
                                <li key={li} className="pl-0.5 leading-snug">
                                    {renderInline(line.trim().replace(/^\d+\.\s/, ''))}
                                </li>
                            ))}
                        </ol>
                    );
                }
                if (seg.type === 'bullet') {
                    return (
                        <ul key={si} className={`list-disc list-outside ml-4 space-y-0.5 ${si > 0 ? 'mt-1.5' : ''}`}>
                            {seg.lines.map((line, li) => (
                                <li key={li} className="pl-0.5 leading-snug">
                                    {renderInline(line.trim().replace(/^[•\-\*]\s/, ''))}
                                </li>
                            ))}
                        </ul>
                    );
                }
                // Text paragraph — skip blank separator lines
                const content = seg.lines.join(' ').trim();
                if (!content) return null;
                return (
                    <p key={si} className={si > 0 ? 'mt-1.5' : ''}>
                        {renderInline(content)}
                    </p>
                );
            })}
        </div>
    );
};

export default MarkdownText;
