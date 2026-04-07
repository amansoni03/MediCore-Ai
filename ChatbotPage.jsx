import { useState, useRef, useEffect } from 'react';
import { Send, Bot, AlertCircle, ImagePlus, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './Chatbot.css';

async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type } });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const QUICK_REPLIES = [
  "I have a sudden fever and chills",
  "Home remedies for a sore throat",
  "How to relieve muscle pain naturally?",
  "I feel extremely tired and dizzy",
];

export default function ChatbotPage() {
  // Use profile from AuthContext instead of manually querying Supabase
  const { user, profile, role, loading: authLoading } = useAuth();

  const [userData, setUserData]         = useState({ name: '', age: '', height: '', weight: '' });
  const [step, setStep]                 = useState(null);   // null = not initialized yet
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [error, setError]               = useState('');

  const chatLogRef   = useRef(null);
  const fileInputRef = useRef(null);
  const initialized  = useRef(false);

  // ── Initialize once auth is resolved ─────────────────────────
  useEffect(() => {
    // Wait until AuthContext is completely done loading
    if (authLoading) return;
    if (initialized.current) return;
    initialized.current = true;

    if (user && profile) {
      // Because AuthContext does select('*'), all existing columns are inside `profile`
      const ageStr = profile.age ? String(profile.age) : '';
      const heightStr = profile.height_cm ? String(profile.height_cm) : '';
      const weightStr = profile.weight_kg ? String(profile.weight_kg) : '';
      const nameStr = profile.full_name || user.user_metadata?.name || '';

      if (nameStr && ageStr && heightStr && weightStr) {
        // ✅ Full profile — skip all questions
        const ud = { name: nameStr, age: ageStr, height: heightStr, weight: weightStr };
        setUserData(ud);
        setStep(4);
        setMessages([{
          role: 'model',
          text: `Welcome back, **${ud.name}**! 👋\n\nI already have your profile *(${ud.age} yrs · ${ud.height}cm · ${ud.weight}kg)*.\n\n**What are your symptoms today?**`,
        }]);
      } else {
        // Partial profile — prefill and ask missing fields
        beginChat({ name: nameStr, age: ageStr, height: heightStr, weight: weightStr });
      }
    } else {
      // Guest
      beginChat({ name: '', age: '', height: '', weight: '' });
    }
  }, [authLoading, user, profile]);

  // Start onboarding from the first missing field
  const beginChat = (prefill) => {
    setUserData(prefill);
    const fields = ['name', 'age', 'height', 'weight'];
    const firstMissing = fields.findIndex(f => !prefill[f]);

    if (firstMissing === -1) {
      setStep(4);
      setMessages([{ role: 'model', text: `Hi **${prefill.name}**! What are your symptoms today?` }]);
      return;
    }

    const qMap = {
      name:   `Welcome to **MediCore AI**! 🏥\n\nTo give you safe and accurate advice, I need a few quick details.\n\nWhat is your **name**?`,
      age:    `Hi **${prefill.name}**! What is your **age**?`,
      height: `Got it! What is your **height** *(in cm)*?`,
      weight: `Almost done! What is your **weight** *(in kg)*?`,
    };

    setStep(firstMissing);
    setMessages([{ role: 'model', text: qMap[fields[firstMissing]] }]);
  };

  // Auto-scroll
  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [messages, aiLoading]);

  // Save collected field to Supabase
  const saveField = async (field, value) => {
    if (!user) return;
    const colMap = { name: 'full_name', age: 'age', height: 'height_cm', weight: 'weight_kg' };
    await supabase.from('patients').update({ [colMap[field]]: value }).eq('user_id', user.id);
  };

  const handleSend = async (customInput = null) => {
    const text = customInput || input.trim();
    if (!text && !selectedImage) return;

    let imagePreviewUrl = null;
    let imageFile = null;
    if (selectedImage) {
      imagePreviewUrl = URL.createObjectURL(selectedImage);
      imageFile = selectedImage;
    }

    setMessages(prev => [...prev, {
      role: 'user',
      text: text || '📎 Medical report attached.',
      imagePreview: imagePreviewUrl,
    }]);
    setInput('');
    setSelectedImage(null);
    setError('');

    // Image during onboarding → skip straight to AI
    if (imageFile && step < 4) {
      await runAI(text || 'Analyze this medical report.', imageFile, userData);
      setStep(5);
      return;
    }

    // Onboarding steps 0-3
    if (step !== null && step < 4) {
      const fields = ['name', 'age', 'height', 'weight'];
      const field  = fields[step];
      const updated = { ...userData, [field]: text };
      setUserData(updated);
      await saveField(field, text);

      const next = step + 1;
      setTimeout(() => {
        if (next < 4) {
          const nextField = fields[next];
          const nextQ = {
            age:    `Nice to meet you, **${updated.name}**! What is your **age**?`,
            height: `Got it! What is your **height** *(in cm)*?`,
            weight: `Thanks! What is your **weight** *(in kg)*?`,
          };
          setMessages(prev => [...prev, { role: 'model', text: nextQ[nextField] }]);
          setStep(next);
        } else {
          setMessages(prev => [...prev, { role: 'model', text: `All set! 🎉 **What are your symptoms?**` }]);
          setStep(4);
        }
      }, 400);
      return;
    }

    // Step 4+ — AI diagnosis
    await runAI(text, imageFile, userData);
  };

  const runAI = async (symptoms, imageFile, profile) => {
    setAiLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') throw new Error('Add your Gemini API Key to the .env file!');

      const ai = new GoogleGenAI({ apiKey });

      const prompt = imageFile
        ? `You are a medical AI. The user uploaded a medical document. Analyze it in plain language a non-medical person understands. Use bullet points and Markdown.\n\nUser: ${symptoms}`
        : `You are a concise medical AI assistant.
PATIENT PROFILE:
- Name: ${profile.name || 'Unknown'}
- Age: ${profile.age || 'Unknown'} years
- Height: ${profile.height || 'Unknown'} cm
- Weight: ${profile.weight || 'Unknown'} kg

Evaluate symptoms against their profile. Give short crisp guidance + safe home remedies using bullet points and Markdown. Keep remedies age/weight appropriate.

Symptoms: ${symptoms}`;

      const parts = [];
      if (imageFile) parts.push(await fileToGenerativePart(imageFile));
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: parts });
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      setStep(5);
    } catch (err) {
      setError(err.message || 'Failed to get response.');
    } finally {
      setAiLoading(false);
    }
  };

  const placeholder =
    step === 0 ? 'Enter your name...' :
    step === 1 ? 'Enter your age...' :
    step === 2 ? 'Enter your height in cm...' :
    step === 3 ? 'Enter your weight in kg...' :
    'Describe your symptoms or attach a report...';

  // Show spinner ONLY while auth session is being restored
  const showSpinner = authLoading || step === null;

  if (showSpinner) {
    return (
      <div className="animate-fade-in chatbot-container" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#4a5d80' }}>
          <div style={{ width:34, height:34, borderRadius:'50%', border:'3px solid rgba(139,92,246,0.15)', borderTopColor:'#8b5cf6', animation:'cspin 0.8s linear infinite', margin:'0 auto 1rem' }} />
          <p style={{ fontSize:'0.875rem' }}>Preparing your session…</p>
          <style>{`@keyframes cspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in chatbot-container">
      <div className="glass-panel chat-window">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-icon"><Bot size={20} /></div>
          <div><h2>Medical AI Diagnosis</h2></div>
          {step >= 4 && userData.name && (
            <div className="chat-header-badge">
              <span className="header-pip" />
              {userData.name}{userData.age ? ` · ${userData.age}y` : ''}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="chat-log" ref={chatLogRef}>
          {error && <div className="error-banner"><AlertCircle size={15} /> {error}</div>}
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble-wrapper ${msg.role === 'user' ? 'user-align' : 'model-align'}`}>
              <div className={`chat-bubble ${msg.role}`}>
                {msg.imagePreview && <img src={msg.imagePreview} alt="Uploaded" className="uploaded-image-preview" />}
                {msg.role === 'model'
                  ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.text)) }} />
                  : <p>{msg.text}</p>}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="chat-bubble-wrapper model-align">
              <div className="chat-bubble model typing-indicator"><span /><span /><span /></div>
            </div>
          )}
        </div>

        {/* Quick replies at symptom step */}
        {step === 4 && (
          <div className="quick-replies-container">
            {QUICK_REPLIES.map((opt, i) => (
              <button key={i} className="chip-btn" onClick={() => handleSend(opt)}>{opt}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          {selectedImage && (
            <div className="image-attachment-preview">
              <span style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.82rem', color:'#8898b8', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                <ImagePlus size={15} /> {selectedImage.name}
              </span>
              <button style={{ background:'transparent', border:'none', color:'#fb7185', cursor:'pointer', display:'flex' }}
                onClick={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                <X size={17} />
              </button>
            </div>
          )}
          <div className="input-row">
            <input type="file" accept="image/*,application/pdf" ref={fileInputRef} style={{ display:'none' }}
              onChange={e => { if (e.target.files[0]) setSelectedImage(e.target.files[0]); }} />
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()} disabled={aiLoading} title="Attach report">
              <ImagePlus size={19} />
            </button>
            <input
              type={step >= 1 && step <= 3 ? 'number' : 'text'}
              className="chat-text-input"
              placeholder={placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={aiLoading}
            />
            <button className="btn btn-primary send-btn" onClick={() => handleSend()}
              disabled={aiLoading || (!input.trim() && !selectedImage)}>
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
