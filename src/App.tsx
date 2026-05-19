/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "./components/FirebaseProvider";
import { 
  Shield, 
  Briefcase, 
  Scale as BookScale, 
  BookOpen, 
  ChevronRight, 
  CheckCircle2, 
  HelpCircle, 
  ArrowLeft,
  Loader2,
  Trophy,
  RefreshCcw,
  Sparkles,
  LogOut,
  User as UserIcon,
  Check
} from "lucide-react";
import { subjects } from "./data/curriculum";
import { cn } from "./lib/utils";
import ReactMarkdown from "react-markdown";

type ViewState = "subject-selection" | "topic-list" | "explanation" | "questions" | "mock-exam" | "discursive" | "dashboard" | "flashcards";

interface Question {
  text: string;
  options: { [key: string]: string };
  answer: string;
  justification: string;
  topic?: string;
  subject?: string;
}

interface DiscursiveQuestion {
  text: string;
  expected_answer: string;
}

export default function App() {
  const { 
    user, 
    login, 
    logout, 
    getProgress, 
    saveProgress, 
    toggleProgress, 
    saveContentCache,
    getContentCache,
    saveLastSession, 
    saveNote, 
    loading: authLoading 
  } = useFirebase();
  const [view, setView] = useState<ViewState>("dashboard");
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [discursiveQuestions, setDiscursiveQuestions] = useState<DiscursiveQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<{front: string; back: string}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [showExpectedAnswer, setShowExpectedAnswer] = useState(false);
  const [discursiveMock, setDiscursiveMock] = useState<DiscursiveQuestion | null>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [lastSessionData, setLastSessionData] = useState<any>(null);
  const [topicNote, setTopicNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const loadUserData = async () => {
    try {
      const data = await getProgress();
      if (data) {
        setUserProgress(data);
        if (data.lastSession) {
          setLastSessionData(data.lastSession);
        }
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    }
  };

  // Load progress on user state change
  useEffect(() => {
    if (user) {
      loadUserData();
    } else if (!authLoading) {
      // Clear progress if no user
      setUserProgress(null);
      setLastSessionData(null);
    }
  }, [user, authLoading]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const resumeLastSession = () => {
    if (lastSessionData) {
      const lastView = lastSessionData.view as ViewState;
      const sub = subjects.find(s => s.id === lastSessionData.subjectId);
      if (sub) {
        setSelectedSubject(sub);
        if (lastSessionData.topicName) {
          setSelectedTopic(lastSessionData.topicName);
          if (lastView === "explanation") {
            fetchExplanation(lastSessionData.topicName, undefined, sub.name, sub.id);
          } else if (lastView === "questions") {
            fetchQuestions(lastSessionData.topicName, undefined, sub.name, sub.id);
          } else if (lastView === "discursive") {
            fetchDiscursive(lastSessionData.topicName, undefined, sub.name, sub.id);
          } else if (lastView === "flashcards") {
            startFlashcards(lastSessionData.topicName, undefined, sub.name, sub.id);
          }
        }
        setView(lastView);
      } else {
        // Fallback to dashboard if subject not found
        setView("dashboard");
      }
    }
  };

  const syncSession = (v: ViewState, subId?: string, topic?: string) => {
    saveLastSession(v, subId || selectedSubject?.id, topic || selectedTopic);
  };

  const handleSelectSubject = (subject: any) => {
    setSelectedSubject(subject);
    setView("topic-list");
    syncSession("topic-list", subject.id);
  };

  const fetchExplanation = async (topic: string, description?: string, subjectName?: string, subjectId?: string) => {
    setLoading(true);
    setView("explanation");
    setSelectedTopic(topic);
    setExplanation(""); 
    setQuotaExceeded(false);
    const sName = subjectName || selectedSubject?.name;
    const sId = subjectId || selectedSubject?.id;
    syncSession("explanation", undefined, topic);
    
    try {
      if (sId) {
        const cached = await getContentCache(sId, topic, "explanation");
        if (cached) {
          setExplanation(cached);
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          subject: sName, 
          topic, 
          description, 
          type: "explanation" 
        })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Erro de comunicação com o servidor. Tente novamente.");
      }

      if (!res.ok) {
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(data.error || "Falha na resposta do servidor");
      }
      setExplanation(data.content || "");
      if (sId && data.content) {
        saveContentCache(sId, topic, "explanation", data.content);
      }
    } catch (e: any) {
      console.error("Fetch Explanation Error:", e);
      setExplanation("");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (subjectId: string, topicName: string) => {
    if (!user) return;
    const isCurrentlyCompleted = userProgress?.completedTopics?.[subjectId]?.includes(topicName);
    const newState = !isCurrentlyCompleted;
    
    // Optimistic local update
    setUserProgress((prev: any) => {
      const currentCompleted = prev?.completedTopics?.[subjectId] || [];
      const updatedTopics = newState 
        ? Array.from(new Set([...currentCompleted, topicName]))
        : currentCompleted.filter((t: string) => t !== topicName);
      
      return {
        ...prev,
        completedTopics: {
          ...(prev?.completedTopics || {}),
          [subjectId]: updatedTopics
        }
      };
    });

    try {
      await toggleProgress(subjectId, topicName, newState);
    } catch (err) {
      console.error("Toggle progress failed", err);
      // Revert on error
      loadUserData();
    }
  };

  const fetchQuestions = async (topic: string, description?: string, subjectName?: string, subjectId?: string) => {
    setLoading(true);
    setView("questions");
    setSelectedTopic(topic);
    setQuestions([]);
    setQuotaExceeded(false);
    const sName = subjectName || selectedSubject?.name;
    const sId = subjectId || selectedSubject?.id;
    setScore(0);
    setCurrentQuestionIndex(0);
    setShowResult(false);
    setUserAnswer(null);
    setDiscursiveMock(null);
    syncSession("questions", undefined, topic);
    
    try {
      if (sId) {
        const cached = await getContentCache(sId, topic, "questions");
        if (cached) {
          setQuestions(cached);
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sName, topic, description, type: "questions" })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Erro de rede ao carregar questões.");
      }

      if (!res.ok) {
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(data.error || "Falha ao carregar questões");
      }
      
      try {
        const parsed = JSON.parse(data.content);
        const qData = parsed.questions || [];
        setQuestions(qData);
        if (sId && qData.length > 0) {
          saveContentCache(sId, topic, "questions", qData);
        }
      } catch (parseErr) {
        console.error("Parse Questions Error:", parseErr);
        throw new Error("Erro ao processar as questões geradas pela IA.");
      }
    } catch (e) {
      console.error(e);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscursive = async (topic: string, description?: string, subjectName?: string, subjectId?: string) => {
    setLoading(true);
    setView("discursive");
    setSelectedTopic(topic);
    setDiscursiveQuestions([]);
    setQuotaExceeded(false);
    const sName = subjectName || selectedSubject?.name;
    const sId = subjectId || selectedSubject?.id;
    setShowExpectedAnswer(false);
    setCurrentQuestionIndex(0);
    syncSession("discursive", undefined, topic);
    
    try {
      if (sId) {
        const cached = await getContentCache(sId, topic, "discursive");
        if (cached) {
          setDiscursiveQuestions(cached);
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sName, topic, description, type: "discursive" })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Erro ao carregar dados do servidor.");
      }

      if (!res.ok) {
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(data.error || "Falha ao carregar questões discursivas");
      }
      
      try {
        const parsed = JSON.parse(data.content);
        const dData = parsed.questions || [];
        setDiscursiveQuestions(dData);
        if (sId && dData.length > 0) {
          saveContentCache(sId, topic, "discursive", dData);
        }
      } catch (parseErr) {
        console.error("Parse Discursive Error:", parseErr);
        throw new Error("Erro no formato das questões discursivas.");
      }
    } catch (e) {
      console.error(e);
      setDiscursiveQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const startMockExam = async () => {
    setLoading(true);
    setView("mock-exam");
    setScore(0);
    setCurrentQuestionIndex(0);
    setShowResult(false);
    setUserAnswer(null);
    setQuotaExceeded(false);
    
    try {
      if (selectedSubject?.id) {
        const cached = await getContentCache(selectedSubject.id, "subject_mock", "mock-exam");
        if (cached) {
          setQuestions(cached.questions || []);
          setDiscursiveMock(cached.discursive || null);
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: selectedSubject.name, type: "mock-exam" })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Erro ao carregar simulado.");
      }

      if (!res.ok) {
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(data.error || "Falha ao gerar simulado");
      }

      const parsed = JSON.parse(data.content);
      setQuestions(parsed.questions || []);
      setDiscursiveMock(parsed.discursive || null);

      if (selectedSubject?.id && parsed.questions) {
        saveContentCache(selectedSubject.id, "subject_mock", "mock-exam", {
          questions: parsed.questions,
          discursive: parsed.discursive
        });
      }
    } catch (e) {
      console.error(e);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const startCombinedExam = async () => {
    setLoading(true);
    setView("mock-exam");
    setScore(0);
    setCurrentQuestionIndex(0);
    setShowResult(false);
    setUserAnswer(null);
    setQuotaExceeded(false);

    try {
      const cached = await getContentCache("global", "combined_mock", "combined-mock");
      if (cached) {
        setQuestions(cached.questions || []);
        setDiscursiveMock(cached.discursive || null);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "combined-mock" })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Erro ao carregar simulado interdisciplinar.");
      }

      if (!res.ok) {
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(data.error || "Falha ao gerar simulado interdisciplinar");
      }

      const parsed = JSON.parse(data.content);
      setQuestions(parsed.questions || []);
      setDiscursiveMock(parsed.discursive || null);

      if (parsed.questions) {
        saveContentCache("global", "combined_mock", "combined-mock", {
          questions: parsed.questions,
          discursive: parsed.discursive
        });
      }
    } catch (e) {
      console.error(e);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const startFlashcards = async (topic: string, description?: string, subjectName?: string, subjectId?: string) => {
    setLoading(true);
    setView("flashcards");
    setSelectedTopic(topic);
    setFlashcards([]);
    setCurrentFlashcardIndex(0);
    setIsFlipped(false);
    setQuotaExceeded(false);
    const sName = subjectName || selectedSubject?.name;
    const sId = subjectId || selectedSubject?.id;
    syncSession("flashcards", undefined, topic);

    try {
      if (sId) {
        const cached = await getContentCache(sId, topic, "flashcards");
        if (cached) {
          setFlashcards(cached);
          setLoading(false);
          return;
        }
      }

      // Check for static data as fallback before AI
      const topicData = subjects.find(s => s.id === sId)?.topics.find((t: any) => t.name === topic);
      if (topicData?.flashcards && topicData.flashcards.length > 0) {
        setFlashcards(topicData.flashcards);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sName, topic, description, type: "flashcards" })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Erro de conexão ao carregar flashcards.");
      }

      if (!res.ok) {
        if (res.status === 429) setQuotaExceeded(true);
        throw new Error(data.error || "Falha ao gerar flashcards");
      }

      const parsed = JSON.parse(data.content);
      const fData = parsed.flashcards || [];
      setFlashcards(fData);
      
      if (sId && fData.length > 0) {
        saveContentCache(sId, topic, "flashcards", fData);
      }
    } catch (e) {
      console.error("Flashcards Error:", e);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    if (userAnswer) return;
    setUserAnswer(option);
    if (option === questions[currentQuestionIndex].answer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setUserAnswer(null);
    } else {
      setShowResult(true);
      if (view === "questions" && selectedSubject && selectedTopic) {
        // Optimistic update for quiz completion
        setUserProgress((prev: any) => {
          const currentCompleted = prev?.completedTopics?.[selectedSubject.id] || [];
          if (currentCompleted.includes(selectedTopic)) return prev;
          
          return {
            ...prev,
            completedTopics: {
              ...(prev?.completedTopics || {}),
              [selectedSubject.id]: Array.from(new Set([...currentCompleted, selectedTopic]))
            }
          };
        });
        saveProgress(selectedSubject.id, selectedTopic);
      }
    }
  };

  const renderIcon = (iconName: string, className?: string) => {
    switch (iconName) {
      case "Shield": return <Shield className={className} />;
      case "Briefcase": return <Briefcase className={className} />;
      case "BookScale": return <BookScale className={className} />;
      default: return <BookOpen className={className} />;
    }
  };

  const handleSaveNote = async () => {
    if (!selectedSubject || !selectedTopic) return;
    setIsSavingNote(true);
    try {
      await saveNote(selectedSubject.id, selectedTopic, topicNote);
      await loadUserData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    if (userProgress?.notes && selectedSubject && selectedTopic) {
      const noteKey = `${selectedSubject.id}___${selectedTopic.replace(/\./g, '_')}`;
      setTopicNote(userProgress.notes[noteKey] || "");
    } else {
      setTopicNote("");
    }
  }, [selectedSubject, selectedTopic, userProgress]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando LegisPlan...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900">
         <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl rotate-12 shadow-xl shadow-blue-900/40">
               <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-4">LegisPlan</h1>
            <p className="text-slate-400 mb-10 font-medium leading-relaxed">
              Sua plataforma de estudos jurídicos de alto desempenho. Organize seu progresso e conquiste sua aprovação.
            </p>
            <button 
              onClick={login}
              className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/node_modules/@firebase/firebaseui/dist/copy_cross_browser_index.js/google.svg" className="w-5 h-5" alt=""/>
              Entrar com Google
            </button>
            <p className="mt-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Acesso Seguro & Criptografado</p>
         </div>
      </div>
    );
  }

  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0);
  const completedCount = userProgress?.completedTopics ? Object.values(userProgress.completedTopics).flat().length : 0;
  const globalProgress = Math.round((completedCount / totalTopics) * 100);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Nav */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col sticky top-0 h-screen shrink-0">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={() => { setView("subject-selection"); syncSession("subject-selection"); }}>
            <div className="w-3 h-6 bg-blue-500 rounded-sm"></div>
            <h1 className="text-xl font-bold tracking-tight uppercase">LegisPlan</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">ESTUDO JURÍDICO</p>
        </div>

        <nav className="flex-1 py-8">
          <div className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menu Principal</div>
          <button 
            onClick={() => { setView("dashboard"); syncSession("dashboard"); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 transition-colors",
              view === "dashboard" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
            )}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-semibold">Meu Desempenho</span>
          </button>
          <button 
            onClick={() => { setView("subject-selection"); syncSession("subject-selection"); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 transition-colors",
              view === "subject-selection" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
            )}
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-semibold">Grade Curricular</span>
          </button>
          <button 
            onClick={() => { selectedSubject && setView("topic-list"); syncSession("topic-list"); }}
            disabled={!selectedSubject}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 transition-colors disabled:opacity-30",
              view === "topic-list" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-sm font-semibold">Temas da Matéria</span>
          </button>
          <button 
            onClick={() => { startCombinedExam(); syncSession("mock-exam"); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 transition-colors",
              view === "mock-exam" && !selectedSubject ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
            )}
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-semibold">Simulado Global</span>
          </button>
        </nav>

        <div className="p-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-tighter">Progresso do Ciclo</div>
            <div className="text-lg font-bold text-white mb-2 tracking-tight">{globalProgress}% Concluído</div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${globalProgress}%` }}
                className="bg-blue-500 h-full rounded-full"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="lg:hidden flex items-center gap-2" onClick={() => { setView("subject-selection"); syncSession("subject-selection"); }}>
               <div className="w-2 h-5 bg-blue-500 rounded-sm"></div>
               <h1 className="text-sm font-black tracking-tight uppercase">LP</h1>
            </div>
            <span className="hidden sm:inline text-slate-400 font-medium text-sm">Olá, {user.displayName?.split(' ')[0]}</span>
            <span className="hidden xs:inline bg-blue-50 text-blue-700 text-[10px] font-black px-2 sm:px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={logout}
              className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 font-bold text-[10px] uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-200 flex items-center justify-center text-white font-black text-xs ring-2 ring-slate-50 shadow-lg">
              {user.displayName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="p-4 md:p-8 flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {view === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12 max-w-7xl mx-auto"
              >
                {/* Dashboard Header & Summary Stats (Full Width) */}
                <div className="bg-slate-900 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 text-white relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent"></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 text-center md:text-left">
                      <div className="space-y-3 sm:space-y-4 w-full">
                        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">Olá, {user.displayName?.split(' ')[0] || 'Estudante'}!</h2>
                        <p className="text-slate-300 font-medium text-sm sm:text-lg">Progresso: {globalProgress}% concluído.</p>
                        {lastSessionData && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={resumeLastSession}
                            className="bg-blue-600 text-white w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] sm:text-sm uppercase tracking-widest shadow-xl shadow-blue-900/40 border border-blue-500 mt-2 sm:mt-4 group"
                          >
                            <RefreshCcw className="w-4 h-4 sm:w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                            Continuar Estudo
                          </motion.button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-8 bg-white/5 backdrop-blur-md p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 w-full md:w-auto justify-around sm:justify-start mt-2 md:mt-0">
                         <div className="text-center">
                            <div className="text-xl sm:text-4xl font-black text-white">{completedCount}</div>
                            <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Temas</div>
                         </div>
                         <div className="w-px h-6 sm:h-12 bg-white/10"></div>
                         <div className="text-center">
                            <div className="text-xl sm:text-4xl font-black text-blue-400">{globalProgress}%</div>
                            <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Geral</div>
                         </div>
                         <div className="w-px h-6 sm:h-12 bg-white/10"></div>
                         <div className="text-center">
                            <div className="text-xl sm:text-4xl font-black text-emerald-400">#142</div>
                            <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Rank</div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Detailed Progress by Subject */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-sm">
                    <div className="flex justify-between items-center mb-6 sm:mb-10">
                       <h3 className="text-xl sm:text-2xl font-black tracking-tight">Desempenho por Disciplina</h3>
                       <Trophy className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                      {subjects.map(s => {
                        const count = userProgress?.completedTopics?.[s.id]?.length || 0;
                        const progress = Math.round((count / s.topics.length) * 100);
                        return (
                          <div key={s.id} className="space-y-4 group">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {renderIcon(s.icon, "w-5 h-5")}
                                 </div>
                                 <span className="font-bold text-slate-700">{s.name}</span>
                              </div>
                              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="bg-blue-500 h-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar Stats in Dashboard */}
                  <div className="space-y-8">
                     <div className="bg-emerald-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-xl shadow-emerald-100">
                        <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-110 transition-transform duration-700">
                           <Sparkles className="w-32 h-32" />
                        </div>
                        <h3 className="text-xl font-black mb-4">Meta Diária</h3>
                        <div className="text-4xl font-black mb-2">{completedCount} / 5</div>
                        <p className="text-emerald-100 text-sm leading-relaxed mb-6">Mantenha a consistência para atingir sua meta de 5 temas hoje.</p>
                        <div className="w-full bg-emerald-700 h-2 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min((completedCount / 5) * 100, 100)}%` }}
                             className="bg-white h-full"
                           />
                        </div>
                     </div>

                     <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
                        <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                           <RefreshCcw className="w-5 h-5 text-blue-500" />
                           Último Acesso
                        </h3>
                        {lastSessionData ? (
                          <div className="space-y-6">
                             <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600">
                                   {renderIcon("BookOpen", "w-7 h-7")}
                                </div>
                                <div className="flex-1">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{lastSessionData.view === 'explanation' ? 'Doutrina' : 'Exercícios'}</p>
                                   <p className="font-bold text-slate-900 leading-tight">{lastSessionData.topicName || subjects.find(s=>s.id === lastSessionData.subjectId)?.name || 'Ciclo Geral'}</p>
                                </div>
                             </div>
                             <button 
                               onClick={resumeLastSession}
                               className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                             >
                               Retomar agora <ChevronRight className="w-4 h-4" />
                             </button>
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                             <p className="text-slate-400 font-medium italic text-sm">Sem atividade recente.</p>
                          </div>
                        )}
                     </div>
                  </div>
                </div>

                {/* Subject Selection Integrated into Home/Dashboard */}
                <div className="space-y-8 pt-10 border-t border-slate-200">
                   <div className="flex justify-between items-end">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Grade Curricular</h2>
                        <p className="text-slate-500 font-medium">Explore as disciplinas e inicie um novo módulo.</p>
                      </div>
                   </div>
                   <div className="grid md:grid-cols-3 gap-8">
                     {subjects.map((s) => {
                       const subjectCompletedCount = userProgress?.completedTopics?.[s.id]?.length || 0;
                       const subjectProgress = Math.round((subjectCompletedCount / s.topics.length) * 100);

                       return (
                         <motion.div
                           key={s.id}
                           whileHover={{ y: -8 }}
                           className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col gap-6 hover:shadow-2xl hover:border-blue-200 transition-all group"
                         >
                           <div className="flex justify-between items-start">
                             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                               {renderIcon(s.icon, "w-8 h-8")}
                             </div>
                             <div className="flex flex-col items-end">
                               <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-lg border border-green-100 uppercase tracking-widest">Ativo</span>
                               <span className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-tighter">{subjectProgress}%</span>
                             </div>
                           </div>
                           <div className="space-y-3">
                             <h3 className="text-2xl font-black text-slate-900 tracking-tight">{s.name}</h3>
                             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${subjectProgress}%` }}
                                 className="bg-blue-500 h-full"
                               />
                             </div>
                             <p className="text-sm text-slate-500 leading-relaxed pt-2">
                               {s.topics.length} temas fundamentais com doutrina e baterias inéditas.
                             </p>
                           </div>
                           <button 
                             onClick={() => handleSelectSubject(s)}
                             className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 group-hover:translate-y-[-2px] shadow-xl shadow-slate-200"
                           >
                             Estudar Agora <ChevronRight className="w-4 h-4" />
                           </button>
                         </motion.div>
                       );
                     })}
                   </div>
                </div>
              </motion.div>
            )}



            {view === "topic-list" && selectedSubject && (
              <motion.div
                key="topics"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setView("subject-selection")} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all border border-transparent hover:border-slate-300">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">{selectedSubject.name}</h2>
                    <p className="text-slate-500 font-medium">Módulos de Estudo Dirigido</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Temas Disponíveis</h3>
                    <button 
                      onClick={startMockExam}
                      className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                      <Sparkles className="w-4 h-4" /> Simulado Completo
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedSubject.topics.map((topic: any, idx: number) => {
                      const isCompleted = userProgress?.completedTopics?.[selectedSubject.id]?.includes(topic.name);
                      return (
                        <div 
                          key={idx}
                          className="group flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-5">
                            <span className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors tracking-tight",
                              isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                            )}>
                              {isCompleted ? <Check className="w-4 h-4" /> : String(idx + 1).padStart(2, '0')}
                            </span>
                            <div>
                               <h4 className={cn(
                                 "font-bold transition-colors",
                                 isCompleted ? "text-emerald-700" : "text-slate-700 group-hover:text-slate-900"
                               )}>{topic.name}</h4>
                               <p className="text-[10px] text-slate-400 font-medium leading-tight max-w-sm mt-0.5">{topic.description}</p>
                            </div>
                            {isCompleted && (
                              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-emerald-100 tracking-widest">
                                Concluído
                              </span>
                            )}
                          </div>
                          <div className={cn(
                            "flex gap-2 sm:gap-3 flex-wrap justify-end",
                            "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform translate-x-0 lg:translate-x-2 lg:group-hover:translate-x-0"
                          )}>
                            <button 
                              onClick={() => fetchExplanation(topic.name, topic.description, selectedSubject?.name)}
                              className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all bg-white"
                            >
                              Doutrina
                            </button>
                            <button 
                              onClick={() => fetchQuestions(topic.name, topic.description, selectedSubject?.name)}
                              className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition-all bg-white"
                            >
                              Questões
                            </button>
                            <button 
                              onClick={() => startFlashcards(topic.name, topic.description, selectedSubject?.name, selectedSubject?.id)}
                              className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-200 hover:bg-white transition-all bg-white"
                            >
                              Cards
                            </button>
                            <button 
                              onClick={() => handleToggleCompletion(selectedSubject.id, topic.name)}
                              className={cn(
                                "text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                                isCompleted 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "bg-white border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
                              )}
                            >
                              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 border border-current rounded-full" />}
                              {isCompleted ? "Concluído" : "Concluir"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {view === "flashcards" && (
              <motion.div
                key="flashcards"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl mx-auto space-y-8"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setView("topic-list")} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">Memorização Ativa</div>
                    <h2 className="text-xl font-black text-slate-900">{selectedTopic}</h2>
                  </div>
                </div>

                <div className="perspective-1000 h-[350px] relative">
                  {loading ? (
                    <div className="w-full h-full bg-white border-2 border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center animate-pulse">
                      <Loader2 className="w-10 h-10 text-orange-400 animate-spin mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gerando Cards Memorizáveis...</p>
                    </div>
                  ) : flashcards.length === 0 ? (
                    <div className="w-full h-full bg-white border-2 border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center">
                       <HelpCircle className="w-10 h-10 text-slate-300 mb-4" />
                       <h3 className="font-bold text-slate-800 mb-2">Cards Indisponíveis</h3>
                       <p className="text-slate-400 text-xs italic mb-6">
                         {quotaExceeded ? "Limite de geração de novos cards atingido por hoje." : "Não conseguimos carregar os cards para este tema."}
                       </p>
                       <button 
                        onClick={() => startFlashcards(selectedTopic, undefined, selectedSubject?.name)}
                        className="text-blue-600 font-black uppercase text-[10px] tracking-widest hover:underline"
                       >
                         Tentar Novamente
                       </button>
                    </div>
                  ) : (
                    <motion.div
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                      onClick={() => setIsFlipped(!isFlipped)}
                      style={{ transformStyle: "preserve-3d" }}
                      className="w-full h-full cursor-pointer relative"
                    >
                      {/* Front */}
                      <div 
                        className="absolute inset-0 w-full h-full backface-hidden bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-xl p-10 flex flex-col items-center justify-center text-center group"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">Lado A: Pergunta</div>
                        <p className="text-2xl font-black text-slate-900 leading-tight">
                          {flashcards[currentFlashcardIndex]?.front}
                        </p>
                        <div className="absolute bottom-6 text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Toque para ver a resposta</div>
                      </div>

                      {/* Back */}
                      <div 
                        className="absolute inset-0 w-full h-full backface-hidden bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-xl p-10 flex flex-col items-center justify-center text-center text-white"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                         <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Lado B: Resposta</div>
                         <p className="text-xl font-medium leading-relaxed">
                          {flashcards[currentFlashcardIndex]?.back}
                         </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-6">
                  <button 
                    disabled={currentFlashcardIndex === 0 || loading}
                    onClick={() => { setCurrentFlashcardIndex(i=>i-1); setIsFlipped(false); }}
                    className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Anterior
                  </button>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {flashcards.length > 0 ? `${currentFlashcardIndex + 1} / ${flashcards.length}` : "0 / 0"}
                  </div>
                  <button 
                    disabled={currentFlashcardIndex === (flashcards.length || 1) - 1 || loading}
                    onClick={() => { setCurrentFlashcardIndex(i=>i+1); setIsFlipped(false); }}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg disabled:opacity-30"
                  >
                    Próximo
                  </button>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center">
                   <p className="text-orange-700 text-xs font-semibold">Dica: Tente responder mentalmente antes de virar o card para máxima retenção.</p>
                </div>
              </motion.div>
            )}

            {view === "explanation" && (
              <motion.div
                key="explanation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setView("topic-list")} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded tracking-widest">Doutrina</span>
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">• {selectedSubject?.name}</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900">{selectedTopic}</h2>
                    </div>
                  </div>
                  <button 
                    onClick={() => fetchQuestions(selectedTopic)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
                  >
                    Testar Conhecimento
                  </button>
                </div>

                {!loading && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleToggleCompletion(selectedSubject.id, selectedTopic)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all shadow-lg",
                        userProgress?.completedTopics?.[selectedSubject.id]?.includes(selectedTopic) 
                          ? "bg-emerald-600 text-white" 
                          : "bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-50"
                      )}
                    >
                      {userProgress?.completedTopics?.[selectedSubject.id]?.includes(selectedTopic) ? <CheckCircle2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 opacity-50" />}
                      {userProgress?.completedTopics?.[selectedSubject.id]?.includes(selectedTopic) ? "Concluído" : "Marcar como Concluído"}
                    </button>
                  </div>
                )}

                <div className={cn(
                  "bg-white border border-slate-200 rounded-3xl p-8 md:p-14 shadow-sm min-h-[500px]",
                  loading && "flex items-center justify-center"
                )}>
                  {loading ? (
                    <div className="text-center space-y-6">
                      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                      <div className="space-y-1">
                        <p className="text-slate-900 font-bold tracking-tight text-lg">Estruturando conteúdo explicativo</p>
                        <p className="text-slate-400 text-sm animate-pulse">Cruzando dados com informativos do STF e STJ...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-strong:text-slate-900 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:rounded-r-lg">
                      {explanation ? (
                        <ReactMarkdown>{explanation}</ReactMarkdown>
                      ) : (
                        <div className="text-center py-20 px-6">
                          <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                            quotaExceeded ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                          )}>
                            {quotaExceeded ? <Sparkles className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />}
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {quotaExceeded ? "Limite Diário Atingido" : "Conteúdo não disponível"}
                          </h3>
                          <p className="text-slate-400 italic max-w-md mx-auto">
                            {quotaExceeded 
                              ? "Você atingiu o limite de novas gerações da Inteligência Artificial por hoje. Como este é um ambiente de testes, os recursos são limitados."
                              : "Houve um erro ao carregar este conteúdo. Por favor, verifique sua conexão ou tente novamente."
                            }
                          </p>
                          {quotaExceeded && (
                            <p className="mt-4 text-xs text-slate-500 font-medium">
                              DICA: Todo conteúdo que você já abriu anteriormente continuará funcionando normalmente pois está salvo em cache!
                            </p>
                          )}
                          <button 
                            onClick={() => fetchExplanation(selectedTopic, undefined, selectedSubject?.name)}
                            className="mt-6 text-blue-600 font-black uppercase text-xs tracking-widest hover:underline flex items-center gap-2 mx-auto"
                          >
                            <RefreshCcw className="w-4 h-4" />
                            Tentar novamente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                         <Sparkles className="w-5 h-5 text-blue-500" /> Minhas Anotações
                      </h3>
                      {userProgress?.notes?.[`${selectedSubject.id}___${selectedTopic.replace(/\./g, '_')}`] && (
                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">Salvo</span>
                      )}
                    </div>
                    <textarea
                      value={topicNote}
                      onChange={(e) => setTopicNote(e.target.value)}
                      placeholder="Escreva aqui seus resumos..."
                      className="w-full min-h-[150px] sm:min-h-[200px] p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm sm:text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none font-medium leading-relaxed"
                    />
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveNote}
                        disabled={isSavingNote}
                        className="bg-blue-600 text-white w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-100 active:scale-95"
                      >
                        {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                        Salvar Anotações
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {view === "discursive" && (
              <motion.div
                key="discursive"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setView("topic-list")} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Treinamento Subjetivo</div>
                    <h2 className="text-xl font-black text-slate-900">{selectedTopic}</h2>
                  </div>
                </div>

                {loading ? (
                   <div className="p-24 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gerando Casos Práticos...</p>
                   </div>
                ) : discursiveQuestions.length === 0 ? (
                  <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                      quotaExceeded ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-emerald-500"
                    )}>
                      {quotaExceeded ? <Sparkles className="w-8 h-8" /> : <BookScale className="w-8 h-8" />}
                    </div>
                    <h3 className="text-lg font-bold">
                      {quotaExceeded ? "Limite Diário Atingido" : "Ops! Algo deu errado."}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                      {quotaExceeded 
                        ? "O limite de geração de novos casos práticos foi atingido. Temas já acessados continuam disponíveis."
                        : "Não conseguimos carregar os casos práticos. Tente novamente em instantes."}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => fetchDiscursive(selectedTopic, undefined, selectedSubject?.name)} 
                        className="text-emerald-600 font-bold uppercase text-xs tracking-widest hover:underline"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm relative">
                      <div className="absolute top-6 left-6 text-[10px] font-black text-slate-300 uppercase">Caso {currentQuestionIndex + 1} de {discursiveQuestions.length}</div>
                      <div className="pt-8 text-lg font-medium leading-relaxed text-slate-800">
                         {discursiveQuestions[currentQuestionIndex]?.text}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowExpectedAnswer(!showExpectedAnswer)}
                        className="w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl"
                      >
                        {showExpectedAnswer ? "Ocultar Padrão de Resposta" : "Ver Padrão de Resposta Esperado"}
                      </button>

                      <AnimatePresence>
                        {showExpectedAnswer && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-8 overflow-hidden"
                          >
                             <div className="flex items-center gap-2 mb-4 text-emerald-700 font-black text-[10px] uppercase tracking-widest">
                               <BookScale className="w-4 h-4" /> Fundamentação Legal e Doutrinária
                             </div>
                             <div className="text-emerald-950 leading-relaxed font-medium">
                               {discursiveQuestions[currentQuestionIndex]?.expected_answer}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex justify-between items-center">
                      <button 
                        disabled={currentQuestionIndex === 0}
                        onClick={() => {setCurrentQuestionIndex(i => i-1); setShowExpectedAnswer(false);}}
                        className="px-6 py-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 font-bold text-xs uppercase"
                      >
                        Anterior
                      </button>
                      <button 
                        disabled={currentQuestionIndex === discursiveQuestions.length - 1}
                        onClick={() => {setCurrentQuestionIndex(i => i+1); setShowExpectedAnswer(false);}}
                        className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 font-bold text-xs uppercase"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {(view === "questions" || view === "mock-exam") && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setView("topic-list")} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5 underline decoration-indigo-200 underline-offset-4">Bateria de Exercícios</div>
                        <h2 className="text-xl font-black text-slate-900 truncate max-w-[200px] md:max-w-md">
                          {view === "mock-exam" ? "Simulado Geral" : selectedTopic}
                        </h2>
                      </div>
                    </div>
                    {!loading && questions.length > 0 && !showResult && (
                      <div className="px-4 py-2 bg-slate-900 rounded-xl text-xs font-black text-white shadow-xl shadow-slate-200">
                        QUESTÃO {currentQuestionIndex + 1} / {questions.length}
                      </div>
                    )}
                  </div>
                  {view === "mock-exam" && questions[currentQuestionIndex]?.topic && (
                    <div className="bg-slate-100 text-slate-500 p-2 rounded-lg text-[10px] font-bold uppercase tracking-tight ml-12 text-center">
                      TEMA: {questions[currentQuestionIndex].topic}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="p-24 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Gerando Desafio Jurídico</h3>
                      <p className="text-slate-400 text-sm">Simulando critérios de pontuação CESPE/FGV...</p>
                    </div>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                      quotaExceeded ? "bg-amber-100 text-amber-600" : "bg-rose-50 text-rose-500"
                    )}>
                      {quotaExceeded ? <Sparkles className="w-8 h-8" /> : <HelpCircle className="w-8 h-8" />}
                    </div>
                    <h3 className="text-lg font-bold">
                      {quotaExceeded ? "Limite Diário Atingido" : "Ops! Algo deu errado."}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                      {quotaExceeded 
                        ? "O limite de geração de novas questões foi atingido por hoje. Você pode revisar questões de temas que já abriu anteriormente."
                        : "Não conseguimos gerar as questões agora. Verifique sua conexão ou tente novamente."}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => fetchQuestions(selectedTopic, undefined, selectedSubject?.name)} 
                        className="text-blue-600 font-bold uppercase text-xs tracking-widest hover:underline"
                      >
                        Tentar Novamente
                      </button>
                      <button 
                        onClick={() => setView("topic-list")} 
                        className="text-slate-400 font-bold uppercase text-xs tracking-widest hover:underline"
                      >
                        Voltar para Temas
                      </button>
                    </div>
                  </div>
                ) : showResult ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white border border-slate-200 rounded-3xl p-10 md:p-16 shadow-2xl text-center space-y-10 relative overflow-hidden"
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                    
                    <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto rotate-12 relative shadow-2xl">
                      <Trophy className="w-12 h-12 text-blue-400" />
                      <div className="absolute inset-0 border-2 border-slate-700 rounded-3xl translate-x-1 translate-y-1 -z-10"></div>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Avaliação Concluída</h2>
                      <p className="text-slate-500 font-medium italic">Feedback de desempenho gerado por LegisPlan IA</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 relative group overflow-hidden">
                         <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-[0.03] transition-opacity"></div>
                        <div className="text-5xl font-black text-blue-600 mb-1">{score}</div>
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Questões de Acerto</div>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="text-5xl font-black text-slate-900 mb-1">{Math.round((score/questions.length)*100)}%</div>
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Aproveitamento</div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      {discursiveMock && (
                        <button 
                          onClick={() => {
                            setDiscursiveQuestions([{ text: discursiveMock.text, expected_answer: discursiveMock.expected_answer }]);
                            setView("discursive");
                            setCurrentQuestionIndex(0);
                            setShowExpectedAnswer(false);
                          }}
                          className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-xl shadow-emerald-100 mb-2"
                        >
                          Ir para Questão Discursiva do Simulado
                        </button>
                      )}
                      <button 
                        onClick={() => setView("topic-list")}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-slate-800 shadow-xl shadow-slate-200"
                      >
                        Retornar ao Conteúdo
                      </button>
                      <button 
                        onClick={() => view === "mock-exam" ? startMockExam() : fetchQuestions(selectedTopic)}
                        className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                      >
                        Reiniciar Bateria
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-10">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm font-semibold text-xl leading-relaxed text-slate-800 ring-1 ring-slate-50">
                      {questions[currentQuestionIndex].text}
                    </div>

                    <div className="grid gap-4">
                      {Object.entries(questions[currentQuestionIndex].options).map(([key, text]) => {
                        const isCorrect = key === questions[currentQuestionIndex].answer;
                        const isSelected = userAnswer === key;
                        
                        return (
                          <button
                            key={key}
                            disabled={userAnswer !== null}
                            onClick={() => handleAnswer(key)}
                            className={cn(
                              "p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-5 relative overflow-hidden group",
                              !userAnswer && "border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/20",
                              userAnswer && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-950",
                              userAnswer && isSelected && !isCorrect && "border-rose-500 bg-rose-50 text-rose-950",
                              userAnswer && !isSelected && !isCorrect && "border-slate-50 opacity-40 bg-white"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-transform group-hover:scale-105",
                              !userAnswer && "bg-slate-100 text-slate-400",
                              userAnswer && isCorrect && "bg-emerald-500 text-white",
                              userAnswer && isSelected && !isCorrect && "bg-rose-500 text-white",
                              userAnswer && !isSelected && "bg-slate-50 text-slate-300"
                            )}>
                              {key}
                            </div>
                            <span className="flex-1 text-base md:text-lg pt-1">{text}</span>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {userAnswer && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-8 rounded-3xl border-l-8 flex flex-col gap-6 shadow-2xl",
                            userAnswer === questions[currentQuestionIndex].answer 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                              : "bg-rose-50 border-rose-100 text-rose-950"
                          )}
                        >
                          <div className="flex items-center gap-3 font-black text-sm uppercase tracking-widest">
                            {userAnswer === questions[currentQuestionIndex].answer ? (
                              <><CheckCircle2 className="w-6 h-6" /> Item Correto</>
                            ) : (
                              <><HelpCircle className="w-6 h-6" /> Item Incorreto</>
                            )}
                          </div>
                          
                          <div className="bg-white/40 p-6 rounded-2xl text-sm leading-relaxed border border-white/50">
                            <div className="flex items-center gap-2 mb-3 text-slate-500 font-black text-[10px] uppercase tracking-tighter">
                                <BookScale className="w-4 h-4" /> Justificativa Detalhada
                            </div>
                            <div className="whitespace-pre-wrap font-medium">
                              {questions[currentQuestionIndex].justification}
                            </div>
                          </div>

                          <button 
                            onClick={nextQuestion}
                            className="bg-slate-900 text-white py-4 px-10 rounded-2xl font-black uppercase tracking-widest text-xs self-end hover:bg-slate-800 transition-all shadow-xl"
                          >
                            {currentQuestionIndex === questions.length - 1 ? "Exibir Resultado" : "Ir para Próxima"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Status Bar */}
        <footer className="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex gap-6 uppercase tracking-tighter font-bold">
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Conexão Estável</span>
            <span className="hidden sm:flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Base de Dados OAB/2026</span>
          </div>
          <div className="hidden md:block font-bold tracking-widest uppercase">
            Professional Polish Edition v2.4
          </div>
        </footer>
        {/* Mobile Navbar */}
        <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl px-2 py-2 flex items-center gap-1 z-50 shadow-2xl">
          <button 
            onClick={() => { setView("dashboard"); syncSession("dashboard"); }}
            className={cn("p-3 rounded-xl transition-all", view === "dashboard" ? "bg-blue-600 text-white" : "text-slate-400")}
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { setView("subject-selection"); syncSession("subject-selection"); }}
            className={cn("p-3 rounded-xl transition-all", view === "subject-selection" ? "bg-blue-600 text-white" : "text-slate-400")}
          >
            <Shield className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { selectedSubject && setView("topic-list"); syncSession("topic-list"); }}
            disabled={!selectedSubject}
            className={cn("p-3 rounded-xl transition-all disabled:opacity-20", view === "topic-list" ? "bg-blue-600 text-white" : "text-slate-400")}
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
          <button 
            onClick={() => { startCombinedExam(); syncSession("mock-exam"); }}
            className={cn("p-3 rounded-xl transition-all", view === "mock-exam" && !selectedSubject ? "bg-blue-600 text-white" : "text-slate-400")}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </nav>
      </main>
    </div>
  );
}

function Scale(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </svg>
  );
}
