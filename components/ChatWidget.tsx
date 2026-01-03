import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Mic, Minimize2, AlertCircle, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessageToN8N } from '../services/n8nService';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Olá! Seus dados financeiros chegam automaticamente pelo WhatsApp. Eu estou aqui para gerar insights e tirar dúvidas sobre seus números. O que deseja saber hoje?',
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText;
    const tempId = Date.now().toString();

    // 1. Add User Message
    const newUserMsg: ChatMessage = {
      id: tempId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);
    setError(null);

    try {
      // 2. Call N8N Service (Querying the intelligence)
      const responseText = await sendMessageToN8N(textToSend);

      // 3. Add Assistant Response
      const newAssistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newAssistantMsg]);
    } catch (err) {
      setError('Erro ao consultar inteligência do N8N.');
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Não consegui acessar seus dados no momento. Por favor, tente novamente em instantes.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-lucrai-500 hover:bg-lucrai-600 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105 z-50 flex items-center justify-center group"
        title="Consultar Inteligência Lucraí"
      >
        <Sparkles size={28} className="group-hover:animate-spin-slow" />
        <span className="absolute right-full mr-3 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Insights IA
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300" style={{ height: '600px', maxHeight: '80vh' }}>
      {/* Header */}
      <div className="bg-lucrai-500 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Inteligência Lucraí</h3>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-white/70 animate-pulse'}`}></span>
              {error ? 'Desconectado' : 'Conectado aos seus dados'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Minimize2 size={18} />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <div className="text-center text-xs text-gray-400 my-2">Hoje</div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-lucrai-500 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
             </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center mt-2">
            <div className="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <AlertCircle size={12} />
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pergunte sobre sua margem, gastos..."
            disabled={isTyping}
            className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lucrai-200 focus:bg-white transition-all disabled:opacity-60"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="bg-lucrai-500 hover:bg-lucrai-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-gray-400">Dados processados via N8N • Entrada via WhatsApp</p>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;