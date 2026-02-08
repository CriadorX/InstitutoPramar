import React, { useState, useEffect, useCallback, createContext, useContext, Suspense, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from "@google/genai";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Wallet,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Plus,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Stethoscope,
  BrainCircuit,
  HeartPulse,
  UserCog,
  Activity,
  FileText,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Microscope,
  ShieldCheck,
  LogOut,
  Filter,
  Download,
  Grid,
  List,
  MoreVertical,
  Mail,
  Phone,
  Video,
  Lock,
  Eye,
  Trash2,
  FileBadge,
  CreditCard,
  DollarSign,
  ChevronLeft,
  Bot,
  Send,
  Loader2,
  Minimize2
} from 'lucide-react';

// --- TYPES ---

type Professional = {
  id: string;
  name: string;
  profession: 'Medico' | 'Psicologo' | 'Psicopedagogo' | 'Assistente Social' | 'Fonoaudiologo' | 'Outro';
  cpf: string;
  phone: string;
  email: string;
  specialty: string;
  createdAt: string;
  status: 'Ativo' | 'Inativo' | 'Férias';
  price?: number;
  bio?: string;
  council_type?: string;
  registration_number?: string;
  registration_state?: string;
  therapeutic_approaches?: string;
  office_address?: string;
  avatar_url?: string;
};

type Patient = {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email?: string;
  guardian?: string;
  observations?: string;
  createdAt: string;
  status: 'Ativo' | 'Inativo';
};

type AIAnalysis = {
  summary: string;
  keyPoints: string[];
  attentionFactors: string[];
  investigationSuggestions: string[];
  suggestedQuestions: string[];
  disclaimer: string;
};

type Consultation = {
  id: string;
  patientId: string;
  professionalId: string;
  date: string;
  questions: string;
  answers: string;
  observations: string;
  hasAttachments: boolean;
  aiAnalysis?: AIAnalysis;
};

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

type ViewState = 'dashboard' | 'professionals' | 'patients' | 'consultations' | 'settings' | 'schedule' | 'records' | 'finance' | 'messages';

// --- UTILS ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const validateCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  return true;
};

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const calculateAge = (birthDate: string) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// --- API & AI SERVICE ---

const analyzeConsultationWithAI = async (
  consultation: Partial<Consultation>,
  patient: Patient,
  professional: Professional
): Promise<AIAnalysis> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-3-flash-preview";

    const prompt = `
      Atue como um supervisor clínico sênior multidisciplinar. Analise os dados brutos desta consulta.
      
      CONTEXTO:
      Profissional: ${professional.name} (${professional.profession} - ${professional.specialty})
      Paciente: ${patient.name} (Idade: ${calculateAge(patient.birthDate)})
      
      DADOS DA CONSULTA:
      [Perguntas do Profissional]: ${consultation.questions}
      [Respostas/Relato do Paciente]: ${consultation.answers}
      [Observações Clínicas]: ${consultation.observations}
      
      TAREFA:
      Gere uma análise estruturada para apoio à decisão clínica.
      
      REGRAS CRÍTICAS:
      1. NÃO apresente diagnósticos definitivos (CID/DSM). Use termos como "sugere", "indica possibilidade", "quadro compatível com".
      2. Use linguagem técnica, clara e profissional.
      3. Se houver incerteza ou falta de dados, indique claramente.
      
      FORMATO JSON ESPERADO:
      - summary: Resumo claro e conciso da sessão (máx 3 linhas).
      - keyPoints: 3 a 5 pontos principais observados (sintomas, comportamentos, falas).
      - attentionFactors: Fatores de risco ou atenção imediata.
      - investigationSuggestions: Sugestões de exames, testes ou áreas para investigar mais a fundo.
      - suggestedQuestions: 3 perguntas estratégicas para a próxima sessão.
      - disclaimer: Exatamente: "Esta análise é um apoio ao profissional e não substitui diagnóstico clínico."
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            attentionFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            investigationSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            disclaimer: { type: Type.STRING },
          },
          required: ["summary", "keyPoints", "attentionFactors", "investigationSuggestions", "suggestedQuestions", "disclaimer"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AIAnalysis;
  } catch (error) {
    console.error("Erro na IA:", error);
    throw new Error("Falha ao gerar análise de IA. Tente novamente.");
  }

};

// --- SUPABASE CLIENT ---

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// --- CONTEXT ---

const AppContext = createContext<{
  professionals: Professional[];
  patients: Patient[];
  consultations: Consultation[];
  addProfessional: (p: Professional) => void;
  addPatient: (p: Patient) => void;
  addConsultation: (c: Consultation) => void;
  deleteProfessional: (id: string) => void;
  deletePatient: (id: string) => void;
  navigateTo: (view: ViewState, params?: any) => void;
  currentView: ViewState;
  viewParams: any;
  isAIChatOpen: boolean;
  toggleAIChat: () => void;
}>({} as any);

const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('pramar_patients');
    return saved ? JSON.parse(saved) : [];
  });
  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    const saved = localStorage.getItem('pramar_consultations');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (data) setProfessionals(data as any);
  };
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => { localStorage.setItem('pramar_professionals', JSON.stringify(professionals)); }, [professionals]);
  useEffect(() => { localStorage.setItem('pramar_patients', JSON.stringify(patients)); }, [patients]);
  useEffect(() => { localStorage.setItem('pramar_consultations', JSON.stringify(consultations)); }, [consultations]);

  const addProfessional = async (p: Professional) => {
    const { data, error } = await supabase.from('profiles').insert([p]).select();
    if (data) setProfessionals(prev => [...prev, data[0] as any]);
  };
  const addPatient = (p: Patient) => setPatients(prev => [...prev, p]);
  const addConsultation = (c: Consultation) => setConsultations(prev => [...prev, c]);

  const deleteProfessional = (id: string) => setProfessionals(prev => prev.filter(p => p.id !== id));
  const deletePatient = (id: string) => setPatients(prev => prev.filter(p => p.id !== id));

  const navigateTo = (view: ViewState, params?: any) => {
    setCurrentView(view);
    setViewParams(params);
  };

  const toggleAIChat = () => setIsAIChatOpen(prev => !prev);

  return (
    <AppContext.Provider value={{
      professionals, patients, consultations,
      addProfessional, addPatient, addConsultation,
      deleteProfessional, deletePatient,
      navigateTo, currentView, viewParams,
      isAIChatOpen, toggleAIChat
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- COMPONENTS UI ---

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }: any) => {
  const baseClass = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm text-sm";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-teal-200",
    secondary: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    ghost: "text-slate-500 hover:bg-slate-100 border-transparent shadow-none"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${(variants as any)[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>
    <input
      {...props}
      className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 ${error ? 'border-red-400 focus:ring-red-100' : 'border-slate-200'}`}
    />
    {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
  </div>
);

const Select = ({ label, error, options, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>
    <div className="relative">
      <select
        {...props}
        className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 appearance-none ${error ? 'border-red-400' : 'border-slate-200'}`}
      >
        {options}
      </select>
      <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
    </div>
    {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
  </div>
);

const TextArea = ({ label, error, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>
    <textarea
      {...props}
      className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 min-h-[120px] resize-none ${error ? 'border-red-400' : 'border-slate-200'}`}
    />
    {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
  </div>
);

const Card = ({ children, title, action, className = '' }: any) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-6">
        {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

const EmptyState = ({ icon: Icon, title, description, action }: any) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
      <Icon size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

// --- AI CHAT WIDGET ---

const AIChatWidget = () => {
  const { isAIChatOpen, toggleAIChat } = useContext(AppContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    if (!chatSession && isAIChatOpen) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config: {
            systemInstruction: "Você é um assistente virtual inteligente do Instituto Pramar, uma plataforma multidisciplinar de saúde. Seu objetivo é auxiliar profissionais (médicos, psicólogos, etc.) com dúvidas sobre a plataforma, sugestões clínicas gerais (sempre com disclaimer que não substitui diagnóstico) e organização. Seja cordial, profissional e conciso."
          }
        });
        setChatSession(chat);
        setMessages([{ role: 'model', text: 'Olá! Sou o assistente virtual do Instituto Pramar. Como posso ajudar você hoje?' }]);
      } catch (error) {
        console.error("Failed to init chat", error);
      }
    }
  }, [isAIChatOpen, chatSession]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatSession || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: userMessage });

      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of result) {
        const chunkText = chunk.text;
        fullText += chunkText;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          lastMsg.text = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAIChatOpen) return null;

  return (
    <div className="fixed bottom-24 right-8 w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">IA Assistente</h3>
            <p className="text-[10px] text-purple-200">Gemini 3 Pro Powered</p>
          </div>
        </div>
        <button onClick={toggleAIChat} className="hover:bg-white/20 p-1 rounded-full transition-colors">
          <Minimize2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-none'
                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-violet-600" />
              <span className="text-xs text-slate-500">Digitando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors shadow-sm shadow-violet-200"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

// --- MODULES ---

const Dashboard = () => {
  const { professionals, patients, consultations, navigateTo, toggleAIChat } = useContext(AppContext);
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = [
    { label: 'Médicos', icon: Stethoscope, count: professionals.filter(p => p.profession === 'Medico').length, color: 'text-blue-600 bg-blue-50' },
    { label: 'Psicólogos', icon: BrainCircuit, count: professionals.filter(p => p.profession === 'Psicologo').length, color: 'text-purple-600 bg-purple-50' },
    { label: 'Psicopedagogos', icon: HeartPulse, count: professionals.filter(p => p.profession === 'Psicopedagogo').length, color: 'text-rose-600 bg-rose-50' },
    { label: 'Assistentes Sociais', icon: Users, count: professionals.filter(p => p.profession === 'Assistente Social').length, color: 'text-amber-600 bg-amber-50' },
    { label: 'Fonoaudiólogos', icon: Activity, count: professionals.filter(p => p.profession === 'Fonoaudiologo').length, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Relatórios', icon: FileText, count: consultations.length, color: 'text-cyan-600 bg-cyan-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-8 text-white shadow-lg shadow-teal-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium mb-3">
              <Sparkles size={12} /> Instituto Pramar
            </div>
            <h2 className="text-3xl font-bold mb-1">Bom dia, Michel! 👋</h2>
            <p className="text-teal-50 font-medium opacity-90">{today}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigateTo('schedule')} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
              <Calendar size={16} /> Ver agenda
            </button>
            <button onClick={() => navigateTo('schedule')} className="bg-white text-teal-600 hover:bg-teal-50 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2">
              <Plus size={16} /> Novo agendamento
            </button>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
          <div>
            <div className="flex items-center gap-2 mb-1 opacity-80 text-sm"><Users size={14} /> Pacientes Ativos</div>
            <span className="text-2xl font-bold">{patients.length}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 opacity-80 text-sm"><Calendar size={14} /> Consultas Hoje</div>
            <span className="text-2xl font-bold">0</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 opacity-80 text-sm"><Clock size={14} /> Esta Semana</div>
            <span className="text-2xl font-bold">0</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 opacity-80 text-sm"><Wallet size={14} /> Receita Mensal</div>
            <span className="text-2xl font-bold">R$ 0.0k</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon size={20} />
            </div>
            <p className="text-slate-500 text-xs font-semibold truncate">{stat.label}</p>
            <p className="text-slate-800 text-xl font-bold">{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-800">Agenda de Hoje</h3>
            <button className="text-teal-600 text-sm font-semibold hover:underline flex items-center gap-1">
              Ver tudo <ChevronRight size={16} />
            </button>
          </div>
          <EmptyState icon={Calendar} title="Nenhum atendimento" description="Não há consultas agendadas para hoje." action={
            <Button onClick={() => navigateTo('schedule')}>Agendar consulta</Button>
          } />
        </div>

        <div className="space-y-6">
          {/* Card 1: Atenção */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-400"></div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-amber-500" size={20} />
              <h3 className="font-bold text-slate-800 text-lg">Atenção</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-amber-800 font-medium text-sm">
                  <span className="font-bold">3 pacientes</span> com consentimento LGPD pendente
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-blue-800 font-medium text-sm">
                  <span className="font-bold">5 prontuários</span> aguardando assinatura
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Teleatendimento */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl shadow-lg shadow-blue-200/50 p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Video size={24} className="text-white" />
            </div>

            <h3 className="font-bold text-lg mb-2">Teleatendimento</h3>
            <p className="text-blue-50 text-sm mb-6 leading-relaxed">
              Atendimento multidisciplinar online com segurança e privacidade.
            </p>

            <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
              Gerenciar sessões
            </button>
          </div>

          {/* Card 3: IA Assistente */}
          <div onClick={toggleAIChat} className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl shadow-lg shadow-purple-200/50 p-6 text-white relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Sparkles size={24} className="text-white" />
            </div>

            <h3 className="font-bold text-lg mb-2">IA Assistente</h3>
            <p className="text-purple-50 text-sm mb-6 leading-relaxed">
              Resumos automáticos e sugestões de perguntas baseados em IA.
            </p>

            <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10">
              Clique para conversar
            </div>

            <div className="absolute bottom-4 right-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MessageSquare size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientsView = () => {
  const { patients, addPatient, deletePatient } = useContext(AppContext);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', birthDate: '', phone: '', email: '', guardian: '', observations: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.phone) {
      addPatient({ ...formData, id: generateId(), createdAt: new Date().toISOString(), status: 'Ativo' } as Patient);
      setIsFormOpen(false);
      setFormData({ name: '', birthDate: '', phone: '', email: '', guardian: '', observations: '' });
    }
  };

  if (isFormOpen) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setIsFormOpen(false)} className="mb-6 flex items-center text-slate-500 hover:text-teal-600 text-sm font-medium transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Voltar
        </button>
        <Card title="Novo Paciente">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nome Completo" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
              <Input label="Data de Nascimento" type="date" value={formData.birthDate} onChange={(e: any) => setFormData({ ...formData, birthDate: e.target.value })} />
              <Input label="Telefone" value={formData.phone} onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} />
              <Input label="Email" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
              <Input label="Responsável (se menor)" value={formData.guardian} onChange={(e: any) => setFormData({ ...formData, guardian: e.target.value })} />
            </div>
            <TextArea label="Observações" value={formData.observations} onChange={(e: any) => setFormData({ ...formData, observations: e.target.value })} />
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="submit">Salvar Paciente</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><Users size={24} /></div>
            <h2 className="text-2xl font-bold text-slate-800">Pacientes</h2>
          </div>
          <p className="text-slate-500">{patients.length} pacientes cadastrados</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}><Plus size={18} /> Novo Paciente</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nome, email ou telefone..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 outline-none" />
        </div>
        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 flex items-center gap-2 cursor-pointer hover:bg-slate-50">
            Todos <ChevronDown size={14} />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1">
            <button className="p-1.5 rounded-lg bg-slate-100 text-slate-700"><Grid size={16} /></button>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"><List size={16} /></button>
          </div>
        </div>
      </div>

      {patients.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum paciente" description="Cadastre seu primeiro paciente para começar." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
              <button onClick={() => deletePatient(p.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl border-2 border-white shadow-sm">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{p.name}</h3>
                  <p className="text-sm text-slate-500 mb-1">{p.email || 'Sem email'}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                    Ativo
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {p.phone}</div>
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {p.birthDate || 'N/A'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ScheduleView = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><Calendar size={24} /></div>
            <h2 className="text-2xl font-bold text-slate-800">Agenda</h2>
          </div>
          <p className="text-slate-500">2 de fevereiro - 8 de fevereiro de 2026</p>
        </div>
        <Button><Plus size={18} /> Novo Agendamento</Button>
      </div>

      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200">
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft size={18} /></button>
          <button className="px-4 py-1.5 bg-slate-50 rounded-lg font-medium text-slate-700 text-sm">Hoje</button>
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight size={18} /></button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Todos</span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-8 border-b border-slate-200 divide-x divide-slate-100">
          <div className="p-4"></div>
          {['SEGUNDA 2', 'TERÇA 3', 'QUARTA 4', 'QUINTA 5', 'SEXTA 6', 'SÁBADO 7', 'DOMINGO 8'].map((d, i) => (
            <div key={i} className={`p-4 text-center ${i >= 5 ? 'bg-teal-50/30' : ''}`}>
              <div className="text-xs font-semibold text-slate-400 mb-1">{d.split(' ')[0]}</div>
              <div className={`text-xl font-bold ${i === 5 ? 'text-teal-600' : 'text-slate-800'}`}>{d.split(' ')[1]}</div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'].map(time => (
            <div key={time} className="grid grid-cols-8 divide-x divide-slate-100 min-h-[80px]">
              <div className="p-3 text-xs font-medium text-slate-400 text-right">{time}</div>
              {[...Array(7)].map((_, i) => <div key={i} className="relative group hover:bg-slate-50/50 transition-colors"></div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RecordsView = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><FileBadge size={24} /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Prontuários</h2>
          <p className="text-slate-500">0 registros encontrados</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por paciente ou conteúdo..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 outline-none" />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2 hover:bg-slate-50">
            <Filter size={16} /> Todos os tipos <ChevronDown size={14} />
          </button>
          <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2 hover:bg-slate-50">
            <Calendar size={16} /> Todo período <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <EmptyState icon={FileText} title="Nenhum registro encontrado" description="Os prontuários dos seus pacientes aparecerão aqui" />
    </div>
  );
};

const FinanceView = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><CreditCard size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
            <p className="text-slate-500">janeiro de 2026</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
          <Download size={16} /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Recebido</p>
            <h3 className="text-2xl font-bold text-slate-800">R$ 0,00</h3>
          </div>
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><DollarSign size={20} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">A Receber</p>
            <h3 className="text-2xl font-bold text-slate-800">R$ 0,00</h3>
          </div>
          <div className="bg-amber-100 text-amber-600 p-2 rounded-lg"><Clock size={20} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cancelamentos</p>
            <h3 className="text-2xl font-bold text-slate-800">R$ 0,00</h3>
          </div>
          <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><XCircle size={20} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Atendimentos Pagos</p>
            <h3 className="text-2xl font-bold text-slate-800">0</h3>
          </div>
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><CheckCircle2 size={20} /></div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Movimentações</h3>
        <div className="flex gap-4 mb-4">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium flex gap-2 items-center"><Calendar size={16} /> fevereiro de 2026 <ChevronDown size={14} /></button>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium flex gap-2 items-center"><Filter size={16} /> Todos <ChevronDown size={14} /></button>
        </div>
        <EmptyState icon={CreditCard} title="Nenhuma movimentação" description="As movimentações financeiras aparecerão aqui" />
      </div>
    </div>
  );
};

const MessagesView = () => {
  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><MessageSquare size={24} /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mensagens</h2>
          <p className="text-slate-500">Comunicação segura com pacientes</p>
        </div>
      </div>

      <div className="flex h-full gap-6">
        <div className="w-80 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Buscar paciente..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-white">P</div>
              <div>
                <p className="text-sm font-bold text-slate-800">Paizão</p>
                <p className="text-xs text-slate-500">(19) 98814-6164</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center">
          <EmptyState icon={MessageSquare} title="Selecione uma conversa" description="Escolha um paciente na lista para iniciar ou continuar uma conversa" />
        </div>
      </div>
    </div>
  );
};

const ProfessionalView = () => {
  const { professionals, addProfessional, deleteProfessional } = useContext(AppContext);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dados Básicos');
  const [formData, setFormData] = useState<Partial<Professional>>({
    name: '', profession: 'Medico', cpf: '', phone: '', email: '', specialty: '',
    bio: '', council_type: 'CRM', registration_number: '', registration_state: 'SP',
    office_address: '', therapeutic_approaches: ''
  });

  const councils = ['CRM', 'CRP', 'CRN', 'CREFONO', 'CREFITO', 'Outro'];
  const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cpf) {
      alert("Nome e CPF são obrigatórios");
      return;
    }

    // Simple Validation
    if (!validateCPF(formData.cpf || '')) {
      alert("CPF inválido");
      return;
    }

    addProfessional({
      ...formData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: 'Ativo'
    } as any);
    setIsFormOpen(false);
    setFormData({
      name: '', profession: 'Medico', cpf: '', phone: '', email: '', specialty: '',
      bio: '', council_type: 'CRM', registration_number: '', registration_state: 'SP',
      office_address: '', therapeutic_approaches: ''
    });
    setActiveTab('Dados Básicos');
  };

  if (isFormOpen) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <button onClick={() => setIsFormOpen(false)} className="mb-6 flex items-center text-slate-500 hover:text-teal-600 text-sm font-medium transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Voltar
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">Novo Profissional</h3>
            <button onClick={() => setIsFormOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
          </div>

          <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-2">
            {['Dados Básicos', 'Profissional', 'Configurações'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {activeTab === 'Dados Básicos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-teal-400 hover:text-teal-500 transition-all">
                    <div className="bg-white p-2 rounded-full shadow-sm mb-1"><Users size={20} /></div>
                    <span className="text-xs font-medium">Carregar foto</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 mb-1">Foto de Perfil</p>
                    <p className="text-xs text-slate-500">Recomendado: 400x400px, JPG ou PNG. Máx 2MB.</p>
                  </div>
                </div>

                <Input
                  label="Nome Completo *"
                  value={formData.name}
                  onChange={(e: any) => handleInputChange('name', e.target.value)}
                  placeholder="Nome completo do profissional"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="E-mail"
                    value={formData.email}
                    onChange={(e: any) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                  <Input
                    label="Telefone"
                    value={formData.phone}
                    onChange={(e: any) => handleInputChange('phone', formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="CPF *"
                    value={formData.cpf}
                    onChange={(e: any) => handleInputChange('cpf', formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                  <Input
                    label="Data de Nascimento"
                    type="date"
                  />
                </div>

                <TextArea
                  label="Biografia / Apresentação"
                  value={formData.bio}
                  onChange={(e: any) => handleInputChange('bio', e.target.value)}
                  placeholder="Breve apresentação do profissional..."
                />
              </div>
            )}

            {activeTab === 'Profissional' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Profissão *"
                    value={formData.profession}
                    onChange={(e: any) => handleInputChange('profession', e.target.value)}
                    options={<>
                      <option value="Medico">Médico</option>
                      <option value="Psicologo">Psicólogo</option>
                      <option value="Psicopedagogo">Psicopedagogo</option>
                      <option value="Fonoaudiologo">Fonoaudiólogo</option>
                      <option value="Assistente Social">Assistente Social</option>
                      <option value="Outro">Outro</option>
                    </>}
                  />
                  <Input
                    label="Especialidade"
                    value={formData.specialty}
                    onChange={(e: any) => handleInputChange('specialty', e.target.value)}
                    placeholder="Ex: Neuropsicologia, Pediatria..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Conselho *"
                    value={formData.council_type}
                    onChange={(e: any) => handleInputChange('council_type', e.target.value)}
                    options={councils.map(c => <option key={c} value={c}>{c}</option>)}
                  />
                  <Input
                    label="Número do Conselho"
                    value={formData.registration_number}
                    onChange={(e: any) => handleInputChange('registration_number', e.target.value)}
                    placeholder="000000"
                  />
                  <Select
                    label="UF"
                    value={formData.registration_state}
                    onChange={(e: any) => handleInputChange('registration_state', e.target.value)}
                    options={states.map(s => <option key={s} value={s}>{s}</option>)}
                  />
                </div>

                <TextArea
                  label="Abordagens Terapêuticas"
                  value={formData.therapeutic_approaches}
                  onChange={(e: any) => handleInputChange('therapeutic_approaches', e.target.value)}
                  placeholder="Ex: TCC, Psicanálise, ABA..."
                />

                <Input
                  label="Endereço do Consultório"
                  value={formData.office_address}
                  onChange={(e: any) => handleInputChange('office_address', e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>
            )}

            {activeTab === 'Configurações' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-2">Acesso ao Sistema</h4>
                  <div className="flex gap-4 items-center">
                    <input type="checkbox" checked readOnly className="w-4 h-4 text-teal-600 rounded" />
                    <span className="text-sm text-slate-600">Enviar convite por e-mail para definição de senha</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-slate-100 mt-6 gap-3">
              <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Profissional</Button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><UserCog size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Profissionais</h2>
            <p className="text-slate-500">Gerencie os profissionais cadastrados na plataforma</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 flex gap-2 items-center hover:bg-slate-50"><Download size={16} /> Exportar PDF</button>
          <Button onClick={() => setIsFormOpen(true)}><Plus size={16} /> Novo Profissional</Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nome, email ou registro..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none" />
        </div>
        <div className="w-48 relative">
          <select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg appearance-none text-slate-600 text-sm">
            <option>Todos os status</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400" />
        </div>
        <div className="w-48 relative">
          <select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg appearance-none text-slate-600 text-sm">
            <option>Todas especialidades</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-800">{professionals.length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Profissionais</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-emerald-600">{professionals.filter(p => p.status === 'Ativo').length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ativos</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-rose-600">{professionals.filter(p => p.status === 'Inativo').length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inativos</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-amber-600">{professionals.filter(p => p.status === 'Férias').length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Férias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {professionals.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 relative group hover:shadow-md transition-all">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              <img src={`https://ui-avatars.com/api/?name=${p.name}&background=random`} alt={p.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg">{p.name}</h3>
              <p className="text-slate-500 text-sm mb-1">{p.specialty}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> {p.council_type} {p.registration_number}/{p.registration_state}</span>
              </div>
              <div className="space-y-1 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {p.email}</div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {p.phone}</div>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${p.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {p.status}
                </span>
                <span className="px-2 py-1 bg-white text-slate-600 rounded text-xs font-medium border border-slate-200 flex items-center gap-1"><Video size={10} /> Online</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsView = () => {
  const [activeTab, setActiveTab] = useState('Geral');

  const tabs = ['Geral', 'Segurança', 'Notificações', 'LGPD', 'Teleatendimento'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><Settings size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
            <p className="text-slate-500">Gerencie as configurações do sistema</p>
          </div>
        </div>
        <Button><CheckCircle2 size={16} /> Salvar alterações</Button>
      </div>

      <div className="bg-white rounded-xl p-1 border border-slate-200 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-800 border border-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        {activeTab === 'Geral' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Informações da Clínica</h3>
            <p className="text-sm text-slate-500 -mt-4 mb-6">Configurações gerais do sistema</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome da Clínica" defaultValue="Instituto Pramar" />
              <Input label="E-mail de Contato" defaultValue="licitadigitaltech@gmail.com" />
              <Input label="Telefone" defaultValue="19988146166" />
            </div>
          </div>
        )}
        {activeTab === 'Segurança' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Configurações de Segurança</h3>
            <p className="text-sm text-slate-500 -mt-4 mb-6">Controle de acesso e autenticação</p>
            <div className="max-w-2xl space-y-6">
              <div className="flex justify-between items-center py-4 border-b border-slate-100">
                <div>
                  <p className="font-medium text-slate-700">Timeout de Sessão</p>
                  <p className="text-xs text-slate-500">Tempo de inatividade antes do logout automático</p>
                </div>
                <select className="bg-white border border-slate-200 rounded-lg text-sm p-2"><option>30 minutos</option></select>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-slate-100">
                <div>
                  <p className="font-medium text-slate-700">Autenticação em duas etapas (MFA)</p>
                  <p className="text-xs text-slate-500">Exigir verificação adicional no login</p>
                </div>
                <div className="w-11 h-6 bg-slate-200 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lista de IPs autorizados</label>
                <p className="text-xs text-slate-500 mb-2">Restrinja o acesso a IPs específicos (um por linha)</p>
                <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm h-24" defaultValue="192.168.1.1&#10;10.0.0.1"></textarea>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Notificações' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Lembretes de Consulta</h3>
            <p className="text-sm text-slate-500 -mt-4 mb-6">Configure os lembretes automáticos para pacientes</p>
            <div className="space-y-4 max-w-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700">Lembretes por E-mail</p>
                  <p className="text-xs text-slate-500">Enviar lembretes de consulta por e-mail</p>
                </div>
                <div className="w-11 h-6 bg-teal-600 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div></div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700">Lembretes por SMS/WhatsApp</p>
                  <p className="text-xs text-slate-500">Enviar lembretes via mensagem de texto</p>
                </div>
                <div className="w-11 h-6 bg-slate-200 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div></div>
              </div>
              <div className="pt-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-slate-700">Antecedência do Lembrete</p>
                  <select className="bg-white border border-slate-200 rounded-lg text-sm p-2"><option>24 horas</option></select>
                </div>
                <p className="text-xs text-slate-500 mt-1">Quantas horas antes da consulta enviar o lembrete</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'LGPD' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Conformidade LGPD</h3>
            <p className="text-sm text-slate-500 -mt-4 mb-6">Configurações de proteção de dados pessoais</p>
            <div className="max-w-2xl space-y-6">
              <div className="flex justify-between items-center">
                <p className="font-medium text-slate-700">Retenção de Dados</p>
                <select className="bg-white border border-slate-200 rounded-lg text-sm p-2"><option>5 anos</option></select>
              </div>
              <p className="text-xs text-slate-500 -mt-4">Tempo mínimo de retenção de prontuários (CFP: 5 anos)</p>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div>
                  <p className="font-medium text-slate-700">Anonimização na Exclusão</p>
                  <p className="text-xs text-slate-500">Anonimizar dados ao invés de excluir completamente</p>
                </div>
                <div className="w-11 h-6 bg-teal-600 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div></div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div>
                  <p className="font-medium text-slate-700">Validade do Consentimento</p>
                  <p className="text-xs text-slate-500">Solicitar renovação do consentimento LGPD periodicamente</p>
                </div>
                <select className="bg-white border border-slate-200 rounded-lg text-sm p-2"><option>1 ano</option></select>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-6">
                <h4 className="flex items-center gap-2 font-bold text-emerald-800 text-sm mb-2"><ShieldCheck size={16} /> Direitos do Titular</h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Os pacientes podem solicitar acesso, correção, portabilidade ou exclusão de seus dados a qualquer momento, conforme previsto na LGPD. Solicitações são processadas através do menu "Pacientes".
                </p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Teleatendimento' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Configurações de Teleatendimento</h3>
            <p className="text-sm text-slate-500 -mt-4 mb-6">Parâmetros para consultas online (CFP)</p>

            <div className="max-w-2xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700">Duração Padrão da Sessão</p>
                  <p className="text-xs text-slate-500">Tempo padrão para agendamentos</p>
                </div>
                <select className="bg-white border border-slate-200 rounded-lg text-sm p-2"><option>50 minutos</option></select>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div>
                  <p className="font-medium text-slate-700">Permitir Gravação de Sessões</p>
                  <p className="text-xs text-slate-500">Habilitar opção de gravar consultas (requer consentimento)</p>
                </div>
                <div className="w-11 h-6 bg-slate-200 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div></div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4 rounded-r-xl">
                <h4 className="flex items-center gap-2 font-bold text-blue-800 text-sm mb-2"><FileText size={16} /> Conformidade CFP</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  O teleatendimento segue as resoluções do Conselho Federal de Psicologia. A gravação de sessões só é permitida com consentimento formal do paciente e deve ser armazenada com segurança adequada.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Layout & Navigation (SIDEBAR)

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { currentView, navigateTo, toggleAIChat } = useContext(AppContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ view, label, icon: Icon }: any) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => { navigateTo(view); setIsMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
          ${active
            ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
      >
        <Icon size={20} className={active ? 'text-teal-600' : 'text-slate-400'} />
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex text-slate-800">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3 text-teal-600">
              <div className="bg-gradient-to-br from-teal-500 to-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200">
                <HeartPulse size={24} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-800 leading-tight">Instituto Pramar</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Atendimento Multidisciplinar</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-8 overflow-y-auto py-4 custom-scrollbar">
            <div>
              <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Menu Principal</p>
              <div className="space-y-1">
                <NavItem view="dashboard" label="Dashboard" icon={LayoutDashboard} />
                <NavItem view="patients" label="Pacientes" icon={Users} />
                <NavItem view="schedule" label="Agenda" icon={Calendar} />
                <NavItem view="records" label="Prontuários" icon={ClipboardList} />
                <NavItem view="finance" label="Financeiro" icon={Wallet} />
                <NavItem view="messages" label="Mensagens" icon={MessageSquare} />
              </div>
            </div>

            <div>
              <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Administração</p>
              <div className="space-y-1">
                <NavItem view="professionals" label="Profissionais" icon={UserCog} />
                <NavItem view="settings" label="Configurações" icon={Settings} />
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs justify-center font-medium">
              <ShieldCheck size={14} /> Protegido por LGPD
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-72 min-h-screen transition-all duration-300">

        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar pacientes, agendamentos..."
                className="w-full bg-slate-50 border border-transparent focus:bg-white focus:border-teal-200 focus:ring-4 focus:ring-teal-500/10 rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all text-sm font-medium text-slate-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shadow-sm">
                MP
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-slate-700 leading-none">Michel</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Admin</p>
                  <ChevronDown size={10} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden relative">
          {children}

          {/* AI Chat Widget */}
          <AIChatWidget />

          {/* Floating Action Buttons */}
          <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40">
            {/* AI Chat FAB */}
            <button onClick={toggleAIChat} className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-full shadow-xl shadow-purple-500/30 flex items-center justify-center transition-transform hover:scale-110 border border-white/10">
              <Bot size={28} />
            </button>

            {/* Messages FAB */}
            <button onClick={() => navigateTo('messages')} className="w-12 h-12 bg-white text-blue-600 hover:bg-blue-50 rounded-full shadow-lg shadow-slate-200 flex items-center justify-center transition-transform hover:scale-110 border border-blue-100">
              <MessageSquare size={20} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

const MainContent = () => {
  const { currentView } = useContext(AppContext);
  switch (currentView) {
    case 'dashboard': return <Dashboard />;
    case 'professionals': return <ProfessionalView />;
    case 'patients': return <PatientsView />;
    case 'consultations': return <Dashboard />; // Reuse Dashboard for now as it has the stats
    case 'schedule': return <ScheduleView />;
    case 'records': return <RecordsView />;
    case 'finance': return <FinanceView />;
    case 'messages': return <MessagesView />;
    case 'settings': return <SettingsView />;
    default: return <Dashboard />;
  }
};

const App = () => {
  return (
    <AppProvider>
      <Layout>
        <MainContent />
      </Layout>
    </AppProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);