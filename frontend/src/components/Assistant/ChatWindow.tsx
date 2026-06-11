import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api.client.js';

interface Message {
  role: 'user' | 'model';
  text: string;
  actionSuggestion?: {
    category: string;
    value: number;
    unit: string;
  };
}

interface ChatWindowProps {
  onLogCompleted: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLogCompleted }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm Eco-Coach, your carbon footprint advisor. Tell me about your day (e.g., 'I drove 15 miles to work' or 'I cooked a vegan dinner') and I'll help you log the emissions!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState(''); // for aria-live announcements

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // API call to Assistant chat route
      // Format history (exclude system instructions which backend inserts)
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await api.sendChatMessage(history, userMessage);

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text, 
        actionSuggestion: response.actionSuggestion 
      }]);
      setAnnouncement(`Eco-Coach replied: ${response.text}`);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I had trouble parsing that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogAction = async (msgIndex: number, suggestion: any) => {
    try {
      await api.logEmissions(suggestion.category, suggestion.value, suggestion.unit);
      
      // Update UI to remove the chip once logged successfully
      setMessages(prev => {
        const copy = [...prev];
        if (copy[msgIndex]) {
          copy[msgIndex] = { ...copy[msgIndex], actionSuggestion: undefined };
        }
        return copy;
      });

      onLogCompleted();
      setAnnouncement(`Successfully logged ${suggestion.value} ${suggestion.unit} of ${suggestion.category} to your dashboard.`);
      alert(`Success! Logged to dashboard.`);
    } catch (err) {
      alert('Failed to log carbon event.');
    }
  };

  return (
    <div className="glass-card chat-window">
      <h2>Eco-Coach Assistant</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
        Gemini-Powered Environmental Chat Agent
      </p>

      {/* Accessible Dynamic screen reader announcers */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <div className="chat-history">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-coach'}`}
          >
            <div>{msg.text}</div>
            
            {msg.actionSuggestion && (
              <button
                className="action-chip"
                onClick={() => handleLogAction(index, msg.actionSuggestion)}
                aria-label={`Log activity: ${msg.actionSuggestion.value} ${msg.actionSuggestion.unit} of ${msg.actionSuggestion.category}`}
              >
                🌱 Tap to log {msg.actionSuggestion.value} {msg.actionSuggestion.unit} {msg.actionSuggestion.category}
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble bubble-coach" style={{ opacity: 0.5 }}>
            Eco-Coach is thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend}>
        <div className="chat-input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            aria-label="Message to Eco-Coach"
            placeholder="e.g. I drove 25 miles to work today."
            className="form-input"
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
