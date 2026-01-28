import React from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, timestamp }) => {
    const isUser = role === 'user';

    return (
        <div className={cn('flex gap-3 mb-4 animate-in slide-in-from-bottom-2', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-[#17c1e8] to-[#0365a6] flex items-center justify-center vision-cyan-glow">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
            )}

            <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 transition-all duration-300',
                isUser
                    ? 'bg-gradient-to-br from-[#17c1e8] to-[#0365a6] text-white vision-cyan-glow'
                    : 'vision-card border-white/10 text-white'
            )}>
                {isUser ? (
                    <p className="text-sm font-medium leading-relaxed">{content}</p>
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                strong: ({ children }) => <strong className="text-[#17c1e8] font-bold">{children}</strong>,
                                code: ({ children }) => <code className="bg-white/5 px-1.5 py-0.5 rounded text-[#17c1e8] text-xs">{children}</code>,
                                a: ({ href, children }) => (
                                    <a href={href} className="text-[#17c1e8] hover:text-[#17c1e8]/80 underline transition-colors">
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
                {timestamp && (
                    <p className={cn('text-[10px] mt-1.5 opacity-60', isUser ? 'text-right' : 'text-left')}>
                        {new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>

            {isUser && (
                <div className="shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-black text-sm border-2 border-white/10 shadow-lg">
                    U
                </div>
            )}
        </div>
    );
};
