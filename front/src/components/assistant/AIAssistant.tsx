import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { assistantService, type ChatMessage as ChatMessageType } from '@/services/assistantService';
import { Button } from '@/components/ui/button';
import { X, Send, Sparkles, Minimize2, Maximize2, Loader2 } from 'lucide-react';

export const AIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isAvailable, setIsAvailable] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Check AI service status
        checkStatus();

        // Load suggestions
        loadSuggestions();

        // Add welcome message
        setMessages([{
            role: 'assistant',
            content: "Bonjour ! Je suis votre assistant IA pour FIARAmotion. Comment puis-je vous aider aujourd'hui ?",
            timestamp: new Date().toISOString()
        }]);

        // Keyboard shortcut: Ctrl+K to open
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    const checkStatus = async () => {
        const status = await assistantService.getStatus();
        setIsAvailable(status.available);

        if (!status.available) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ ${status.message}\n\nL'assistant IA n'est pas disponible pour le moment. Veuillez contacter l'administrateur.`,
                timestamp: new Date().toISOString()
            }]);
        }
    };

    const loadSuggestions = async () => {
        const suggestions = await assistantService.getSuggestions();
        setSuggestions(suggestions);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (messageText?: string) => {
        const text = messageText || inputMessage.trim();
        if (!text || isLoading || !isAvailable) return;

        const userMessage: ChatMessageType = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await assistantService.sendMessage(text, messages);

            const assistantMessage: ChatMessageType = {
                role: 'assistant',
                content: response.response,
                timestamp: response.timestamp
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            const errorMessage: ChatMessageType = {
                role: 'assistant',
                content: `❌ Désolé, une erreur s'est produite: ${error.message || 'Erreur inconnue'}`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        handleSendMessage(suggestion);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-2xl bg-gradient-to-br from-[#17c1e8] to-[#0365a6] flex items-center justify-center text-white shadow-2xl vision-cyan-glow hover:scale-110 transition-all duration-300 z-50 group"
                aria-label="Ouvrir l'assistant IA"
            >
                <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#060b28] animate-pulse" />
            </button>
        );
    }

    return (
        <div
            className={cn(
                'fixed bottom-6 right-6 z-50 transition-all duration-300',
                isMinimized ? 'w-80' : 'w-96'
            )}
        >
            <div className="vision-card border-white/10 shadow-2xl overflow-hidden flex flex-col" style={{ height: isMinimized ? '60px' : '600px' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#17c1e8]/10 to-[#0365a6]/10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#17c1e8] to-[#0365a6] flex items-center justify-center vision-cyan-glow">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Assistant IA</h3>
                            <p className="text-[10px] text-white/50">FIARAmotion</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-lg"
                            onClick={() => setIsMinimized(!isMinimized)}
                        >
                            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
                            {messages.map((message, index) => (
                                <ChatMessage
                                    key={index}
                                    role={message.role}
                                    content={message.content}
                                    timestamp={message.timestamp}
                                />
                            ))}

                            {isLoading && (
                                <div className="flex gap-3 mb-4">
                                    <div className="shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-[#17c1e8] to-[#0365a6] flex items-center justify-center vision-cyan-glow">
                                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                                    </div>
                                    <div className="vision-card border-white/10 px-4 py-3 rounded-2xl">
                                        <div className="flex gap-1">
                                            <span className="h-2 w-2 rounded-full bg-[#17c1e8] animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-[#17c1e8] animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-[#17c1e8] animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestions */}
                        {messages.length <= 1 && suggestions.length > 0 && (
                            <div className="px-4 pb-3 space-y-2">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Suggestions</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.slice(0, 3).map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-[#17c1e8]/30 transition-all duration-200"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={isAvailable ? "Posez votre question..." : "Service indisponible"}
                                    disabled={isLoading || !isAvailable}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#17c1e8]/50 focus:border-[#17c1e8]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <Button
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputMessage.trim() || isLoading || !isAvailable}
                                    className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#17c1e8] to-[#0365a6] hover:scale-105 transition-all vision-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-[9px] text-white/30 mt-2 text-center">
                                Appuyez sur <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/50">Ctrl+K</kbd> pour ouvrir/fermer
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
