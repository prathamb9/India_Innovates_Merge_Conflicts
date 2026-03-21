'use client';
import { useState, useRef, useEffect } from 'react';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I am the Signal Sync AI assistant. How can I help you today?", isBot: true }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text = input) => {
        if (!text.trim()) return;
        
        // Add user message
        const newMessages = [...messages, { text, isBot: false }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8080/api/v1/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { text: data.reply, isBot: true }]);
        } catch (err) {
            setMessages(prev => [...prev, { text: "Sorry, I am having trouble connecting to the server.", isBot: true }]);
        } finally {
            setLoading(false);
        }
    };

    const predefinedPrompts = [
        "How to initiate corridor?",
        "What are the required documents?",
        "Check status queries"
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen ? (
                <div className="w-[350px] h-[500px] bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[rgba(0,245,255,0.3)] rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[rgba(0,245,255,0.2)] to-transparent p-4 flex justify-between items-center border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent-cyan flex justify-center items-center text-black font-bold">AI</div>
                            <span className="text-white font-bold tracking-wide">Signal Assistant</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.isBot ? 'bg-[rgba(255,255,255,0.05)] text-text-secondary border border-white/5' : 'bg-accent-cyan text-black font-medium'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-[rgba(255,255,255,0.05)] text-text-secondary border border-white/5 rounded-xl p-3 text-sm flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse delay-75"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Prompts */}
                    {messages.length < 3 && !loading && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2">
                            {predefinedPrompts.map((p, i) => (
                                <button key={i} onClick={() => handleSend(p)} className="text-[0.7rem] bg-[rgba(0,245,255,0.1)] text-accent-cyan border border-accent-cyan/20 rounded-full px-3 py-1 cursor-pointer hover:bg-accent-cyan hover:text-black transition-colors">
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Input */}
                    <div className="p-4 border-t border-white/10 bg-black/40">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 relative">
                            <input 
                                type="text" 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                placeholder="Type a message..." 
                                className="w-full bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan focus:bg-[rgba(0,245,255,0.05)] transition-colors pr-12"
                            />
                            <button type="submit" disabled={!input.trim() || loading} className="absolute right-1 top-1 w-8 h-8 flex justify-center items-center bg-accent-cyan text-black rounded-full disabled:opacity-50 border-none cursor-pointer">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent-blue to-accent-cyan text-black flex justify-center items-center shadow-[0_0_20px_rgba(0,245,255,0.4)] hover:scale-105 hover:shadow-[0_0_30px_rgba(0,245,255,0.6)] transition-all cursor-pointer border-none relative"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-[#f43f5e] border-2 border-black"></span>
                </button>
            )}
        </div>
    );
}
