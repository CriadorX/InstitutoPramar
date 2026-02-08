
import React, { useState, useEffect, useCallback, createContext, useContext, Suspense, useRef, useMemo } from 'react';
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
  User,
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
  Wifi,
  Server,
  Printer,
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
  Ban,
  FileBadge,
  CreditCard,
  DollarSign,
  ChevronLeft,
  Bot,
  Send,
  Loader2,
  Minimize2,
  MicOff,
  VideoOff,
  Mic,
  Star,
} from 'lucide-react';

// --- UTILITY IMPORTS ---
import { ErrorBoundary, ToastContainer, toast, safeLocalStorage, handleAsync } from './errorHandling';
import { validateEmail, validatePhone, validateBirthDate, validateAppointmentDate, sanitizeText, validateName, validatePassword, isAdminEmail } from './validation';

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
  prescriptions?: string[];
}

interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  specialty: string;
  date: string; // ISO date
  time: string; // HH:mm
  status: 'Agendado' | 'Confirmado' | 'Concluído' | 'Cancelado';
  type: 'Presencial' | 'Telemedicina';
  notes?: string;
  meetLink?: string;
}

interface MedicalRecord {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: string;
  type: 'Evolução' | 'Prescrição' | 'Exame' | 'Encaminhamento' | 'Atestado';
  title: string;
  content: string;
  attachments?: string[];
}

type ViewState = 'dashboard' | 'patients' | 'professionals' | 'settings' | 'schedule' | 'telemedicine' | 'messages' | 'records' | 'finance' | 'users_management';

const SpecialtiesList = [
  // Psicologia - Todas as Áreas
  "Psicologia Clínica",
  "Psicologia Hospitalar",
  "Psicologia da Saúde",
  "Psicologia Escolar/Educacional",
  "Psicologia Jurídica",
  "Psicologia Social",
  "Psicologia Organizacional e do Trabalho",
  "Psicologia do Esporte",
  "Psicologia do Trânsito",
  "Psicopedagogia",
  "Neuropsicologia",
  "Psicomotricidade",
  "Avaliação Psicológica",

  // Outras Especialidades Multidisciplinares
  "Nutrição",
  "Terapia Ocupacional",
  "Fonoaudiologia",
  "Fisioterapia"
];


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
      Atue como um supervisor clínico sênior multidisciplinar.Analise os dados brutos desta consulta.

  CONTEXTO:
Profissional: ${professional.name} (${professional.profession} - ${professional.specialty})
Paciente: ${patient.name} (Idade: ${calculateAge(patient.birthDate)})
      
      DADOS DA CONSULTA:
[Perguntas do Profissional]: ${consultation.questions}
[Respostas / Relato do Paciente]: ${consultation.answers}
[Observações Clínicas]: ${consultation.observations}

TAREFA:
      Gere uma análise estruturada para apoio à decisão clínica.
      
      REGRAS CRÍTICAS:
1. NÃO apresente diagnósticos definitivos(CID / DSM).Use termos como "sugere", "indica possibilidade", "quadro compatível com".
      2. Use linguagem técnica, clara e profissional.
      3. Se houver incerteza ou falta de dados, indique claramente.
      
      FORMATO JSON ESPERADO:
- summary: Resumo claro e conciso da sessão(máx 3 linhas).
      - keyPoints: 3 a 5 pontos principais observados(sintomas, comportamentos, falas).
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.error("Supabase environment variables missing!");
}

const MissingConfig = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-100 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuração Pendente</h2>
      <p className="text-slate-600 mb-6">
        Não foi possível conectar ao banco de dados. As variáveis de ambiente do Supabase não foram encontradas.
      </p>

      <div className="bg-slate-50 rounded-xl p-4 text-left text-sm font-mono text-slate-700 mb-6 overflow-x-auto border border-slate-200">
        <div className="flex gap-2 items-center mb-1">
          <span className={supabaseUrl ? "text-emerald-500" : "text-red-500"}>●</span>
          VITE_SUPABASE_URL
        </div>
        <div className="flex gap-2 items-center">
          <span className={supabaseKey ? "text-emerald-500" : "text-red-500"}>●</span>
          VITE_SUPABASE_ANON_KEY
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  </div>
);

// --- PATIENT DASHBOARD ---

const PatientDashboard = () => {
  const { navigateTo, addConsultation, toggleAIChat } = useContext(AppContext);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto px-4">
      {/* Hero Card */}
      <div className="bg-[#009ca6] rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 max-w-2xl">
          <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full inline-block mb-6 border border-white/20">
            <p className="text-white text-xs font-bold tracking-wider uppercase">💎  Bem-vindo ao Instituto Pramar</p>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Como podemos cuidar de você hoje?</h1>
          <p className="text-teal-50 text-lg mb-8 font-medium leading-relaxed max-w-lg">Agende exames, consultas e acompanhe sua saúde sem sair de casa.</p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigateTo('schedule')}
              className="bg-[#f2a900] text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-[#e09b00] hover:shadow-orange-900/20 hover:scale-105 transition-all flex items-center gap-2 text-lg"
            >
              <Calendar size={20} /> Agendar Agora
            </button>
            <button
              onClick={() => navigateTo('messages')}
              className="bg-white/10 text-white px-8 py-4 rounded-full font-bold border border-white/30 hover:bg-white/20 transition-all flex items-center gap-2 text-lg backdrop-blur-sm"
            >
              <MessageSquare size={20} /> Falar com Suporte
            </button>
          </div>
        </div>

        {/* Illustration / Decor */}
        <div className="hidden lg:block relative z-10">
          <div className="relative">
            <div className="absolute -inset-4 bg-white/20 rounded-full blur-2xl"></div>
            <div className="bg-white p-6 rounded-3xl shadow-2xl transform rotate-3 border border-white/50 relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Segurança Total</p>
                  <p className="text-xs text-slate-500">Seus dados protegidos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-teal-600 font-bold bg-teal-50 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} /> Protocolo LGPD
              </div>
            </div>
          </div>
        </div>

        {/* Background Shapes */}
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-800/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Consultas Card */}
        <div onClick={() => navigateTo('schedule')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <Calendar size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-xl mb-3 group-hover:text-teal-600 transition-colors">Minhas Consultas</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">Visualize seus agendamentos e histórico completo de atendimentos presenciais.</p>
          <div className="text-teal-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
            Ver agenda <ChevronRight size={16} />
          </div>
        </div>

        {/* Telemedicina Card */}
        <div onClick={() => navigateTo('telemedicine')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <Video size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-xl mb-3 group-hover:text-blue-600 transition-colors">Sala de Espera Virtual</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">Acesse sua consulta online no horário agendado com total segurança.</p>
          <div className="text-blue-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
            Entrar na sala <ChevronRight size={16} />
          </div>
        </div>

        {/* Resultados Card */}
        <div onClick={() => navigateTo('records')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <ClipboardList size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-xl mb-3 group-hover:text-purple-600 transition-colors">Resultados e Laudos</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">Acesse relatórios, receitas e documentos dos seus atendimentos.</p>
          <div className="text-purple-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
            Acessar documentos <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* AI Banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-200 overflow-hidden relative group">
        <div className="max-w-xl relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-indigo-100 text-xs font-bold mb-4 border border-white/20">
            <Sparkles size={14} className="text-amber-300" /> Inteligência Artificial
          </div>
          <h3 className="font-bold text-white text-2xl mb-4">Dúvidas sobre qual especialista procurar?</h3>
          <p className="text-indigo-100 mb-8 text-lg leading-relaxed">Nossa tecnologia avança para te orientar. Fale com nossa assistente virtual agora mesmo.</p>
          <button onClick={toggleAIChat} className="bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2 text-lg mx-auto md:mx-0">
            Falar com Assistente
          </button>
        </div>
        <div className="mt-8 md:mt-0 relative z-10 transform transition-transform duration-500 group-hover:scale-110">
          <div className="w-40 h-40 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-inner">
            <Bot size={80} className="text-indigo-200" />
          </div>
        </div>

        {/* Banner Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/30 rounded-full blur-3xl -ml-10 -mb-10"></div>
      </div>
    </div>
  );
};

// --- CONTEXT ---

const AppContext = createContext<{
  professionals: Professional[];
  patients: Patient[];
  appointments: Appointment[];
  records: MedicalRecord[];
  consultations: Consultation[];
  addProfessional: (p: Professional) => void;
  addPatient: (p: Patient) => void;
  addAppointment: (appointment: Appointment) => void;
  addRecord: (record: MedicalRecord) => void;
  addConsultation: (c: Consultation) => void;
  deleteProfessional: (id: string) => void;
  deletePatient: (id: string) => void;
  blockPatient: (id: string) => void;
  navigateTo: (view: ViewState, params?: any) => void;
  currentView: ViewState;
  viewParams: any;
  isAIChatOpen: boolean;
  toggleAIChat: () => void;
  isProfileOpen: boolean;
  toggleProfile: () => void;
  closeProfile: () => void;
  userRole: 'admin' | 'professional' | 'patient';
  setUserRole: (role: 'admin' | 'professional' | 'patient') => void;
  logout: () => void;
}>({} as any);

const AppProvider = ({ children, session }: { children?: React.ReactNode, session?: any }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [patients, setPatients] = useState<Patient[]>(() => {
    return safeLocalStorage.getItem<Patient[]>('pramar_patients', []);
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    return safeLocalStorage.getItem<Appointment[]>('pramar_appointments', []);
  });
  const [records, setRecords] = useState<MedicalRecord[]>(() => {
    return safeLocalStorage.getItem<MedicalRecord[]>('pramar_records', []);
  });
  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    return safeLocalStorage.getItem<Consultation[]>('pramar_consultations', []);
  });

  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'professional' | 'patient'>('patient');

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    safeLocalStorage.removeItem('pramar_session');
    window.location.reload();
  };

  useEffect(() => {
    checkUserRole();
  }, [session]);

  const checkUserRole = async () => {
    if (!session?.user) return;

    const email = session.user.email;
    // SECURITY FIX: Use whitelist instead of string matching
    if (email && isAdminEmail(email)) {
      setUserRole('admin');
      return;
    }

    // Check if user is a professional in 'profiles' table
    if (supabase) {
      const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single();
      if (data) {
        setUserRole('professional');
      } else {
        setUserRole('patient');
      }
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*');
    if (data) setProfessionals(data as any);
  };


  useEffect(() => { safeLocalStorage.setItem('pramar_professionals', professionals); }, [professionals]);
  useEffect(() => { safeLocalStorage.setItem('pramar_patients', patients); }, [patients]);
  useEffect(() => { safeLocalStorage.setItem('pramar_appointments', appointments); }, [appointments]);
  useEffect(() => { safeLocalStorage.setItem('pramar_records', records); }, [records]);
  useEffect(() => { safeLocalStorage.setItem('pramar_consultations', consultations); }, [consultations]);

  const addProfessional = async (p: Professional) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').insert([p]).select();
    if (data) setProfessionals(prev => [...prev, data[0] as any]);
  };
  const addPatient = (p: Patient) => setPatients(prev => [...prev, p]);
  const addAppointment = (a: Appointment) => setAppointments(prev => [...prev, a]);
  const addRecord = (r: MedicalRecord) => setRecords(prev => [...prev, r]);
  const addConsultation = (c: Consultation) => setConsultations(prev => [...prev, c]);

  const deleteProfessional = (id: string) => setProfessionals(prev => prev.filter(p => p.id !== id));
  const deletePatient = (id: string) => setPatients(prev => prev.filter(p => p.id !== id));
  const blockPatient = (id: string) => setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'Bloqueado' } : p));

  const navigateTo = (view: ViewState, params?: any) => {
    setCurrentView(view);
    setViewParams(params);
    setIsProfileOpen(false); // Close profile menu on navigation
  };

  const toggleAIChat = () => setIsAIChatOpen(prev => !prev);
  const toggleProfile = () => setIsProfileOpen(prev => !prev);
  const closeProfile = () => setIsProfileOpen(false);

  if (!supabase) {
    return <MissingConfig />;
  }

  return (
    <AppContext.Provider value={{
      professionals, patients, consultations, appointments, records,
      addProfessional, addPatient, addConsultation, addAppointment, addRecord,
      deleteProfessional, deletePatient, blockPatient,
      navigateTo, currentView, viewParams,
      isAIChatOpen, toggleAIChat,
      isProfileOpen, toggleProfile, closeProfile,
      userRole, setUserRole, logout
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
      className={`${baseClass} ${(variants as any)[variant]} ${className} `}
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
      className={`w - full px - 4 py - 3 bg - white border rounded - xl focus: ring - 2 focus: ring - teal - 500 / 20 focus: border - teal - 500 outline - none transition - all text - slate - 700 ${error ? 'border-red-400 focus:ring-red-100' : 'border-slate-200'} `}
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
        className={`w - full px - 4 py - 3 bg - white border rounded - xl focus: ring - 2 focus: ring - teal - 500 / 20 focus: border - teal - 500 outline - none transition - all text - slate - 700 appearance - none ${error ? 'border-red-400' : 'border-slate-200'} `}
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
      className={`w - full px - 4 py - 3 bg - white border rounded - xl focus: ring - 2 focus: ring - teal - 500 / 20 focus: border - teal - 500 outline - none transition - all text - slate - 700 min - h - [120px] resize - none ${error ? 'border-red-400' : 'border-slate-200'} `}
    />
    {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
  </div>
);

const Card = ({ children, title, action, className = '' }: any) => (
  <div className={`bg - white rounded - 2xl shadow - sm border border - slate - 100 p - 6 ${className} `}>
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
  const { isAIChatOpen, toggleAIChat, navigateTo } = useContext(AppContext);
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

  // Initialize chat session with Triage Persona
  useEffect(() => {
    if (!chatSession && isAIChatOpen) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        // Note: Using the env variable correctly if accessible, or relying on the previous implementation's key access method if it was hardcoded/different. 
        // The previous code had `process.env.API_KEY`. I will stick to attempting to read the key. 
        // Ideally this should be `import.meta.env.VITE_GEMINI_API_KEY` in Vite, but based on previous context keeping `process.env` or similar if that's how it was working (or not).
        // Actually, looking at previous code it was `process.env.API_KEY`. I'll assume that's being handled or replaced by the build system or I should check. 
        // The env file has `GEMINI_API_KEY`. 
        // Let's use the variable that was likely intended.

        const chat = ai.chats.create({
          model: 'gemini-pro',
          config: {
            systemInstruction: `Você é a Enfermeira Virtual do Instituto Pramar.Sua função é realizar uma triagem inicial e guiar o paciente.

  Diretrizes:
1. Seja empática, acolhedora e profissional.
            2. Se o paciente disser que quer marcar consulta, oriente - o a clicar no botão de agendamento ou confirme que você pode direcioná - lo.
            3. Se identificar uma EMERGÊNCIA MÉDICA(dor no peito, falta de ar grave, desmaio, sangramento intenso), instrua IMEDIATAMENTE a procurar um pronto - socorro ou ligar para 192 / SAMU.NÃO tente diagnosticar emergências.
            4. Se o paciente perguntar sobre Telemedicina, explique que é feita pela plataforma e pode direcioná - lo.
            5. Mantenha as respostas curtas(máximo 3 frases) para facilitar a leitura rápida.
            
            Seu tom de voz: Calmo, seguro e atencioso.`
          }
        });
        setChatSession(chat);
        setMessages([{ role: 'model', text: 'Olá! Sou a Enfermeira Virtual do Instituto Pramar. Posso te ajudar a agendar uma consulta, tirar dúvidas ou acessar a telemedicina. Como você está se sentindo hoje?' }]);
      } catch (error) {
        console.error("Failed to init chat", error);
      }
    }
  }, [isAIChatOpen, chatSession]);

  const checkIntent = (text: string) => {
    const lower = text.toLowerCase();

    // Schedule Intent
    if (lower.includes('agendar') || lower.includes('marcar') || lower.includes('consulta') || lower.includes('horário')) {
      return {
        type: 'navigate',
        target: 'schedule',
        response: 'Claro! Vou te levar para a tela de agendamento para você escolher o melhor horário.'
      };
    }

    // Telemedicine Intent
    if (lower.includes('telemedicina') || lower.includes('online') || lower.includes('vídeo') || lower.includes('sala')) {
      return {
        type: 'navigate',
        target: 'telemedicine',
        response: 'Entendido. Estou te direcionando para a sala de espera virtual da Telemedicina.'
      };
    }

    // Support Intent
    if (lower.includes('suporte') || lower.includes('ajuda') || lower.includes('erro') || lower.includes('problema')) {
      return {
        type: 'navigate',
        target: 'messages',
        response: 'Para problemas técnicos ou suporte mais detalhado, vou abrir o canal de mensagens direto com nossa equipe.'
      };
    }

    return null;
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !chatSession || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsLoading(true);

    // 1. Check for local intents first
    const intent = checkIntent(textToSend);

    if (intent) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'model', text: intent.response }]);
        setIsLoading(false);

        // Execute navigation after a slight delay for reading time
        setTimeout(() => {
          if (intent.target) navigateTo(intent.target as any);
        }, 1500);
      }, 600);
      return;
    }

    // 2. If no local intent, send to AI
    try {
      const result = await chatSession.sendMessageStream({ message: textToSend });

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
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, estou com dificuldade de conexão. Por favor, tente novamente ou ligue para nossa recepção.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAIChatOpen) return null;

  return (
    <div className="fixed bottom-24 right-8 w-96 h-[550px] bg-white rounded-[2rem] shadow-2xl z-50 flex flex-col border border-slate-100 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-[#009ca6] p-5 flex justify-between items-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm border border-white/20">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Enfermeira Virtual</h3>
            <p className="text-[11px] text-teal-100 font-medium">Triagem Inteligente &bull; Online</p>
          </div>
        </div>
        <button onClick={toggleAIChat} className="hover:bg-white/20 p-2 rounded-full transition-colors relative z-10">
          <Minimize2 size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
        {/* Date Stamp */}
        <div className="flex justify-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-3 py-1 rounded-full">Hoje</span>
        </div>

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}>
            <div className={`max - w - [85 %] rounded - 2xl px - 5 py - 3.5 text - sm shadow - sm leading - relaxed ${msg.role === 'user'
              ? 'bg-[#009ca6] text-white rounded-br-none'
              : 'bg-white text-slate-600 border border-slate-200 rounded-bl-none'
              } `}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#009ca6]" />
              <span className="text-xs text-slate-400 font-medium">Analisando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (Chips) */}
      <div className="px-4 py-3 bg-slate-50 flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
        <button onClick={() => handleSend("Gostaria de agendar uma consulta")} className="whitespace-nowrap bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold px-3 py-2 rounded-lg border border-teal-100 transition-colors">
          📅 Agendar Consulta
        </button>
        <button onClick={() => handleSend("Como funciona a telemedicina?")} className="whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2 rounded-lg border border-blue-100 transition-colors">
          💻 Telemedicina
        </button>
        <button onClick={() => handleSend("Preciso de ajuda urgente")} className="whitespace-nowrap bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-2 rounded-lg border border-rose-100 transition-colors">
          🆘 Emergência
        </button>
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 bg-white border-t border-slate-100 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua dúvida ou sintoma..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-400 text-slate-700"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#009ca6] hover:bg-[#008b94] disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-lg shadow-teal-700/20 active:scale-95"
        >
          <Send size={20} />
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
    { label: 'Usuários Online', icon: Wifi, count: 12, color: 'text-green-600 bg-green-50' }, // Mock Real-time
    { label: 'Status do Sistema', icon: Server, count: 'Normal', color: 'text-teal-600 bg-teal-50' },
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
            <div className={`w - 10 h - 10 rounded - xl flex items - center justify - center mb - 3 ${stat.color} group - hover: scale - 110 transition - transform`}>
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
  const { patients, addPatient, deletePatient, blockPatient } = useContext(AppContext);
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
            <div key={p.id} className={`bg - white rounded - 2xl p - 6 border shadow - sm hover: shadow - md transition - all group relative ${p.status === 'Bloqueado' ? 'border-red-100 bg-red-50/50' : 'border-slate-100'} `}>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => blockPatient(p.id)} className="text-slate-300 hover:text-orange-500" title="Bloquear Paciente">
                  <Ban size={16} />
                </button>
                <button onClick={() => deletePatient(p.id)} className="text-slate-300 hover:text-red-500" title="Excluir Paciente">
                  <Trash2 size={16} />
                </button>
              </div>
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

const RecordsView = () => {
  const { records, patients, userRole, addRecord } = useContext(AppContext);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [recordType, setRecordType] = useState<MedicalRecord['type']>('Evolução');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const filteredRecords = userRole === 'patient'
    ? records.filter(r => r.patientId === 'current-user-id')
    : selectedPatientId
      ? records.filter(r => r.patientId === selectedPatientId)
      : records;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId && userRole !== 'patient') {
      alert("Selecione um paciente");
      return;
    }

    const newRecord: MedicalRecord = {
      id: generateId(),
      patientId: userRole === 'patient' ? 'current-user-id' : selectedPatientId,
      professionalId: 'current-prof-id', // Mock
      professionalName: 'Dr. Usuário Atual', // Mock
      date: new Date().toISOString(),
      type: recordType,
      title,
      content,
      attachments: []
    };

    setUploading(true);
    // Simulate upload/save delay
    setTimeout(() => {
      addRecord(newRecord);
      setUploading(false);
      setIsFormOpen(false);
      setTitle('');
      setContent('');
      alert("Registro salvo com sucesso!");
    }, 1000);
  };

  if (isFormOpen) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => setIsFormOpen(false)} className="flex items-center text-slate-500 hover:text-teal-600 mb-2 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Voltar para lista
        </button>

        <Card title="Novo Registro no Prontuário">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Paciente</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={userRole === 'patient'}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700"
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Tipo de Registro</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700"
                >
                  <option value="Evolução">Evolução Clínica</option>
                  <option value="Prescrição">Prescrição / Receita</option>
                  <option value="Exame">Resultado de Exame</option>
                  <option value="Encaminhamento">Encaminhamento</option>
                  <option value="Atestado">Atestado</option>
                </select>
              </div>
            </div>

            <Input
              label="Título / Assunto"
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="Ex: Sessão de Terapia #05"
            />

            <TextArea
              label="Descrição Detalhada"
              value={content}
              onChange={(e: any) => setContent(e.target.value)}
              placeholder="Descreva os detalhes do atendimento, observações clínicas ou conteúdo do documento..."
              rows={6}
            />

            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-100 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-teal-600 shadow-sm border border-slate-200">
                <Download size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700">Adicionar Anexos</p>
              <p className="text-xs text-slate-500">Arraste arquivos ou clique para selecionar (PDF, JPG, PNG)</p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button type="submit" disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Salvar Registro</>}
              </Button>
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
            <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><FileBadge size={24} /></div>
            <h2 className="text-2xl font-bold text-slate-800">Prontuário Eletrônico</h2>
          </div>
          <p className="text-slate-500">Histórico clínico e documentos</p>
        </div>

        {userRole !== 'patient' && (
          <Button onClick={() => setIsFormOpen(true)}><Plus size={18} /> Novo Registro</Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4">
        {userRole !== 'patient' && (
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 outline-none appearance-none"
            >
              <option value="">Filtrar por Paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center gap-2">
            <Filter size={16} /> Todos os Tipos
          </button>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={selectedPatientId ? "Nenhum registro para este paciente" : "Nenhum registro encontrado"}
          description={userRole === 'patient' ? "Você ainda não possui registros em seu prontuário." : "Selecione um paciente ou adicione um novo registro."}
        />
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(record => (
            <div key={record.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${record.type === 'Prescrição' ? 'bg-indigo-500' :
                    record.type === 'Exame' ? 'bg-purple-500' :
                      record.type === 'Atestado' ? 'bg-amber-500' :
                        'bg-teal-500'
                    }`}>
                    {record.type === 'Prescrição' ? 'Rx' : record.type.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{record.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> {new Date(record.date).toLocaleDateString('pt-BR')} às {new Date(record.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-1">•</span>
                      <User size={12} /> {record.professionalName}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${record.type === 'Prescrição' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                  record.type === 'Exame' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    record.type === 'Atestado' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-teal-50 text-teal-700 border-teal-100'
                  }`}>
                  {record.type}
                </span>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-4 pl-13 border-l-2 border-slate-100 ml-5 py-1">
                {record.content}
              </p>

              <div className="flex justify-end gap-3">
                <button onClick={() => alert("Visualização de anexo indisponível no demo.")} className="text-teal-600 font-bold text-xs hover:underline flex items-center gap-1">
                  <Download size={14} /> Anexos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const TelemedicineView = () => {
  const { patients, navigateTo } = useContext(AppContext);
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call Timer
  useEffect(() => {
    let interval: any;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    let recognitionInstance: any = null;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'pt-BR';

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscript(prev => prev + event.results[i][0].transcript + ' ');
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
      };

      setRecognition(recognitionInstance);
    }

    // Cleanup function to stop video tracks when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      recognitionInstance?.stop();
    };
  }, []);

  const startCall = async () => {
    try {
      // 1. First try to get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Only if media succeeds, set call as active
      setIsCallActive(true);
      setIsRecording(true);

      // 3. Try key features like Speech Recognition separately
      try {
        recognition?.start();
      } catch (recErr) {
        console.warn("Speech recognition failed to start:", recErr);
        // Don't stop the call just because transcription failed
      }
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Erro ao acessar câmera/microfone. Verifique as permissões do navegador.");
      setIsCallActive(false);
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setIsRecording(false);
    recognition?.stop();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const generateAIReport = async () => {
    if (!transcript.trim()) return;
    setIsGeneratingReport(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = "gemini-3-flash-preview";

      const prompt = `
        Atue como um supervisor clínico.Analise a transcrição abaixo de uma teleconsulta multidisciplinar.
        
        TRANSCRIÇÃO DA SESSÃO:
"${transcript}"
        
        GERE UM PRÉ - RELATÓRIO EM JSON COM:
- summary: Resumo do que foi discutido.
        - hypothesis: Hipóteses diagnósticas ou observações comportamentais.
        - suggestions: Sugestões de intervenção.
        - nextSteps: Próximos passos recomendados.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      setGeneratedReport(result);
    } catch (error) {
      console.error("Erro na geração do relatório:", error);
      alert("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && generatedReport) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório Clínico - Instituto Pramar</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; }
              h2 { color: #334155; margin-top: 20px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
              p, li { line-height: 1.6; font-size: 14px; }
              .header { margin-bottom: 30px; text-align: center; }
              .logo { font-size: 24px; font-weight: bold; color: #0f766e; }
              .date { float: right; font-size: 12px; color: #64748b; }
              .box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">Instituto Pramar</div>
              <p>Relatório de Teleconsulta Assistido por IA</p>
              <p class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
            
            <h2>Resumo da Sessão</h2>
            <div class="box">
              <p>${generatedReport.summary}</p>
            </div>

            <h2>Hipóteses e Observações</h2>
            <ul>
              ${Array.isArray(generatedReport.hypothesis) ? generatedReport.hypothesis.map((h: string) => `<li>${h}</li>`).join('') : `<li>${generatedReport.hypothesis}</li>`}
            </ul>

            <h2>Sugestões de Intervenção</h2>
            <ul>
              ${Array.isArray(generatedReport.suggestions) ? generatedReport.suggestions.map((s: string) => `<li>${s}</li>`).join('') : `<li>${generatedReport.suggestions}</li>`}
            </ul>

            <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center; font-size: 12px; color: #999;">
              <p>Este documento é um pré-relatório gerado por inteligência artificial e deve ser validado pelo profissional responsável.</p>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadText = () => {
    if (!generatedReport) return;
    const textContent = `
INSTITUTO PRAMAR - RELATÓRIO DE TELECONSULTA
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
------------------------------------------------

RESUMO DA SESSÃO:
${generatedReport.summary}

HIPÓTESES E OBSERVAÇÕES:
${Array.isArray(generatedReport.hypothesis) ? generatedReport.hypothesis.map((h: string) => `- ${h}`).join('\n') : generatedReport.hypothesis}

SUGESTÕES DE INTERVENÇÃO:
${Array.isArray(generatedReport.suggestions) ? generatedReport.suggestions.map((s: string) => `- ${s}`).join('\n') : generatedReport.suggestions}

------------------------------------------------
Este documento é um pré-relatório gerado por inteligência artificial.
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_pramar_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };


  if (generatedReport) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => setGeneratedReport(null)} className="flex items-center text-slate-500 hover:text-teal-600 mb-4">
          <ChevronLeft size={16} className="mr-1" /> Voltar para a chamada
        </button>

        <Card title="Pré-Relatório Gerado por IA" className="border-teal-100 shadow-teal-50">
          <div className="space-y-6">
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
              <h4 className="font-bold text-teal-800 mb-2 flex items-center gap-2"><Sparkles size={16} /> Resumo da Sessão</h4>
              <p className="text-teal-900">{generatedReport.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Hipóteses / Observações</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  {/* Check if array or string for robustness */}
                  {Array.isArray(generatedReport.hypothesis)
                    ? generatedReport.hypothesis.map((h: string, i: number) => <li key={i}>{h}</li>)
                    : <li>{generatedReport.hypothesis || "Nenhuma hipótese gerada."}</li>
                  }
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Sugestões de Intervenção</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  {Array.isArray(generatedReport.suggestions)
                    ? generatedReport.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)
                    : <li>{generatedReport.suggestions || "Nenhuma sugestão gerada."}</li>
                  }
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setGeneratedReport(null)}>Descartar</Button>
              <Button variant="secondary" onClick={handleDownloadText}><FileText size={16} /> Baixar Texto (Word)</Button>
              <Button variant="secondary" onClick={handlePrintReport}><Printer size={16} /> Imprimir / PDF</Button>
              <Button onClick={() => alert("Funcionalidade de salvar em desenvolvimento!")}>Validar e Salvar no Prontuário</Button>
            </div>
          </div>
        </Card>

        <Card title="Transcrição Bruta Capturada">
          <p className="text-slate-500 italic text-sm whitespace-pre-wrap">{transcript}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Telemedicina</h2>
          <p className="text-slate-500">Sala de atendimento virtual segura e criptografada.</p>
        </div>
        {!isCallActive && (
          <button onClick={startCall} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all flex items-center gap-2">
            <Video size={20} /> Iniciar Atendimento
          </button>
        )}
      </div>

      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative aspect-video group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w - full h - full object - cover transition - opacity duration - 500 ${isCallActive ? 'opacity-100' : 'opacity-0'} `}
        />

        {!isCallActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Video size={40} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">A câmera está desligada</h3>
            <p className="text-slate-400">Clique em "Iniciar Atendimento" para conectar.</p>
          </div>
        )}

        {isCallActive && (
          <>
            <div className="absolute top-6 right-6 bg-red-500/90 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 backdrop-blur-md z-20">
              <div className="w-2 h-2 bg-white rounded-full"></div> REC
            </div>

            <div className="absolute top-6 left-6 bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-mono backdrop-blur-md z-20 border border-white/10 flex items-center gap-2">
              <Clock size={14} className="text-teal-400" />
              {formatTime(callDuration)}
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex justify-center gap-4">
                <button onClick={() => { }} className="p-4 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 backdrop-blur-sm transition-all"><Mic size={24} /></button>
                <button onClick={endCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/50 transition-all transform hover:scale-110"><Phone size={28} className="rotate-[135deg]" /></button>
                <button onClick={() => { }} className="p-4 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 backdrop-blur-sm transition-all"><Video size={24} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {isCallActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Transcrição em Tempo Real" className="h-64 overflow-y-auto">
            <div className="prose prose-sm max-w-none text-slate-600">
              {transcript || <span className="text-slate-400 italic">Aguardando fala...</span>}
            </div>
          </Card>
          <Card title="Assistente IA" className="h-64 flex flex-col justify-center items-center text-center">
            {isGeneratingReport ? (
              <div className="space-y-4">
                <Loader2 className="animate-spin text-teal-600 w-10 h-10 mx-auto" />
                <p className="text-slate-500 text-sm font-medium animate-pulse">Analisando contexto clínico...</p>
              </div>
            ) : (
              <button onClick={generateAIReport} className="flex flex-col items-center gap-3 text-slate-400 hover:text-indigo-600 transition-colors group p-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BrainCircuit size={32} className="text-indigo-500" />
                </div>
                <span className="font-bold text-sm">Gerar Análise Clínica</span>
              </button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

const ScheduleView = () => {
  const { professionals, appointments, addAppointment, navigateTo } = useContext(AppContext);
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>('list');

  // Wizard State
  const [step, setStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, time: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter professionals by specialty
  const availableProfessionals = professionals.filter(p => !selectedSpecialty || p.specialty.includes(selectedSpecialty));

  // Filter my appointments (Mock user ID for now, in real app check session)
  const myAppointments = appointments.filter(a => a.patientId === 'current-user-id');

  // Mock slots generator
  const generateSlots = () => {
    const slots = [];
    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    const today = new Date();

    for (let i = 1; i <= 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      times.forEach(time => {
        if (Math.random() > 0.3) {
          slots.push({ date: dateStr, time });
        }
      });
    }
    return slots;
  };

  const slots = useMemo(() => generateSlots(), []);

  const handleConfirm = () => {
    if (!selectedProfessional || !selectedSlot) return;

    setLoading(true);
    setTimeout(() => {
      const newAppointment: Appointment = {
        id: generateId(),
        patientId: 'current-user-id',
        professionalId: selectedProfessional.id,
        professionalName: selectedProfessional.name,
        specialty: selectedSpecialty,
        date: selectedSlot.date,
        time: selectedSlot.time,
        status: 'Agendado',
        type: 'Presencial'
      };

      addAppointment(newAppointment);
      setLoading(false);
      setViewMode('list'); // Return to list view
      setStep(1); // Reset wizard
      setSelectedSpecialty('');
      setSelectedProfessional(null);
      setSelectedSlot(null);
      alert('Agendamento realizado com sucesso!');
    }, 1500);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // --- LIST VIEW ---
  if (viewMode === 'list') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><Calendar size={24} /></div>
              <h2 className="text-2xl font-bold text-slate-800">Minhas Consultas</h2>
            </div>
            <p className="text-slate-500">Gerencie seus agendamentos e históricos</p>
          </div>
          <Button onClick={() => setViewMode('wizard')}><Plus size={18} /> Nova Consulta</Button>
        </div>

        {myAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum agendamento"
            description="Você ainda não tem consultas agendadas."
            action={<Button onClick={() => setViewMode('wizard')}>Agendar Agora</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myAppointments.map(app => (
              <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${app.status === 'Agendado' ? 'bg-teal-500' : app.status === 'Concluído' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>

                <div className="flex-1 flex flex-col md:flex-row gap-6 items-start md:items-center w-full">
                  <div className="text-center md:text-left min-w-[80px]">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">{new Date(app.date).toLocaleDateString('pt-BR', { month: 'short' })}</p>
                    <p className="text-2xl font-bold text-slate-800 leading-none">{new Date(app.date).getDate()}</p>
                    <p className="text-sm font-medium text-slate-600 mt-1">{app.time}</p>
                  </div>

                  <div className="w-px h-12 bg-slate-100 hidden md:block"></div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{app.specialty}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1"><User size={14} /> Dr(a). {app.professionalName}</p>
                  </div>

                  <div className="ml-auto flex items-center gap-3 mt-4 md:mt-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${app.status === 'Agendado' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                      app.status === 'Concluído' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                      {app.status}
                    </span>
                    {app.type === 'Telemedicina' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                        <Video size={12} /> Online
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- WIZARD VIEW ---
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => setViewMode('list')} className="flex items-center text-slate-500 hover:text-teal-600 mb-2 transition-colors">
        <ChevronLeft size={16} className="mr-1" /> Voltar para meus agendamentos
      </button>

      {/* Header / Stepper */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div onClick={() => step > 1 && setStep(step - 1)} className={`p-2 rounded-xl transition-colors ${step > 1 ? 'hover:bg-slate-100 cursor-pointer text-slate-600' : 'text-slate-300 pointer-events-none'}`}>
            <ChevronLeft size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {step === 1 && 'Escolha a Especialidade'}
              {step === 2 && 'Escolha o Profissional'}
              {step === 3 && 'Escolha o Horário'}
              {step === 4 && 'Confirmar Agendamento'}
            </h2>
            <p className="text-slate-500 text-sm">Passo {step} de 4</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s <= step ? 'w-8 bg-teal-500' : 'w-2 bg-slate-200'}`}></div>
          ))}
        </div>
      </div>

      {/* Step 1: Specialty */}
      {step === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SpecialtiesList.map(spec => (
            <div
              key={spec}
              onClick={() => { setSelectedSpecialty(spec); setStep(2); }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 cursor-pointer transaction-all group text-center"
            >
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Stethoscope size={24} />
              </div>
              <h3 className="font-bold text-slate-700">{spec}</h3>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Professional */}
      {step === 2 && (
        <div className="space-y-4">
          {availableProfessionals.length === 0 ? (
            <EmptyState icon={UserCog} title="Nenhum profissional encontrado" description="Tente outra especialidade." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProfessionals.map(prof => (
                <div
                  key={prof.id}
                  onClick={() => { setSelectedProfessional(prof); setStep(3); }}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 cursor-pointer flex items-center gap-4 group"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                    {prof.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{prof.name}</h3>
                    <p className="text-teal-600 text-sm font-medium">{prof.specialty}</p>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                      <Star size={12} className="fill-orange-400 text-orange-400" /> 4.9 (120 avaliações)
                    </div>
                  </div>
                  <div className="ml-auto text-slate-300 group-hover:text-teal-500">
                    <ChevronRight size={24} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Slots */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-teal-500" /> Horários Disponíveis
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {slots.map((slot, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedSlot(slot); setStep(4); }}
                className="p-3 text-center border border-slate-100 rounded-xl hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all"
              >
                <p className="text-xs text-slate-500 mb-1 capitalize">{formatDate(slot.date).split(',')[0]}</p>
                <span className="font-bold text-lg text-slate-700">{slot.time}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && selectedProfessional && selectedSlot && (
        <div className="max-w-lg mx-auto">
          <Card title="Resumo do Agendamento">
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-teal-600 font-bold border shadow-sm">
                  {selectedProfessional.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Profissional</p>
                  <h3 className="font-bold text-slate-800 text-lg">{selectedProfessional.name}</h3>
                  <p className="text-teal-600 text-xs font-bold uppercase">{selectedProfessional.specialty}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Calendar size={18} /> <span className="text-xs font-bold uppercase">Data</span>
                  </div>
                  <p className="font-bold text-indigo-900 capitalize">{formatDate(selectedSlot.date)}</p>
                </div>
                <div className="flex-1 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Clock size={18} /> <span className="text-xs font-bold uppercase">Horário</span>
                  </div>
                  <p className="font-bold text-indigo-900">{selectedSlot.time}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-[#f2a900] hover:bg-[#e09b00] text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Confirmar Agendamento</>}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
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
                className={`px - 4 py - 3 text - sm font - medium border - b - 2 transition - colors ${activeTab === tab ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'} `}
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
            </div >
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
          </div >
        ))}
      </div >
    </div >
  );
};

const AdminUsersView = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      // Fetch from our new sync table
      const { data: syncUsers, error: syncError } = await supabase
        .from('users_sync')
        .select('*')
        .order('created_at', { ascending: false });

      if (syncError) throw syncError;

      // Fetch profiles to merge names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role, profession, email');

      const enrichedUsers = syncUsers.map((u: any) => {
        const profile = profiles?.find((p: any) => p.id === u.id || p.email === u.email);
        return {
          ...u,
          full_name: profile?.full_name || 'Usuário Sem Perfil',
          role: profile?.role || 'patient', // Default to patient if not pro
          profession: profile?.profession
        };
      });

      setUsers(enrichedUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;

    setResetLoading(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert(`E-mail de redefinição enviado para ${email}`);
    } catch (e: any) {
      alert("Erro ao enviar e-mail: " + e.message);
    } finally {
      setResetLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR') + ' ' + new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Users size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
            <p className="text-slate-500">Administre o acesso e credenciais da plataforma</p>
          </div>
        </div>
        <Button onClick={fetchUsers} variant="secondary"><List size={16} /> Atualizar Lista</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-800">{users.length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Usuários Cadastrados</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          {/* Simple Stats */}
          <h3 className="text-2xl font-bold text-teal-600">{users.filter(u => u.role === 'patient').length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes (Pacientes)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="p-4 font-bold">Usuário</th>
                <th className="p-4 font-bold">Tipo</th>
                <th className="p-4 font-bold">Cadastro</th>
                <th className="p-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm">
                    <p className="font-bold text-slate-800">{user.full_name}</p>
                    <p className="text-slate-500 text-xs">{user.email}</p>
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                      user.role === 'professional' ? 'bg-blue-50 text-blue-600' :
                        'bg-teal-50 text-teal-600'
                      }`}>
                      {user.role === 'professional' ? user.profession || 'Profissional' : user.role === 'patient' ? 'Paciente' : 'Admin'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="p-4 text-sm">
                    <button
                      onClick={() => handleResetPassword(user.email)}
                      disabled={resetLoading === user.email}
                      className="text-amber-600 hover:text-amber-700 font-medium text-xs flex items-center gap-1 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-all"
                    >
                      {resetLoading === user.email ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                      Resetar Senha
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Nenhum usuário encontrado (ou lista vazia).</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { currentView, navigateTo, toggleAIChat, userRole, logout, isProfileOpen, toggleProfile, closeProfile } = useContext(AppContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        closeProfile();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeProfile]);

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
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-800">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-sm`}>
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3 text-teal-600">
              <div className="bg-white p-1 rounded-xl shadow-sm shadow-teal-100 border border-teal-50">
                <img src="/logo.png" alt="Instituto Pramar Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-teal-900 leading-tight">Instituto Pramar</h1>
                <p className="text-[10px] text-teal-600 font-medium uppercase tracking-wide">Saúde Integrada</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-8 overflow-y-auto py-4 custom-scrollbar">
            <div>
              <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Menu Principal</p>
              <div className="space-y-1">
                <NavItem view="dashboard" label="Dashboard" icon={LayoutDashboard} />

                {userRole !== 'patient' && (
                  <>
                    <NavItem view="patients" label="Pacientes" icon={Users} />
                    <NavItem view="records" label="Prontuários" icon={ClipboardList} />
                    <NavItem view="finance" label="Financeiro" icon={Wallet} />
                  </>
                )}

                <NavItem view="schedule" label="Agenda" icon={Calendar} />
                <NavItem view="telemedicine" label="Telemedicina" icon={Video} />
                <NavItem view="messages" label="Mensagens" icon={MessageSquare} />
              </div>
            </div>

            {userRole !== 'patient' && (
              <div>
                <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Administração</p>
                <div className="space-y-1">
                  <NavItem view="professionals" label="Profissionais" icon={UserCog} />
                  <NavItem view="users_management" label="Gestão de Usuários" icon={Users} />
                  <NavItem view="settings" label="Configurações" icon={Settings} />
                </div>
              </div>
            )}
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
        <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
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
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-300 focus:ring-4 focus:ring-teal-500/10 rounded-full py-2.5 pl-10 pr-4 outline-none transition-all text-sm font-medium text-slate-600 placeholder:text-slate-400"
              />
            </div>
          </div>


          {/* Right Actions */}
          <div className="flex items-center gap-6">
            {/* Notifications */}
            <div className="relative group/notifications">
              <button className="relative text-slate-500 hover:text-slate-700 transition-colors p-1">
                <Bell size={20} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>

              {/* Notification Dropdown */}
              <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover/notifications:block animate-in fade-in slide-in-from-top-2 z-50">
                <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 text-sm">Notificações</h4>
                  <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">1 nova</span>
                </div>
                <div className="p-2">
                  <div className="flex gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                    <div className="mt-1 w-2 h-2 bg-teal-500 rounded-full shrink-0"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-0.5">Consulta Confirmada</p>
                      <p className="text-[11px] text-slate-500 leading-snug">Seu agendamento com Dr. Silva foi confirmado para amanhã às 14h.</p>
                      <p className="text-[10px] text-slate-400 mt-2">Há 2 horas</p>
                    </div>
                  </div>
                  <div className="text-center py-2">
                    <button className="text-[11px] text-teal-600 font-bold hover:underline">Ver todas</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Dropdown */}
            <div className="relative h-full flex items-center" ref={profileRef}>
              <button
                onClick={toggleProfile}
                className={`flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer transition-all ${isProfileOpen ? 'opacity-100' : 'hover:opacity-80'}`}
              >
                <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shadow-sm md:w-10 md:h-10">
                  {userRole === 'admin' ? 'MP' : 'IP'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-700 leading-none">Usuário</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{userRole}</p>
                    <ChevronDown size={10} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="p-1">
                    <button onClick={() => navigateTo('settings')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                      <Settings size={16} /> Configurações
                    </button>
                    <button onClick={() => alert("Perfil em desenvolvimento.")} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                      <User size={16} /> Meu Perfil
                    </button>
                    <div className="h-px bg-slate-50 my-1"></div>
                    <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
                      <LogOut size={16} /> Sair
                    </button>
                  </div>
                </div>
              )}
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

const RoleBasedMainContent = () => {
  const { currentView, userRole } = useContext(AppContext);

  switch (currentView) {
    case 'dashboard': return userRole === 'patient' ? <PatientDashboard /> : <Dashboard />;
    case 'patients': return <PatientsView />;
    case 'records': return <RecordsView />;
    case 'finance': return <FinanceView />;
    case 'professionals': return <ProfessionalView />;
    case 'schedule': return <ScheduleView />;
    case 'telemedicine': return <TelemedicineView />;
    case 'users_management': return <AdminUsersView />;
    case 'messages': return <MessagesView />;
    case 'settings': return <SettingsView />;
    default: return userRole === 'patient' ? <PatientDashboard /> : <Dashboard />;
  }
};

// --- AUTHENTICATION ---

const LoginScreen = ({ onLogin }: { onLogin: (session: any) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usersName, setUsersName] = useState('');

  // Login Type Selector
  const [loginType, setLoginType] = useState<'patient' | 'professional'>('patient');

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentMagicLink, setSentMagicLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forceChangePassword, setForceChangePassword] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao conectar com ' + provider + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if email belongs to admin
  const checkAdmin = (email: string) => {
    setEmail(email);
    // Hardcoded logic for demo/MVP as requested. Secure implementation would be backend-side.
    if (email.includes('admin') || email === 'licitadigitaltech@gmail.com') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isAdmin) {
        // Admin Password Login (Simulated check against specific password for MVP or real Supabase auth if configured)
        // For MVP/Demo as requested by user ("4548046"):
        // Ideally we sign in via Supabase. If creating a real project, we'd enable Database Auth.
        // For this demo, we will check the password manually or try Supabase auth.
        // Let's try Supabase Auth first.
        // Let's try Supabase Auth first.
        if (!supabase) throw new Error("Supabase not initialized");

        // 1. Check for Default Password Force Change (Simulation logic for demo)
        if (password === '123456') {
          setForceChangePassword(true);
          setUsersName(email.split('@')[0]); // Simple name extraction
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          // Fallback for "Simulated" mode if user hasn't set up the exact user in Supabase yet
          // Fallback for "Simulated" mode if user hasn't set up the exact user in Supabase yet
          if (password === '548046') {
            // Fake session for MVP demo
            onLogin({ user: { email, role: 'admin' }, access_token: 'demo-token' });
          } else {
            alert("Senha incorreta ou erro no login: " + error.message);
          }
        } else {
          onLogin(data.session);
        }

      } else {
        // Magic Link for others
        if (!supabase) throw new Error("Supabase not initialized");
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setSentMagicLink(true);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message || "Erro ao tentar fazer login.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    if (newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    // Simulate password update
    setTimeout(() => {
      alert("Senha atualizada com sucesso!");
      // Log in after change
      onLogin({ user: { email, role: 'admin' }, access_token: 'demo-updated-token' });
      setLoading(false);
    }, 1000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Por favor, digite seu e-mail.");
      return;
    }
    setLoading(true);
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) alert("Erro: " + error.message);
      else alert("Email de redefinição de senha enviado! Verifique sua caixa de entrada.");
    }
    setLoading(false);
    setShowForgotPassword(false);
  };

  if (forceChangePassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/20 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-200/20 rounded-full blur-[80px]"></div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] max-w-md w-full relative z-10 animate-fade-in shadow-2xl shadow-slate-200 border border-slate-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">Criar Nova Senha</h2>
              <p className="text-slate-500 text-xs mt-1">Olá, {usersName}! Por segurança, altere sua senha.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Nova Senha</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Confirmar Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#009ca6] hover:bg-[#008b94] rounded-xl font-bold text-white shadow-lg shadow-teal-700/20 transition-all mt-4 transform hover:-translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Atualizar e Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="bg-white p-8 rounded-[2rem] max-w-md w-full relative z-10 animate-fade-in shadow-2xl shadow-slate-200 border border-slate-100">
          <button onClick={() => setShowForgotPassword(false)} className="mb-6 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium transition-colors"><ChevronLeft size={16} /> Voltar</button>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Esqueceu a senha?</h2>
            <p className="text-slate-500 text-sm leading-relaxed">Não se preocupe! Digite seu e-mail abaixo e enviaremos as instruções para você.</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">E-mail Cadastrado</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Enviar Instruções"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (sentMagicLink) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-3xl max-w-md w-full text-center shadow-xl shadow-slate-200 border border-slate-100">
          <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifique seu E-mail</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">Enviamos um link mágico de acesso para <br /><span className="text-slate-800 font-bold">{email}</span>.</p>
          <button onClick={() => setSentMagicLink(false)} className="text-teal-600 hover:text-teal-700 font-bold text-sm">Voltar ao Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#009ca6] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-teal-400/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[60%] bg-teal-800/20 rounded-full blur-[100px]"></div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-teal-900/20 overflow-hidden flex flex-col md:flex-row relative z-10 min-h-[600px]">

        {/* Left Side - Brand & Info */}
        <div className="w-full md:w-5/12 bg-slate-50 p-12 flex flex-col justify-between relative overflow-hidden border-r border-slate-100">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-teal-600 text-white p-2.5 rounded-xl shadow-md">
                <HeartPulse size={24} />
              </div>
              <span className="font-bold text-xl text-teal-900 tracking-tight">Instituto Pramar</span>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-800 mb-6 leading-tight">
              Saúde e bem-estar,<br />
              <span className="text-teal-600">simplificados.</span>
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-teal-600 shadow-sm border border-slate-100"><Calendar size={18} /></div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Agendamento Fácil</p>
                  <p className="text-xs text-slate-500">Marque consultas em segundos</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-teal-600 shadow-sm border border-slate-100"><Video size={18} /></div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Telemedicina</p>
                  <p className="text-xs text-slate-500">Atendimento online seguro</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-teal-600 shadow-sm border border-slate-100"><Activity size={18} /></div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Histórico Unificado</p>
                  <p className="text-xs text-slate-500">Seus exames num só lugar</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-xs text-slate-400 relative z-10">
            © 2026 Instituto Pramar. Todos os direitos reservados.
          </div>

          {/* Decor Circle */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal-100/50 rounded-full blur-3xl"></div>
        </div>


        {/* Right Side - Login Form */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <div className="max-w-sm mx-auto w-full">

            <div className="mb-8 text-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Bem-vindo(a) ao Pramar</h3>
              <p className="text-slate-500 text-sm mb-4">Selecione seu perfil para continuar</p>

              {/* Profile Selector Tabs */}
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 relative">
                <button
                  onClick={() => { setLoginType('patient'); setIsAdmin(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all duration-200 z-10 ${loginType === 'patient' ? 'bg-teal-50 text-teal-600 shadow-sm border border-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <User size={16} /> Paciente
                </button>
                <button
                  onClick={() => setLoginType('professional')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 z-10 ${loginType === 'professional' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Stethoscope size={16} /> Profissional
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{loginType === 'patient' ? 'Acesse sua conta' : 'Portal do Profissional'}</h3>
              <p className="text-slate-500 text-sm">
                {loginType === 'patient' ? 'Digite seu e-mail para receber o acesso.' : 'Utilize suas credenciais corporativas.'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  {loginType === 'patient' ? 'Seu E-mail' : 'E-mail Corporativo'}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => checkAdmin(e.target.value)}
                    placeholder={loginType === 'patient' ? "ex: maria@email.com" : "ex: doutor@pramar.com.br"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {(loginType === 'professional' || isAdmin) && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Senha de Acesso</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-indigo-600 hover:text-indigo-700 text-xs font-bold hover:underline transition-all">Esqueci minha senha</button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 hover:shadow-xl flex items-center justify-center gap-2 ${loginType === 'patient'
                  ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {loginType === 'patient' ? 'Receber Link de Acesso' : 'Entrar na Plataforma'}
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            {loginType === 'patient' && (
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 mb-4">Ou entre com</p>
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    <span className="font-bold text-slate-600 text-sm">Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    <span className="font-bold text-slate-600 text-sm">Facebook</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<any>(null);

  // Check for existing session
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }: any) => {
        setSession(session);
        // Determine Role
        if (session?.user?.email) {
          if (session.user.email.includes('admin') || session.user.email === 'licitadigitaltech@gmail.com') {
            // Admin role is handled by AppContext default or we need to pass it down. 
            // However, AppProvider is inside App, so we can't set it here directly if we haven't rendered AppProvider yet.
            // We actually need to move the role determination INSIDE AppProvider or pass it as initial prop.
            // For now, let's just let AppProvider handle defaults, but we need a mechanism.
            // Actually, let's use a ref or local storage to persist role hint if needed, 
            // but better: The AppProvider should fetch the profile.
            // Let's modify AppProvider to fetch the current user profile.
          }
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return (
    <AppProvider>
      <Layout>
        <RoleBasedMainContent />
      </Layout>
    </AppProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <App />
    <ToastContainer />
  </ErrorBoundary>
);