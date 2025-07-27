import React, { useState, useRef, useEffect } from 'react';
import { weatherAPI } from '../services/api';
import { ChatMessage } from '../types';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I am your Weather Insights AI. Ask me anything about anomalies, climate, or your uploaded documents.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const aiResponse = await weatherAPI.chatWithAI(userMessage.content);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not process your request. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="card max-w-2xl mx-auto animate-slide-up mt-8">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        🤖 Weather Insights Chatbot
      </h3>
      <div className="h-80 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] text-sm shadow-sm whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white self-end'
                  : 'bg-white text-gray-800 self-start border border-blue-100'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-3 flex justify-start">
            <div className="rounded-lg px-4 py-2 max-w-[80%] text-sm bg-white text-gray-400 border border-blue-100 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Type your question about anomalies, climate, or your documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot; 