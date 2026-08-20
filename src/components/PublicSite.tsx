import React, { useState } from 'react';
import { safeFetch } from '../utils/apiClient';
import { QRCodeSVG } from 'qrcode.react';
import ComaninsLogo from './ComaninsLogo';
import { maskPhone } from '../utils/masks';
import { 
  Thermometer, 
  Gauge, 
  ShieldCheck, 
  Clock, 
  Award, 
  Send, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Settings, 
  RefreshCw, 
  Calculator,
  UserCheck,
  ShoppingBag,
  Package,
  Search,
  Cpu,
  Activity,
  FileCheck,
  Check,
  Building2,
  Building,
  Factory,
  Users,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Truck,
  Flame,
  Wrench,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { ContactMessage } from '../types';
import { CookieConsentBanner, PrivacyPolicyModal } from './LGPDPrivacy';

interface PublicSiteProps {
  onNavigateToPortal: (tab?: 'internal' | 'client') => void;
  onSubmitContact: (contact: Omit<ContactMessage, 'id' | 'date' | 'status'>) => Promise<boolean>;
  customLogo?: string;
  sitePhotos?: any[];
}

const DEFAULT_SITE_PHOTOS = [
  { id: 'photo1', title: 'Calibração de Pressão com Padrão Digital', badge: 'Laboratório Climatizado', imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', description: 'Aferição de manômetros, vacuômetros e transmissores utilizando geradores de pressão de alta precisão e padrões certificados RBC.' },
  { id: 'photo2', title: 'Intervenção em Paradas de Manutenção', badge: 'Atendimento On-Site (Campo)', imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80', description: 'Equipes móveis equipadas para atuar diretamente nas instalações de refinarias e indústrias petroquímicas durante paradas técnicas.' },
  { id: 'photo3', title: 'Ensaio de Termopares e Sensores PT100', badge: 'Termometria Industrial', imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', description: 'Ensaio térmico de precisão com poços secos (dry blocks) de até 650°C e banhos termostáticos com curva de desvio rastreável.' },
  { id: 'photo4', title: 'Recuperação Física e Troca de Vedações', badge: 'Manutenção Integrada', imageUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80', description: 'Desmontagem, higienização interna, substituição de ponteiros, visores e borrachas de vedação para estender a vida útil de instrumentos.' },
  { id: 'photo5', title: 'Inspeção de Vibração e Sensores de Proximidade', badge: 'Sistemas Bently Nevada', imageUrl: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=800&q=80', description: 'Aferição fina de sondas de proximidade e racks de proteção Bently Nevada 3500/3300 para garantia de rotação de turbocompressores.' },
  { id: 'photo6', title: 'Válvulas de Inertização N2 em Tanques', badge: 'Inertização N2 (Blanketing)', imageUrl: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80', description: 'Calibração e manutenção de válvulas de inertização por nitrogênio (N2) e alívio de pressão/vácuo em tanques de armazenamento.' }
];

export default function PublicSite({ onNavigateToPortal, onSubmitContact, customLogo, sitePhotos }: PublicSiteProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'quote'>('home');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const scrollToSection = (id: string) => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          // Subtract header height (~80px) to prevent hiding under the sticky header
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    } else {
      const element = document.getElementById(id);
      if (element) {
        const y = element.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  const displayPhotos = DEFAULT_SITE_PHOTOS.map((defaultPhoto, index) => {
    let customPhoto: any = null;
    if (sitePhotos && sitePhotos.length > 0) {
      customPhoto = sitePhotos.find((p: any) => p.id === defaultPhoto.id || p.order === index) || sitePhotos[index];
    }
    if (!customPhoto) {
      const saved = localStorage.getItem('comanins_site_photos');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            customPhoto = parsed.find((p: any) => p.id === defaultPhoto.id || p.order === index) || parsed[index];
          }
        } catch (e) {}
      }
    }
    if (!customPhoto) return defaultPhoto;
    return {
      id: customPhoto.id || defaultPhoto.id,
      title: customPhoto.title !== undefined && customPhoto.title !== '' ? customPhoto.title : defaultPhoto.title,
      badge: customPhoto.badge !== undefined && customPhoto.badge !== '' ? customPhoto.badge : defaultPhoto.badge,
      imageUrl: customPhoto.imageUrl || defaultPhoto.imageUrl,
      description: customPhoto.description !== undefined && customPhoto.description !== '' ? customPhoto.description : defaultPhoto.description
    };
  });
  
  // Contact state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'calibracao' | 'manutencao' | 'vendas' | 'outros'>('calibracao');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setSubmitError('Por favor, preencha os campos obrigatórios (Nome, E-mail e Mensagem).');
      return;
    }
    if (!lgpdConsent) {
      setSubmitError('Você precisa consentir com o processamento de seus dados de contato de acordo com a LGPD.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const success = await onSubmitContact({
        name,
        company,
        email,
        phone,
        message,
        category
      });
      if (success) {
        setSubmitSuccess(true);
        
        // Send email via backend server
        try {
          await safeFetch('/api/send-contact-email', {
            method: 'POST',
            body: JSON.stringify({
              name,
              company,
              email,
              phone,
              message,
              category
            }),
          });
        } catch (emailErr) {
          console.error("Failed to send email notification", emailErr);
        }

        setName('');
        setCompany('');
        setEmail('');
        setPhone('');
        setMessage('');
        setLgpdConsent(false);
      } else {
        setSubmitError('Erro ao enviar a mensagem. Tente novamente.');
      }
    } catch (err) {
      setSubmitError('Erro na conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Upper bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm text-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center cursor-pointer py-2" onClick={() => setActiveTab('home')}>
              <ComaninsLogo size={190} src={customLogo} className="max-h-14" />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex flex-1 justify-center space-x-1 overflow-x-auto pb-1 md:pb-0 items-center hide-scrollbar px-4">
              <button
                onClick={() => scrollToSection('inicio')}
                className={`whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] transition-colors ${
                  activeTab === 'home' 
                    ? 'text-slate-700 hover:bg-slate-50' 
                    : 'text-slate-500 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                Início
              </button>
              <button
                onClick={() => scrollToSection('servicos')}
                className="whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] text-slate-500 hover:text-blue-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Serviços
              </button>
              <button
                onClick={() => scrollToSection('clientes')}
                className="whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] text-slate-500 hover:text-blue-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Clientes
              </button>
              <button
                onClick={() => scrollToSection('galeria')}
                className="whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] text-slate-500 hover:text-blue-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Galeria
              </button>
              <button
                onClick={() => scrollToSection('vendas')}
                className="whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] text-slate-500 hover:text-blue-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Vendas & Locação
              </button>
              <button
                onClick={() => scrollToSection('sobre')}
                className="whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] text-slate-500 hover:text-blue-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Sobre Nós
              </button>
              <button
                onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`whitespace-nowrap px-3 py-2 rounded-lg font-semibold text-[13px] transition-colors ${
                  activeTab === 'quote' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-500 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                Fale Conosco
              </button>
            </nav>

            {/* CTA Portal buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { onNavigateToPortal('client'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-full text-[10px] md:text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-wider uppercase cursor-pointer"
                title="Área do Cliente: Buscar certificados de calibração"
              >
                <Award className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Portal do Cliente
              </button>
              <button
                onClick={() => { onNavigateToPortal('internal'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-full text-[10px] md:text-xs font-extrabold text-white bg-blue-900 hover:bg-blue-800 shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-wider uppercase cursor-pointer"
                title="Área do Técnico: Controle laboratorial"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Portal Interno
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-slate-100 bg-slate-50">
          <nav className="flex space-x-2 overflow-x-auto px-4 py-2 hide-scrollbar items-center">
            <button
              onClick={() => scrollToSection('inicio')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-semibold text-xs text-slate-600 bg-white border border-slate-200 shadow-sm"
            >
              Início
            </button>
            <button
              onClick={() => scrollToSection('servicos')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-semibold text-xs text-slate-600 bg-white border border-slate-200 shadow-sm"
            >
              Serviços
            </button>
            <button
              onClick={() => scrollToSection('clientes')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-semibold text-xs text-slate-600 bg-white border border-slate-200 shadow-sm"
            >
              Clientes
            </button>
            <button
              onClick={() => scrollToSection('galeria')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-semibold text-xs text-slate-600 bg-white border border-slate-200 shadow-sm"
            >
              Galeria
            </button>
            <button
              onClick={() => scrollToSection('vendas')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-semibold text-xs text-slate-600 bg-white border border-slate-200 shadow-sm"
            >
              Vendas & Locação
            </button>
            <button
              onClick={() => scrollToSection('sobre')}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-semibold text-xs text-slate-600 bg-white border border-slate-200 shadow-sm"
            >
              Sobre Nós
            </button>
            <button
              onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="whitespace-nowrap px-3 py-1.5 rounded-full font-bold text-xs text-blue-700 bg-blue-50 border border-blue-100 shadow-sm"
            >
              Fale Conosco
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-16 pb-16">
            {/* Hero Section with Split Layout as in Sleek Theme */}
            <section id="inicio" className="bg-slate-950 text-white pt-12 pb-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Gauge className="w-96 h-96 text-blue-900" />
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  
                  {/* Left Side: Hero Text */}
                  <div className="lg:col-span-7 space-y-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Metrologia de Alta Performance
                    </span>
                    
                    <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white leading-tight">
                      Calibração Industrial de <span className="text-blue-500">Alta Precisão</span> em Camaçari
                    </h1>
                    
                    <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                      Especialistas em calibração de instrumentos de pressão e temperatura, calibração de válvulas de sistema de blanketing (inertização N2) em tanques e em sistemas de monitoramento de grandes máquinas <strong className="text-white">Bently Nevada</strong>. Garantia de rastreabilidade, conformidade com a ABNT e validação INMETRO.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-500/20 text-sm transition-colors text-center cursor-pointer"
                      >
                        Solicitar Orçamento Rápido
                      </button>
                      <a
                        href="https://wa.me/557136210311"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-full shadow-lg shadow-emerald-600/20 text-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Phone className="h-4.5 w-4.5 stroke-[2.5]" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* Right Side: Comanins em Números card */}
                  <div className="lg:col-span-5">
                    <div className="bg-[#111827]/90 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 bg-blue-600 text-white font-mono text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
                        Est. 1998
                      </div>
                      
                      <div className="flex items-center gap-3 mb-6">
                        <Activity className="h-6 w-6 text-blue-500" />
                        <h2 className="text-xl font-display font-bold text-white">Comanins em Números</h2>
                      </div>

                      <div className="space-y-6">
                        {/* Stat 1 */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">Tempo de Mercado</span>
                          <div className="text-2xl font-extrabold text-white">28 Anos de Experiência</div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Atuando desde 09 de Fevereiro de 1998 no Polo Industrial Plástico de Camaçari.
                          </p>
                        </div>

                        <hr className="border-slate-800" />

                        {/* Stat 2 */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">Instrumentos Atendidos</span>
                          <div className="text-2xl font-extrabold text-white">+223.000 Calibrados</div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Capacidade de calibração mensal de mais de 1000 instrumentos.
                          </p>
                        </div>

                        <hr className="border-slate-800" />

                        {/* Stat 3 */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">Padrão Metrológico</span>
                          <div className="text-2xl font-extrabold text-white">RBC & INMETRO</div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Certificados 100% integrados às NBR vigentes para total rastreabilidade legal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Quality Seals section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-xl shadow-md border border-slate-100 flex items-start space-x-5">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Conformidade ISO 17025</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Processos metrológicos alinhados aos requisitos nacionais e internacionais de qualidade, garantindo auditorias sem ressalvas.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-md border border-slate-100 flex items-start space-x-5">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Award className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Padrões Rastreáveis</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Calibrações com padrões rastreáveis à Rede Brasileira de Calibração (RBC/Inmetro) e órgãos metrológicos internacionais.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-md border border-slate-100 flex items-start space-x-5">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Agilidade Laboratorial</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Prazo de entrega ágil com equipe de suporte e técnicos focados em reduzir o tempo de parada de processo da sua planta.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION: POR QUE ESCOLHER A COMANINS? */}
            <section id="diferenciais" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                  {/* Left Column */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-mono font-bold tracking-wider uppercase">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Excelência Técnica desde 1998</span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white leading-tight">
                        Por que escolher a COMANINS?
                      </h2>
                      <p className="text-blue-400 text-lg font-semibold">
                        Experiência técnica que gera segurança operacional
                      </p>
                    </div>

                    <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                      <p>
                        Fundada em 1998 por profissionais experientes em instrumentação e metrologia, a COMANINS conhece de perto os desafios da indústria. Para nós, calibrar um instrumento vai muito além de ajustar uma indicação ou aplicar uma etiqueta: significa garantir medições confiáveis, proteger os operadores, preservar a qualidade do processo e contribuir para a eficiência operacional e energética da planta.
                      </p>
                      <p>
                        Com experiência na gestão de mais de 13 mil instrumentos, oferecemos serviços de calibração, manutenção e instrumentação com rigor técnico, rastreabilidade e documentação adequada. Nossa equipe está preparada para atuar em instrumentos de pressão, temperatura, nível e outras grandezas, tanto em laboratório quanto em campo, atendendo às necessidades específicas de cada cliente.
                      </p>
                    </div>

                    {/* Tagline Box */}
                    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md relative overflow-hidden">
                      <div className="w-1 bg-blue-500 absolute left-0 top-0 bottom-0"></div>
                      <p className="text-xs sm:text-sm font-medium text-blue-100 italic pl-3 leading-relaxed">
                        &ldquo;COMANINS: calibração não é apenas um certificado. É confiança para tomar decisões, segurança para operar e precisão para produzir.&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Key Benefits Checklist */}
                  <div className="lg:col-span-5">
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg backdrop-blur-sm">
                      <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-700">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span>Ao escolher a COMANINS, sua empresa conta com:</span>
                      </h3>

                      <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Experiência consolidada desde 1998;</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Equipe especializada</strong> em calibração, manutenção e instrumentação;</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Resultados confiáveis</strong> e tecnicamente rastreáveis (RBC/INMETRO);</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Atendimento flexível:</strong> em laboratório climatizado e nas instalações do cliente (field service);</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Gestão de grandes carteiras</strong> de instrumentos industriais (+13 mil);</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Suporte técnico próximo e ágil</strong> com portal digital de certificados;</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                          <span><strong>Foco na segurança, conformidade e continuidade operacional.</strong></span>
                        </li>
                      </ul>

                      <div className="pt-2">
                        <button
                          onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                        >
                          <span>Fazer Cotação com Nossa Equipe</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Redesigned 3x2 Services Grid (from the screenshots) */}
            <section id="servicos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="text-xs font-mono font-bold tracking-widest text-blue-600 uppercase">Foco de Atuação</span>
                <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900 mt-2">
                  Grandezas que Atendemos
                </h2>
                <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full"></div>
                <p className="text-slate-600 mt-4 leading-relaxed">
                  Oferecemos soluções completas para instrumentação industrial, fornecendo controle cirúrgico de variáveis críticas de processo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Card 1: Classe de Pressão */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Gauge className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold text-slate-950">Classe de Pressão</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Calibração laboratorial e móvel de manômetros (analógicos, digitais), transmissores de pressão, pressostatos de segurança e vacuômetros com padrões de alta exatidão.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Em conformidade com a NBR 14105-1</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Ensaios de histerese e repetibilidade</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Classe de Temperatura */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
                      <Thermometer className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold text-slate-950">Classe de Temperatura</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Aferição precisa de termômetros bimetálicos, termostatos de proteção, termopares industriais (K, J, T, S), sensores PT100 e transmissores de temperatura microprocessados.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Atendimento à norma ABNT NBR 13862</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Calibração de blocos secos</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Sistemas Bently Nevada & Loop Test */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Cpu className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold text-slate-950">Sistemas Bently Nevada & Loop Test</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Especialistas em comissionamento, calibração, ensaios de malha (loop test 4-20mA/HART) e manutenção preditiva Bently Nevada 3500/3300 para proteção e monitoramento de turbomáquinas.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Análise de sensores de proximidade e vibração</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Loop test de sinal do sensor ao PLC em campo</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Inertização N2 (Sistema de Blanketing) */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold text-slate-950">Sistema de Blanketing (Inertização N2)</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Calibração e manutenção de válvulas de inertização por Nitrogênio (N2) em tanques de armazenamento (sistema de blanketing), válvulas auto-reguladoras de pressão e válvulas de alívio de vácuo.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Aferição de válvulas de alívio e quebra-vácuo</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Proteção estanque e controle de atmosfera em tanques</span>
                    </div>
                  </div>
                </div>

                {/* Card 5: Serviço de Campo Integrado */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold text-slate-950">Serviço de Campo Integrado</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Mobilização rápida de equipes técnicas altamente equipadas para paradas de manutenção, plantas químicas, petroquímicas e indústrias de manufatura. Rastreamento offline em áreas remotas.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Sincronização inteligente offline-to-cloud</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>Checklists integrados e assinatura digital</span>
                    </div>
                  </div>
                </div>

                {/* Card 6: Certificados Digitais Instantâneos */}
                <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col justify-between shadow-lg shadow-blue-600/20 hover:scale-[1.01] transition-transform">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold">Certificados Digitais Instantâneos</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Todos os laudos gerados seguem rigorosamente os padrões ABNT e INMETRO. Através do nosso portal restrito por LGPD, clientes podem realizar o download imediato dos PDFs em tempo real.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <button 
                      onClick={() => { onNavigateToPortal('client'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="w-full py-3 bg-white hover:bg-slate-50 text-blue-600 text-xs font-extrabold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Acessar Certificados</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION: PRINCIPAIS CLIENTES */}
            <section id="clientes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                <span className="text-xs font-mono font-bold tracking-widest text-blue-600 uppercase">Credibilidade Industrial</span>
                <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900">
                  Principais Clientes e Parceiros
                </h2>
                <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
                <p className="text-slate-600 text-sm leading-relaxed pt-2">
                  Grandes líderes dos setores petroquímico, de energia, transporte, gás e manutenção confiam na gestão metrológica da COMANINS.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Client 1: BRASKEM */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">Petroquímica</span>
                    <Factory className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">BRASKEM</h3>
                    <p className="text-xs text-slate-500 mt-1">Gestão de + 13000 manômetros, instrumentos relacionados à NR-13, incluindo levantamento em campo, conferência cadastral, calibração e controle de prazos, alimentação de certificado em sistema. Esse trabalho garante rastreabilidade, confiabilidade das medições e apoio à segurança operacional.</p>
                  </div>
                </div>

                {/* Client 2: ACELEN */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">Refino & Energia</span>
                    <Flame className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">ACELEN</h3>
                    <p className="text-xs text-slate-500 mt-1">Na Refinaria de Mataripe, a COMANINS atua na gestão, calibração e manutenção de mais de 10 mil instrumentos, garantindo confiabilidade das medições, rastreabilidade e segurança para a continuidade operacional.</p>
                  </div>
                </div>

                {/* Client 3: PETROBRAS */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase">Energia & Petróleo</span>
                    <Building2 className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">PETROBRAS</h3>
                    <p className="text-xs text-slate-500 mt-1">Na Petrobras, a COMANINS atuou em serviços de calibração, manutenção e apoio à instrumentação industrial, contribuindo para a confiabilidade das medições, a segurança dos processos e a continuidade operacional.</p>
                  </div>
                </div>

                {/* Client 4: TURBOSERV */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase">Turbomáquinas</span>
                    <Wrench className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">TURBOSERV</h3>
                    <p className="text-xs text-slate-500 mt-1">Desde 2000, a COMANINS atua em parceria com a Turboserv na calibração, montagem e manutenção de sistemas Bently Nevada, garantindo proteção, confiabilidade e disponibilidade operacional às turbomáquinas.</p>
                  </div>
                </div>

                {/* Client 5: CONCÓRDIA TRANSPORTES */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">Logística</span>
                    <Truck className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">CONCÓRDIA TRANSPORTES</h3>
                    <p className="text-xs text-slate-500 mt-1">Na Concórdia Transportes, a COMANINS realiza serviços de calibração e manutenção de instrumentos de medição, contribuindo para a confiabilidade dos equipamentos, a segurança das operações e a qualidade dos processos.</p>
                  </div>
                </div>

                {/* Client 6: NPE */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">Engenharia</span>
                    <Cpu className="h-4 w-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">NPE</h3>
                    <p className="text-xs text-slate-500 mt-1">Na NPE, a COMANINS atua com serviços de calibração, manutenção, locação, contribuindo para a confiabilidade dos equipamentos, a qualidade dos projetos e a segurança operacional.</p>
                  </div>
                </div>

                {/* Client 7: NACIONAL GÁS */}
                <div className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase">Distribuição de Gás</span>
                    <Flame className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">NACIONAL GÁS</h3>
                    <p className="text-xs text-slate-500 mt-1">Na Nacional Gás, a COMANINS presta serviços de calibração, contribuindo para a confiabilidade das medições, a segurança dos processos e a continuidade operacional.</p>
                  </div>
                </div>

                {/* CTA Card for Clients */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-1">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold bg-white/20 text-white px-2.5 py-1 rounded-full uppercase">Sua Empresa Aqui</span>
                    <h4 className="text-lg font-bold leading-tight pt-1">Seja um Parceiro COMANINS</h4>
                    <p className="text-xs text-blue-100">Soluções sob medida para o seu parque de instrumentos.</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="mt-4 py-2 px-3 bg-white text-blue-900 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors text-center cursor-pointer"
                  >
                    Falar com Comercial &rarr;
                  </button>
                </div>
              </div>
            </section>

            {/* SECTION: GALERIA DE FOTOS DE SERVIÇOS REALIZADOS */}
            <section id="galeria" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold uppercase">
                  <Camera className="h-3.5 w-3.5 text-blue-600" />
                  <span>Atuação Prática em Campo e Laboratório</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900">
                  Fotos de Serviços que Realizamos
                </h2>
                <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
                <p className="text-slate-600 text-sm leading-relaxed pt-1">
                  Registros do nosso rigor metrológico em ação em laboratórios climatizados e em intervenções nas plantas de nossos clientes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayPhotos.map((photo: any, index: number) => (
                  <div key={photo.id || index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col">
                    <div className="relative h-52 overflow-hidden bg-slate-900">
                      <img 
                        src={photo.imageUrl} 
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                      <div className="absolute top-3 left-3 bg-blue-900/90 backdrop-blur-md text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-blue-400/30 uppercase">
                        {photo.badge || 'Serviço COMANINS'}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                          {photo.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {photo.description}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>• COMANINS Metrologia</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Banner Vendas e Locação */}
            <section id="vendas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 mb-8">
              <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
                
                <div className="relative z-10 flex-1 space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="bg-white/10 text-blue-200 text-xs font-mono font-bold tracking-widest px-3 py-1 rounded-full uppercase">
                      Pronta Entrega
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-black text-white leading-tight">
                    Locação e Venda de Manômetros Industriais
                  </h2>
                  <p className="text-blue-100 text-lg max-w-2xl">
                    Amplo estoque de manômetros e instrumentos industriais com disponibilidade imediata. Soluções completas para manter sua planta operando sem interrupções.
                  </p>
                </div>
                
                <div className="relative z-10">
                  <button 
                    onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="whitespace-nowrap px-8 py-4 bg-white text-blue-900 hover:bg-slate-50 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <span>Solicitar Orçamento</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Rastreabilidade Completa sob a Norma LGPD Banner */}
            <section className="bg-slate-950 text-white py-16 overflow-hidden relative">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl space-y-3">
                  <span className="text-xs font-mono font-bold tracking-widest text-blue-500 uppercase">
                    Portal Seguro Comanins
                  </span>
                  <h2 className="text-3xl md:text-4xl font-display font-extrabold text-white">
                    Rastreabilidade Completa sob a Norma LGPD
                  </h2>
                  <div className="w-12 h-1 bg-blue-500 rounded-full my-4"></div>
                  <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                    Nossa plataforma exclusiva garante que cada cliente visualize estritamente os seus próprios instrumentos, laudos e prazos. Impedindo vazamentos de dados regulatórios e mantendo logs detalhados de todas as ações para fins de auditoria de conformidade.
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION: NOSSA HISTÓRIA */}
            <section id="sobre" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 border-t border-slate-100">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-mono font-bold tracking-widest text-blue-600 uppercase">Trajetória e Credibilidade</span>
                <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900">
                  Nossa História
                </h2>
                <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
                <p className="text-slate-600 text-sm leading-relaxed pt-2">
                  Fundada em 1998, a COMANINS construiu um legado de inovação, rigor técnico e soluções integradas no polo petroquímico e industrial.
                </p>
              </div>

              {/* Vertical Connected Timeline */}
              <div className="relative pl-6 sm:pl-10 space-y-8 sm:space-y-10 before:absolute before:left-[15px] sm:before:left-[23px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-600 before:via-blue-400 before:to-blue-600">
                {/* 1998 */}
                <div className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Award className="h-4 w-4" />
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-display font-black text-blue-600 tracking-tight">1998</span>
                        <span className="h-4 w-px bg-slate-200"></span>
                        <h3 className="font-bold text-base text-slate-900">Fundação e Inovação em Camaçari</h3>
                      </div>
                      <span className="text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                        Marco Inicial
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Criada em 1998, a Comanins entra na área de metrologia buscando criar um diferencial diante de seus concorrentes no que diz respeito à aferição de manômetros e termômetros, implantando no município de Camaçari, não apenas um serviço de simples calibração/ajuste, mas sim a manutenção de instrumentos com troca de sobressalentes.
                    </p>
                  </div>
                </div>

                {/* 2000 */}
                <div className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Settings className="h-4 w-4" />
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-display font-black text-blue-600 tracking-tight">2000</span>
                        <span className="h-4 w-px bg-slate-200"></span>
                        <h3 className="font-bold text-base text-slate-900">Parcerias & Expansão</h3>
                      </div>
                      <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                        Turbomáquinas & Bently Nevada
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Fechamos parceria com a empresa de Manutenção de Turbomáquinas Turbotech / Hoerbiger, desenvolvendo atividades de instrumentação fina com intervenção em sensores Bently Nevada (GE), sensores de temperatura e interface de máquinas. Expandimos também para serviços de manutenção em válvulas de Sistema Blanketing N2 para inertização de tanques.
                    </p>
                  </div>
                </div>

                {/* 2003 */}
                <div className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div className="bg-white p-6 sm:p-7 rounded-2xl border border-blue-200/80 shadow-sm hover:shadow-md transition-all space-y-3 bg-gradient-to-br from-white via-white to-blue-50/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-display font-black text-blue-600 tracking-tight">2003</span>
                        <span className="h-4 w-px bg-slate-200"></span>
                        <h3 className="font-bold text-base text-slate-900">Contrato Braskem S.A.</h3>
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                        13.000 Instrumentos Industriais
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                      Em 2003, a COMANINS alcançou um importante marco em sua trajetória ao firmar contrato com a Braskem S.A. – Regional Bahia. O acordo contemplava a manutenção de aproximadamente 13 mil instrumentos industriais, consolidando nossa experiência técnica e fortalecendo nossa atuação no setor de instrumentação e manutenção industrial. Essa parceria representou um avanço significativo para a empresa, reafirmando nosso compromisso com a qualidade, a segurança e a confiabilidade dos serviços prestados.
                    </p>
                  </div>
                </div>

                {/* 2018 */}
                <div className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ShoppingBag className="h-4 w-4" />
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-display font-black text-blue-600 tracking-tight">2018</span>
                        <span className="h-4 w-px bg-slate-200"></span>
                        <h3 className="font-bold text-base text-slate-900">Comercialização & Estoque Próprio</h3>
                      </div>
                      <span className="text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                        Fornecimento Dinâmico
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Damos início à comercialização de venda de manômetros e termômetros industriais, oferecendo aos nossos parceiros uma grande variedade de equipamentos qualificados a pronta entrega de nosso estoque para atendimento dinâmico.
                    </p>
                  </div>
                </div>

                {/* 2026 */}
                <div className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Building2 className="h-4 w-4" />
                  </div>

                  <div className="bg-white p-6 sm:p-7 rounded-2xl border border-blue-200/80 shadow-sm hover:shadow-md transition-all space-y-3 bg-gradient-to-br from-white via-white to-blue-50/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-display font-black text-blue-600 tracking-tight">2026</span>
                        <span className="h-4 w-px bg-slate-200"></span>
                        <h3 className="font-bold text-base text-slate-900">Parceria Acelen – Refinaria de Mataripe</h3>
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                        +10.000 Instrumentos Óleo & Gás
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                      Em 2026, a COMANINS alcançou mais um importante marco em sua trajetória ao firmar parceria com a Acelen para atuação na Refinaria de Mataripe. O contrato contempla o gerenciamento de mais de 10 mil instrumentos industriais, fortalecendo nossa presença no setor de óleo e gás e reafirmando nosso compromisso com a excelência técnica, a segurança operacional e a confiabilidade dos serviços prestados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bento Grid Differentials */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                {/* Differential 1 */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit border border-blue-100">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Manutenção de Máxima Sobrevivência</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Realizamos a troca cirúrgica de sobressalentes cruciais (como escalas, engrenagens, ponteiros, vidro e borrachas de vedação), garantindo o máximo aproveitamento do instrumento sem custos de substituição integral.
                  </p>
                </div>

                {/* Differential 2 */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit border border-blue-100">
                    <Package className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Higienização & Embalagem Rastreável</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Somos os únicos a realizar higienização de todos os instrumentos que entram para manutenção. O instrumento é entregue protegido por caixa de papelão com uma etiqueta frontal informativa completa, facilitando a identificação e o armazenamento.
                  </p>
                </div>

                {/* Differential 3 */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit border border-blue-100">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Laboratórios e Equipe CFT</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Localizada no Polo de Apoio Industrial (“Poloplast”) em Camaçari-BA (Rua A3 N° 09), nossa sede possui dois laboratórios modernos para calibração/aferição de pressão (fluidos como nitrogênio, ar, óleo ou água) e temperatura, com profissionais credenciados junto ao CFT e padrões rastreados RBC.
                  </p>
                </div>
              </div>
            </section>


          </div>
        )}

        {/* TAB 2: SERVICES */}
        {activeTab === 'services' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
            <div className="text-center">
              <span className="text-xs font-mono font-bold tracking-widest text-blue-600 uppercase">Capabilidade e Normas</span>
              <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900 mt-2">Detalhamento dos Serviços Técnicos</h2>
              <p className="text-slate-600 mt-4 max-w-2xl mx-auto text-sm">
                Conheça os limites de medição, métodos de ensaio e padrões de alta tecnologia disponíveis em nossos laboratórios industriais de metrologia.
              </p>
            </div>

            {/* Pressao Details */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <Gauge className="h-8 w-8 text-blue-600" />
                <h3 className="text-2xl font-display font-bold text-slate-900">Capacidade Metrológica - Pressão</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 uppercase font-mono tracking-wider text-xs">Especificações da Grandeza</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Nossa infraestrutura permite calibrar instrumentos desde vácuo profundo até altas pressões hidráulicas, abrangendo as unidades mais comuns do mercado industrial (bar, psi, Pa, kPa, MPa, kgf/cm², mmHg, inHg).
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Faixa de Vácuo:</span>
                      <span className="text-slate-600 font-mono">-0,95 bar a 0 bar</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Faixa Hidráulica:</span>
                      <span className="text-slate-600 font-mono">0 bar a 700 bar (10.000 psi)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Faixa Pneumática:</span>
                      <span className="text-slate-600 font-mono">0 bar a 40 bar</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 uppercase font-mono tracking-wider text-xs">Métodos de Ensaio e Normas</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Seguimos estritamente as portarias e normas aplicáveis, como a **NBR 14105** (Manômetros com sensor de elemento elástico) e diretrizes internacionais para manômetros digitais e transmissores com barramento industrial.
                  </p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">✓</span>
                      Avaliação de histerese por ciclo de subida e descida.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">✓</span>
                      Determinação de erro de repetitividade e linearidade.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">✓</span>
                      Calibração de instrumentos de processo com ajuste eletrônico e HART.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Temperatura Details */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <Thermometer className="h-8 w-8 text-blue-600" />
                <h3 className="text-2xl font-display font-bold text-slate-900">Capacidade Metrológica - Temperatura</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 uppercase font-mono tracking-wider text-xs">Especificações da Grandeza</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Nossos laboratórios possuem poços de calibração secos (dry blocks), banhos líquidos agitados e termômetros digitais padrões com sensores de Platina calibrados RBC de alta exatidão, cobrindo amplas faixas de temperatura industrial.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Faixa Criogênica e Frio:</span>
                      <span className="text-slate-600 font-mono">-40 °C a 0 °C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Faixa Alta Temperatura:</span>
                      <span className="text-slate-600 font-mono">0 °C a 650 °C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Resolução de Medição Padrão:</span>
                      <span className="text-slate-600 font-mono">até 0,01 °C</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 uppercase font-mono tracking-wider text-xs">Normas e Sensores Atendidos</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Executamos calibração por comparação de acordo com a norma **IEC 60751** para sensores do tipo Termorresistências (RTD) e tabelas de referência internacionais de milivoltagem para termopares industriais.
                  </p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">✓</span>
                      Medição de resistência ôhmica ($\Omega$) x Temperatura para PT100.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">✓</span>
                      Calibração de transmissores de temperatura montados no cabeçote.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 font-bold">✓</span>
                      Calibração de registradores de canais de dados de temperatura.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Manutencao Section */}
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2 max-w-2xl">
                  <span className="text-xs uppercase tracking-widest font-bold text-blue-400 font-mono">Manutenção Associada</span>
                  <h3 className="text-2xl font-display font-bold">Ajuste e Reparo de Equipamentos</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Instrumentos com erros fora da tolerância exigida não precisam ser descartados. Nossa equipe realiza ajuste físico de ponteiro em manômetros, ajuste de span eletrônico via software em transmissores e troca de conectores em termopares, devolvendo o instrumento calibrado e pronto para uso seguro.
                  </p>
                </div>
                <div>
                  <button 
                    onClick={() => { setActiveTab('quote'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="whitespace-nowrap px-6 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Solicitar Reparo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QUOTE (Solicitar Orçamento / Contato) */}
        {activeTab === 'quote' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <button 
              onClick={() => setActiveTab('home')}
              className="mb-6 flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o site
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Contact info info */}
              <div className="lg:col-span-2 bg-slate-900 text-white p-6 md:p-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-display font-bold text-white tracking-tight">Informações de Contato</h3>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      Fale diretamente com nossa central técnica de atendimento para agendar calibrações em laboratório ou serviços metrológicos em campo.
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Atendimento WhatsApp Card */}
                    <a 
                      href="https://wa.me/557136210311"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 bg-emerald-950/20 hover:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/25 hover:border-emerald-500/50 transition-all duration-200 group cursor-pointer shadow-sm"
                    >
                      <div className="w-9 h-9 bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Phone className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-emerald-400 uppercase font-mono tracking-wider font-extrabold">Atendimento WhatsApp</span>
                        <span className="font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors text-xs sm:text-sm mt-0.5">+55 71 3621-0311</span>
                      </div>
                    </a>

                    {/* E-mail Comercial Card */}
                    <div className="flex items-center space-x-3 bg-slate-800/25 hover:bg-slate-800/40 p-3 rounded-xl border border-slate-850 hover:border-slate-700 transition-all duration-200 group min-w-0 w-full shadow-sm">
                      <div className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Mail className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex flex-col min-w-0 w-full overflow-hidden">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider font-extrabold">E-mail Comercial</span>
                        <span className="font-semibold text-slate-200 break-all text-xs sm:text-sm block truncate mt-0.5" title="comercial@comanins.com.br">comercial@comanins.com.br</span>
                      </div>
                    </div>

                    {/* Endereço Card */}
                    <div className="flex items-center space-x-3 bg-slate-800/25 hover:bg-slate-800/40 p-3 rounded-xl border border-slate-850 hover:border-slate-700 transition-all duration-200 group shadow-sm">
                      <div className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        <MapPin className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider font-extrabold">Endereço</span>
                        <span className="font-semibold text-slate-200 text-xs sm:text-sm mt-0.5 leading-snug">Rua A3, N° 09, Poloplast, Camaçari-Ba</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 font-mono">CEP. 42801-581</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500 font-mono mt-6">
                  <span className="uppercase tracking-wider font-bold">Horário de Funcionamento:</span>
                  <span className="block text-slate-300 font-sans font-medium mt-1 text-xs">Segunda a Sexta: 07:30 às 17:00</span>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-3 p-8 md:p-10 bg-slate-50/30">
                <h3 className="text-xl font-display font-bold text-slate-900 mb-6">Envie uma Mensagem ou Solicitação</h3>
                
                {submitSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold shadow-inner">
                      ✓
                    </div>
                    <h4 className="font-bold text-emerald-900 text-lg">Solicitação Enviada!</h4>
                    <p className="text-emerald-700 text-sm leading-relaxed">
                      Recebemos sua mensagem com sucesso. Nossa equipe comercial e técnica analisará suas necessidades e retornará o contato o mais rápido possível.
                    </p>
                    <button 
                      onClick={() => setSubmitSuccess(false)}
                      className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-blue-600 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Enviar nova mensagem
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5 text-sm">
                    {submitError && (
                      <div className="bg-rose-50 text-rose-700 p-3.5 rounded-lg border border-rose-150">
                        {submitError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Seu Nome *</label>
                        <input 
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none"
                          placeholder="Ex: Pedro Silva"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Sua Empresa</label>
                        <input 
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none"
                          placeholder="Ex: Nome da sua Indústria"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">E-mail Corporativo *</label>
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none"
                          placeholder="Ex: pedro@empresa.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Telefone / WhatsApp</label>
                        <input 
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(maskPhone(e.target.value))}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none"
                          placeholder="Ex: (71) 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Setor / Assunto Principal</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none"
                      >
                        <option value="calibracao">Serviços de Calibração (Metrologia)</option>
                        <option value="manutencao">Manutenção ou Reparo de Instrumentos</option>
                        <option value="vendas">Comércio / Venda de Instrumentos Padrão</option>
                        <option value="outros">Dúvidas Gerais ou Outros Assuntos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Descrição das Necessidades *</label>
                      <textarea 
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
                        placeholder="Ex: Preciso de orçamento para calibração de 10 manômetros de 0 a 10 bar, e 3 PT100 com faixa de 0 a 100 graus."
                      ></textarea>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <input 
                        id="contact-lgpd-consent"
                        type="checkbox"
                        checked={lgpdConsent}
                        onChange={(e) => setLgpdConsent(e.target.checked)}
                        className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-blue-650 focus:ring-blue-500/30 accent-blue-600 cursor-pointer"
                        required
                      />
                      <label htmlFor="contact-lgpd-consent" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                        Estou de acordo em fornecer meu nome, e-mail corporativo e telefone para que a COMANINS retorne meu contato e envie orçamentos, conforme a{' '}
                        <button 
                          type="button"
                          onClick={() => setIsPrivacyOpen(true)}
                          className="text-blue-600 hover:text-blue-700 hover:underline font-bold transition-all focus:outline-none"
                        >
                          Política de Privacidade (LGPD)
                        </button>.
                      </label>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center px-4 py-3.5 border border-transparent rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Solicitação Comercial
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-900">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <ComaninsLogo size={130} src={customLogo} color="#ffffff" className="opacity-95 max-h-12" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Especialistas industriais em sistemas de metrologia, calibração rastreada de temperatura e pressão, e monitoramento avançado Bently Nevada desde 1998.
              </p>
            </div>

            <div>
              <h4 className="font-display text-white font-bold text-xs uppercase tracking-wider mb-4">Serviços</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Calibração de Pressão</button></li>
                <li><button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Calibração de Temperatura</button></li>
                <li><button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Sistemas Bently Nevada</button></li>
                <li><button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Válvulas de Blanketing (N2)</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display text-white font-bold text-xs uppercase tracking-wider mb-4">Contato</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><span className="text-slate-400">Fone:</span> (71) 3621-0311</li>
                <li><span className="text-slate-400">Email:</span> comercial@comanins.com.br</li>
                <li><span className="text-slate-400">Endereço:</span> Rua A3, N° 09, Poloplast, Camaçari-Ba</li>
                <li><span className="text-slate-400">CEP:</span> 42801-581</li>
              </ul>
            </div>

            <div>
              <h4 className="font-display text-white font-bold text-xs uppercase tracking-wider mb-4">Acesso Oficial</h4>
              <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="p-1.5 bg-white rounded-lg shadow-sm flex-shrink-0">
                  <QRCodeSVG value="https://www.comanins.com.br" size={60} level="M" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">Acesse no Celular</span>
                  <span className="text-[10px] text-blue-400 font-mono font-semibold block mt-0.5">www.comanins.com.br</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Aponte a câmera do seu celular para carregar o site.</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-display text-white font-bold text-xs uppercase tracking-wider mb-4">Governança e LGPD</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nosso portal interno e de clientes segue rigorosamente as diretrizes da LGPD (Lei Geral de Proteção de Dados), garantindo privacidade total aos laudos técnicos e aos demonstrativos financeiros.
              </p>
              <div className="mt-3">
                <button onClick={() => setIsPrivacyOpen(true)} className="text-xs text-blue-500 hover:text-blue-400 font-semibold transition-colors cursor-pointer">
                  • Política de Privacidade (LGPD)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} COMANINS S/A. Todos os direitos reservados.</span>
            <span className="mt-2 sm:mt-0 font-mono">CNPJ: 02.401.101/0001-08 | Camaçari - BA</span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/557136210311"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl hover:shadow-emerald-600/30 hover:scale-110 active:scale-95 transition-all duration-300 z-45 flex items-center justify-center gap-2 group print:hidden cursor-pointer border border-emerald-500/20"
        title="Conversar no WhatsApp"
      >
        <Phone className="h-6 w-6 stroke-[2.5]" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-sm whitespace-nowrap">
          Conversar no WhatsApp
        </span>
      </a>

      <CookieConsentBanner onOpenPrivacyPolicy={() => setIsPrivacyOpen(true)} />
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
