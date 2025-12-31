import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Brain, 
  LayoutDashboard, 
  Building2, 
  Moon, 
  Clock, 
  PenTool, 
  Send,
  Calendar,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Zap,
  User,
  LogOut,
  ArrowRight,
  Heart,
  Smile,
  Download
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Chat, GenerateContentResponse } from "@google/genai";
import { DailyMetric, AppView, AnalysisResult, ChatMessage, UserProfile } from './types';
import RiskMeter from './components/RiskMeter';
import { analyzeBurnoutRisk, createSentinelChat } from './services/geminiService';

// --- Helper: Generate Initial Data ---
const generateInitialHistory = (): DailyMetric[] => {
  const data: DailyMetric[] = [];
  const today = new Date();
  const moods = ['Okay', 'Good', 'Tired', 'Stressed', 'Good'];
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    
    // Simulate a slow burnout creep
    const baseStress = i < 10 ? 70 : 40; 
    const randomVar = Math.random() * 20 - 10;
    
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      workHours: 8 + (Math.random() * 3),
      sleepHours: 7 - (Math.random() * 2),
      meetingDensity: Math.floor(Math.random() * 8),
      sentimentScore: 0.2,
      burnoutRiskScore: Math.min(100, Math.max(0, baseStress + randomVar)),
      userMood: moods[Math.floor(Math.random() * moods.length)]
    });
  }
  return data;
};

// --- Helper: Local Storage Keys (Updated for new App Name) ---
const STORAGE_KEYS = {
  PROFILE: 'quietcare_user_profile',
  HISTORY: 'quietcare_history',
  LAST_ANALYSIS: 'quietcare_last_analysis'
};

const MOODS = [
  { emoji: '😊', label: 'Good' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😫', label: 'Tired' },
  { emoji: '😣', label: 'Stressed' }
];

const App: React.FC = () => {
  // Application State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<DailyMetric[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true); // Default to true until loaded

  // Input State
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [todaysMetrics, setTodaysMetrics] = useState({
    workHours: 9.0,
    sleepHours: 6.5,
    meetingDensity: 5
  });

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);

  // --- 1. Initialization & Persistence ---
  useEffect(() => {
    const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const storedAnalysis = localStorage.getItem(STORAGE_KEYS.LAST_ANALYSIS);

    if (storedProfile) {
      setUserProfile(JSON.parse(storedProfile));
      setShowOnboarding(false);
    } else {
      setShowOnboarding(true);
    }

    let currentHistory: DailyMetric[] = [];
    if (storedHistory) {
      currentHistory = JSON.parse(storedHistory);
      setHistory(currentHistory);
    } else {
      currentHistory = generateInitialHistory();
      setHistory(currentHistory);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(currentHistory));
    }

    let currentAnalysis: AnalysisResult | null = null;
    if (storedAnalysis) {
      currentAnalysis = JSON.parse(storedAnalysis);
      setLastAnalysis(currentAnalysis);
    } else if (currentHistory.length > 0) {
      // Fallback if no specific analysis stored but history exists
      const lastRisk = currentHistory[currentHistory.length - 1].burnoutRiskScore;
      currentAnalysis = {
        riskScore: lastRisk,
        riskLevel: lastRisk > 70 ? 'Stressed' : 'Balanced',
        emotionalDebt: 65,
        keyDrivers: ['Simulated History'],
        recommendation: 'Complete your first daily log to get a personalized recommendation.',
        summary: 'Welcome! I am ready to help you track your balance.'
      };
      setLastAnalysis(currentAnalysis);
    }

    // Initialize Chat with whatever data we have
    if (storedProfile && currentAnalysis) {
       const profile = JSON.parse(storedProfile);
       chatSessionRef.current = createSentinelChat(currentAnalysis, profile.name);
       setChatMessages([{
         id: 'init',
         role: 'model',
         text: `Welcome back, ${profile.name}. I'm here to listen. How was your day?`,
         timestamp: new Date()
       }]);
    }

  }, []);

  // --- 2. Handlers ---

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newProfile: UserProfile = {
      name: formData.get('name') as string || 'Friend',
      role: formData.get('role') as string || 'General',
      department: formData.get('department') as string || 'General',
    };
    
    setUserProfile(newProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    setShowOnboarding(false);

    // Re-init chat with new name
    if (lastAnalysis) {
      chatSessionRef.current = createSentinelChat(lastAnalysis, newProfile.name);
      setChatMessages([{
        id: 'init',
        role: 'model',
        text: `Hi ${newProfile.name}. I am Quiet Care. I'm here to help you stay balanced. How are you feeling right now?`,
        timestamp: new Date()
      }]);
    }
  };

  const handleResetApp = () => {
    if(confirm("Start fresh? This will wipe your history and settings.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    if (!history.length) return;
    
    const headers = ["Date", "Work Hours", "Sleep Hours", "Busy-ness Level", "Mood", "Stress Score"];
    const csvContent = [
        headers.join(','),
        ...history.map(row => [
            `"${row.date}"`,
            row.workHours.toFixed(1),
            row.sleepHours.toFixed(1),
            row.meetingDensity,
            `"${row.userMood || ''}"`,
            row.burnoutRiskScore.toFixed(0)
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `quiet_care_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleAnalysis = useCallback(async () => {
    if (!journalText.trim()) return;
    
    setIsAnalyzing(true);
    
    const result = await analyzeBurnoutRisk(
      journalText,
      todaysMetrics,
      selectedMood || 'Unknown',
      history
    );

    setLastAnalysis(result);
    localStorage.setItem(STORAGE_KEYS.LAST_ANALYSIS, JSON.stringify(result));
    
    // Update Chat Context
    const userName = userProfile?.name || "Friend";
    chatSessionRef.current = createSentinelChat(result, userName);
    const newContextMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: `Okay, I've updated my view. It looks like you are feeling ${result.riskLevel}. ${result.recommendation} Does that sound right, ${userName}?`,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newContextMsg]);
    
    // Update History (Append Today)
    const newHistory = [...history];
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Check if entry for today already exists, if so overwrite, else push
    const todayIndex = newHistory.findIndex(h => h.date === todayStr);
    const newEntry: DailyMetric = {
        date: todayStr,
        workHours: todaysMetrics.workHours,
        sleepHours: todaysMetrics.sleepHours,
        meetingDensity: todaysMetrics.meetingDensity,
        sentimentScore: 0, 
        burnoutRiskScore: result.riskScore,
        userMood: selectedMood
    };

    if (todayIndex >= 0) {
        newHistory[todayIndex] = newEntry;
    } else {
        newHistory.push(newEntry);
    }
    
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));

    setIsAnalyzing(false);
    setCurrentView(AppView.DASHBOARD);
  }, [journalText, todaysMetrics, history, userProfile, selectedMood]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const responseText = (response as GenerateContentResponse).text; 
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I'm thinking...",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having a little trouble connecting. Try again in a moment.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const simulateData = (type: 'high' | 'low') => {
    if (type === 'high') {
      setTodaysMetrics({ workHours: 12.5, sleepHours: 4.5, meetingDensity: 9 });
      setJournalText("The kids were sick all night, and I had to stay up late to finish that project for work. I'm exhausted and I feel like I'm snapping at everyone.");
      setSelectedMood('Stressed');
    } else {
      setTodaysMetrics({ workHours: 8, sleepHours: 7.5, meetingDensity: 3 });
      setJournalText("Actually had a decent day. Got my work done early and managed to take a walk in the evening. Feeling pretty good.");
      setSelectedMood('Good');
    }
  };

  // --- 3. Views ---

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 animate-fade-in border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Heart size={36} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Welcome to Quiet Care</h1>
          <p className="text-center text-slate-500 mb-8">
            A private place to check in on yourself and catch stress before it builds up.
          </p>
          
          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">What should we call you?</label>
              <input name="name" type="text" required placeholder="e.g. Alex" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">What do you do? (Optional)</label>
              <input name="role" type="text" placeholder="e.g. Teacher, Nurse, Developer" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Team / Department (If applicable)</label>
              <select name="department" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="Tech Team">Tech Team</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR / Admin">HR / Admin</option>
                <option value="Other">Other / Personal Use</option>
              </select>
            </div>
            
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-6">
              Let's Start <ArrowRight size={18} />
            </button>
            <p className="text-xs text-center text-slate-400 mt-4">
              Your entries stay on this device.
            </p>
          </form>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="space-y-6">
        {lastAnalysis && (
          <RiskMeter score={Math.round(lastAnalysis.riskScore)} level={lastAnalysis.riskLevel} />
        )}
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-full -mr-10 -mt-10"></div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 relative z-10">
            <Sparkles size={18} className="text-purple-500" />
            Quiet Care Insight
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4 relative z-10">
            {lastAnalysis?.summary || "No recent check-in."}
          </p>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 relative z-10">
            <h4 className="text-indigo-900 text-xs font-bold uppercase mb-1">Helpful Tip</h4>
            <p className="text-indigo-700 text-sm">
              {lastAnalysis?.recommendation || "Log your day to get a suggestion."}
            </p>
          </div>
          <button 
            onClick={() => setCurrentView(AppView.CHAT)}
            className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 relative z-10"
          >
            <MessageSquare size={16} /> Chat with Coach
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="font-semibold text-slate-800 mb-3">What's draining you?</h3>
           <ul className="space-y-3">
             {lastAnalysis?.keyDrivers.map((driver, i) => (
               <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                 <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                 {driver}
               </li>
             ))}
           </ul>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[320px]">
          <h3 className="font-semibold text-slate-800 mb-6 flex justify-between">
            <span>Hidden Stress Accumulation</span>
            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">Last 30 Days</span>
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                labelStyle={{ color: '#64748b' }}
              />
              <Area 
                type="monotone" 
                dataKey="burnoutRiskScore" 
                stroke="#f43f5e" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRisk)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-64">
             <h3 className="font-semibold text-slate-800 mb-4 text-sm">Hours Worked</h3>
             <ResponsiveContainer width="100%" height="80%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0, 14]} hide />
                  <Tooltip />
                  <Line type="step" dataKey="workHours" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
             </ResponsiveContainer>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-64">
             <h3 className="font-semibold text-slate-800 mb-4 text-sm">Sleep Quality</h3>
             <ResponsiveContainer width="100%" height="80%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0, 12]} hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="sleepHours" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );

  const renderJournal = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Daily Log</h2>
        <p className="text-slate-500">We analyze patterns, not just words. It's private.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8 relative">
        <div className="absolute top-4 right-4 flex gap-2">
           <button onClick={() => simulateData('low')} className="p-2 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1" title="Test: Balanced Day">
             <Zap size={14} /> Relaxed
           </button>
           <button onClick={() => simulateData('high')} className="p-2 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 text-xs font-semibold flex items-center gap-1" title="Test: High Stress Day">
             <Zap size={14} /> Stressed
           </button>
        </div>

        {/* Mood Selector */}
        <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Smile size={14} /> How are you feeling?
            </label>
            <div className="flex justify-between gap-2 p-2 bg-slate-50 rounded-xl">
                {MOODS.map((m) => (
                    <button
                        key={m.label}
                        onClick={() => setSelectedMood(m.label)}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                            selectedMood === m.label 
                            ? 'bg-white shadow-md ring-2 ring-indigo-500 transform scale-105' 
                            : 'hover:bg-slate-200 opacity-70 hover:opacity-100'
                        }`}
                    >
                        <span className="text-2xl">{m.emoji}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-2">
           <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Clock size={14} /> Work/Busy Hours
              </label>
              <input 
                type="number" 
                value={todaysMetrics.workHours}
                onChange={(e) => setTodaysMetrics({...todaysMetrics, workHours: Number(e.target.value)})}
                className="w-full p-3 bg-slate-50 rounded-xl text-xl font-bold text-slate-700 border-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Moon size={14} /> Sleep Hours
              </label>
              <input 
                type="number" 
                value={todaysMetrics.sleepHours}
                onChange={(e) => setTodaysMetrics({...todaysMetrics, sleepHours: Number(e.target.value)})}
                className="w-full p-3 bg-slate-50 rounded-xl text-xl font-bold text-slate-700 border-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Activity size={14} /> Busy-ness (1-10)
              </label>
              <input 
                type="number" 
                min="0" max="10"
                value={todaysMetrics.meetingDensity}
                onChange={(e) => setTodaysMetrics({...todaysMetrics, meetingDensity: Number(e.target.value)})}
                className="w-full p-3 bg-slate-50 rounded-xl text-xl font-bold text-slate-700 border-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <PenTool size={14} /> Your Notes
          </label>
          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="How are you feeling? (e.g. 'Tired because the baby didn't sleep', or 'Stressed about bills')"
            className="w-full h-40 p-4 bg-slate-50 rounded-xl text-slate-700 border-none resize-none focus:ring-2 focus:ring-indigo-500 text-base leading-relaxed"
          ></textarea>
        </div>

        <button
          onClick={handleAnalysis}
          disabled={isAnalyzing || !journalText}
          className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
            isAnalyzing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Checking Patterns...
            </>
          ) : (
            <>
              Check My Balance <Send size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="max-w-3xl mx-auto h-[600px] bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col animate-fade-in overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <Heart size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">Quiet Care Coach</h3>
                <p className="text-xs text-slate-500">
                  {userProfile ? `Here for ${userProfile.name}` : 'Here for you'}
                </p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isChatLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 p-3 bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-slate-700"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-10">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Heart size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">Quiet Care</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg overflow-x-auto">
              <button 
                onClick={() => setCurrentView(AppView.DASHBOARD)}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${currentView === AppView.DASHBOARD ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Dashboard
              </button>
              <button 
                 onClick={() => setCurrentView(AppView.JOURNAL)}
                 className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${currentView === AppView.JOURNAL ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Log
              </button>
              <button 
                onClick={() => setCurrentView(AppView.CHAT)}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${currentView === AppView.CHAT ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Coach
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleExportData} title="Export History (CSV)" className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 transition-colors">
                <Download size={18} />
              </button>
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-900">{userProfile?.name || 'Friend'}</p>
                <p className="text-xs text-slate-500">{userProfile?.role || 'Guest'}</p>
              </div>
              <button onClick={handleResetApp} title="Reset App" className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-200 transition-colors">
                {userProfile ? userProfile.name.charAt(0).toUpperCase() : <User size={18} />}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Nav */}
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 flex justify-between overflow-x-auto gap-2">
            <button onClick={() => setCurrentView(AppView.DASHBOARD)} className={`px-3 py-1 rounded-full text-xs font-medium ${currentView === AppView.DASHBOARD ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Home</button>
            <button onClick={() => setCurrentView(AppView.JOURNAL)} className={`px-3 py-1 rounded-full text-xs font-medium ${currentView === AppView.JOURNAL ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Log</button>
            <button onClick={() => setCurrentView(AppView.CHAT)} className={`px-3 py-1 rounded-full text-xs font-medium ${currentView === AppView.CHAT ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Coach</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {currentView === AppView.DASHBOARD && `Hello, ${userProfile?.name}`}
            {currentView === AppView.JOURNAL && "Daily Check-in"}
            {currentView === AppView.CHAT && "Quiet Care Coach"}
          </h1>
          <p className="text-slate-500 mt-1">
             {currentView === AppView.DASHBOARD && "Here is your wellness balance today."}
             {currentView === AppView.JOURNAL && "Safe, private, and simple."}
             {currentView === AppView.CHAT && "Talk about what's on your mind."}
          </p>
        </div>

        {currentView === AppView.DASHBOARD && renderDashboard()}
        {currentView === AppView.JOURNAL && renderJournal()}
        {currentView === AppView.CHAT && renderChat()}
        
      </main>

      {currentView === AppView.DASHBOARD && (
          <div className="max-w-7xl mx-auto px-6 mt-8">
             <div className="bg-slate-900 rounded-2xl p-6 text-slate-400 text-sm flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <Activity className="text-indigo-400" />
                    <span>Quiet Care isn't a doctor. If you feel really overwhelmed, please talk to a professional.</span>
                </div>
                <button className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                    Find Help Nearby
                </button>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;