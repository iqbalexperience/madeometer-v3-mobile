
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2, Sparkles, MapPin, ExternalLink } from 'lucide-react';
import { ScanResult } from '../types';
import { createChatSession, sendChatMessage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

interface ScanChatProps {
    result: ScanResult | ScanResult[];
    onClose: () => void;
    onUpdate?: (updated: ScanResult) => void;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    grounding?: any[];
}

const ScanChat: React.FC<ScanChatProps> = ({ result, onClose, onUpdate }) => {
    const isArray = Array.isArray(result);
    const firstItem = isArray ? result[0] : result;
    const itemName = isArray ? "these items" : firstItem.itemName;
    const { t } = useLanguage();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'model',
            text: `I've analyzed **${itemName}**. \n\nI can help you check ownership, find better prices nearby, or suggest ethical alternatives.`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Default to Denmark coordinates (Copenhagen)
    const [location, setLocation] = useState<{ lat: number, lng: number } | undefined>({ lat: 55.6761, lng: 12.5683 });
    const [chatSession, setChatSession] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Location access denied or failed, using default (Denmark)", error);
                }
            );
        }
    }, []);

    useEffect(() => {
        const initChat = async () => {
            const session = await createChatSession(result, 'gemini-3-flash-preview', location);
            setChatSession(session);
        };
        initChat();
    }, [result, location]);


    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !chatSession) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Prepare history for the server action
            const history = messages.map(m => ({
                role: m.role,
                content: m.text
            }));

            const response = await sendChatMessage(
                userMsg.text,
                history,
                chatSession.context,
                location
            );

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: response.text,
                grounding: response.grounding
            }]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "Sorry, I encountered an error connecting to the AI. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };


    const suggestions = [
        "Where can I buy this nearby?",
        "Are there any Danish alternatives?",
        "Double check the owner",
        "Is the packaging sustainable?"
    ];

    return (
        <div className="absolute top-0 left-0 right-0 bottom-[84px] z-50 bg-gray-50 flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">

            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">{t('ai_assistant')}</h3>
                        <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">
                            {location ? `${t('location_active')} 📍` : `${t('chatting_about')} ${itemName}`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                    <div key={msg.id} className="space-y-2">
                        <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user'
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-indigo-100 text-indigo-600'
                                }`}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-gray-900 text-white rounded-tr-none'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                }`}>
                                <ReactMarkdown
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic my-2 text-gray-500" {...props} />,
                                        a: ({ node, ...props }) => (
                                            <a
                                                className={`underline decoration-1 underline-offset-2 font-medium ${msg.role === 'user' ? 'text-indigo-200 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'
                                                    }`}
                                                target="_blank"
                                                rel="noreferrer"
                                                {...props}
                                            />
                                        ),
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {msg.grounding && msg.grounding.length > 0 && (
                            <div className="pl-11 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                                {msg.grounding.map((chunk: any, i: number) => {
                                    if (chunk.web) {
                                        return (
                                            <a
                                                key={i}
                                                href={chunk.web.uri}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {chunk.web.title}
                                            </a>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                {messages.length < 3 && !isLoading && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => { setInputValue(s); }}
                                className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={t('ask_question')}
                        className="flex-1 pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-900 placeholder:text-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ScanChat;
