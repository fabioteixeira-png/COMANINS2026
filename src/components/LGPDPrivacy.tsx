import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Info, X, Check, Eye } from 'lucide-react';

// Cookie types
interface CookiePreferences {
  necessary: boolean;
  analytical: boolean;
  marketing: boolean;
}

interface CookieConsentBannerProps {
  onOpenPrivacyPolicy: () => void;
}

export function CookieConsentBanner({ onOpenPrivacyPolicy }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytical: true,
    marketing: false,
  });

  useEffect(() => {
    const storedConsent = localStorage.getItem('comanins_cookie_consent');
    if (!storedConsent) {
      // Delay slightly to look elegant
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allPreferences = { necessary: true, analytical: true, marketing: true };
    localStorage.setItem('comanins_cookie_consent', JSON.stringify(allPreferences));
    localStorage.setItem('comanins_lgpd_accepted_at', new Date().toISOString());
    setVisible(false);
  };

  const handleRejectAll = () => {
    const minPreferences = { necessary: true, analytical: false, marketing: false };
    localStorage.setItem('comanins_cookie_consent', JSON.stringify(minPreferences));
    localStorage.setItem('comanins_lgpd_accepted_at', new Date().toISOString());
    setVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('comanins_cookie_consent', JSON.stringify(preferences));
    localStorage.setItem('comanins_lgpd_accepted_at', new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div id="lgpd-cookie-banner" className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-xl bg-slate-900/95 border border-slate-800 text-white p-6 rounded-2xl shadow-2xl z-50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Cookie className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-display font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
              <span>Privacidade & Cookies (LGPD)</span>
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold">Conforme</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              A COMANINS respeita sua privacidade. Nós utilizamos cookies para melhorar a navegação, analisar o tráfego do site e personalizar conteúdos de acordo com a nossa{' '}
              <button 
                onClick={onOpenPrivacyPolicy}
                className="text-blue-400 hover:text-blue-300 underline font-semibold transition-colors focus:outline-none"
              >
                Política de Privacidade
              </button>.
            </p>
          </div>
          <button 
            onClick={handleRejectAll}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title="Fechar e usar cookies essenciais apenas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showPreferences && (
          <div className="border-t border-slate-800 pt-4 mt-2 space-y-3.5 animate-in fade-in duration-200">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Personalizar Preferências</h5>
            
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4 bg-slate-950/45 p-3 rounded-xl border border-slate-800/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200">Essenciais & Segurança</span>
                  <span className="text-[8px] bg-slate-800 text-slate-400 font-mono px-1 rounded uppercase font-bold">Obrigatório</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Necessários para o funcionamento básico das sessões de portal, segurança do formulário e autenticação.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked 
                disabled 
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/30 accent-blue-600 cursor-not-allowed"
              />
            </div>

            {/* Analytical */}
            <div className="flex items-start justify-between gap-4 bg-slate-950/45 p-3 rounded-xl border border-slate-800/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Analíticos & Estatísticas</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Permitem compreender o comportamento de navegação para melhorar o desempenho e usabilidade do laboratório online.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={preferences.analytical}
                onChange={(e) => setPreferences(prev => ({ ...prev, analytical: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/30 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 bg-slate-950/45 p-3 rounded-xl border border-slate-800/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Marketing & Comercial</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Utilizados para rastrear o sucesso de campanhas de orçamento e segmentar contatos comerciais autorizados.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={preferences.marketing}
                onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/30 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button 
            onClick={() => setShowPreferences(!showPreferences)}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors text-left flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {showPreferences ? 'Ocultar Detalhes' : 'Gerenciar Preferências'}
          </button>
          
          <div className="flex items-center gap-2 self-end">
            {showPreferences ? (
              <>
                <button 
                  onClick={handleRejectAll}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
                >
                  Recusar Todos
                </button>
                <button 
                  onClick={handleSavePreferences}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/10"
                >
                  Confirmar Escolha
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleRejectAll}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Apenas Essenciais
                </button>
                <button 
                  onClick={handleAcceptAll}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/10"
                >
                  Aceitar Todos
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative border border-slate-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
                Declaração de Privacidade e LGPD
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">
                Última Atualização: 21 de Julho de 2026
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Fechar"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto text-sm leading-relaxed text-slate-600 space-y-6 max-h-[60vh] font-sans">
          
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 space-y-1">
            <span className="font-bold flex items-center gap-1 font-mono uppercase tracking-wider">
              <Info className="h-3.5 w-3.5" /> Informação Legal Relevante
            </span>
            <p>
              Esta declaração formaliza o compromisso da <strong>COMANINS S/A</strong> com a transparência, segurança cibernética e a conformidade integral perante a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).
            </p>
          </div>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider font-mono">
              1. Quem é o Controlador dos Dados?
            </h4>
            <p>
              A <strong>COMANINS S/A</strong>, pessoa jurídica de direito privado inscrita no CNPJ sob o nº <strong>02.401.101/0001-08</strong>, com sede e laboratórios em Santo André - SP e filial técnica em Camaçari - BA, é a <strong>Controladora</strong> dos dados pessoais tratados através deste portal e serviços integrados.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider font-mono">
              2. Quais Dados Coletamos e para quais Finalidades?
            </h4>
            <p>
              Tratamos o mínimo necessário de dados pessoais para executar nossas atividades de calibração metrológica e contato comercial, de acordo com as seguintes bases legais:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-150 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                    <th className="p-2.5 font-bold border-b border-slate-150">Origem / Canal</th>
                    <th className="p-2.5 font-bold border-b border-slate-150">Dados Tratados</th>
                    <th className="p-2.5 font-bold border-b border-slate-150">Finalidade Operacional</th>
                    <th className="p-2.5 font-bold border-b border-slate-150">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Formulário de Orçamento / Contato</td>
                    <td className="p-2.5">Nome completo, e-mail corporativo, telefone/WhatsApp, nome da empresa.</td>
                    <td className="p-2.5">Responder solicitações comerciais, elaborar propostas e contatos técnicos para calibração.</td>
                    <td className="p-2.5 text-blue-700 font-semibold">Consentimento / Legítimo Interesse (Art. 7, IX)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Portal do Cliente (Autenticação)</td>
                    <td className="p-2.5">Nome corporativo, CNPJ do cliente, e-mail de acesso e senha de segurança.</td>
                    <td className="p-2.5">Fornecer acesso seguro e exclusivo para consulta e download de certificados oficiais de calibração.</td>
                    <td className="p-2.5 text-blue-700 font-semibold">Execução de Contrato (Art. 7, V)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Laudos e Certificados Gerados</td>
                    <td className="p-2.5">Nome do técnico responsável, registro profissional, assinatura e dados cadastrais da empresa cliente.</td>
                    <td className="p-2.5">Emissão de certificados de conformidade com validade legal e rastreabilidade metrológica (CFT/Inmetro).</td>
                    <td className="p-2.5 text-blue-700 font-semibold">Cumprimento de Obrigação Legal ou Regulatória (Art. 7, II)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider font-mono">
              3. Direitos dos Titulares de Dados (Art. 18 da LGPD)
            </h4>
            <p>
              Você, como titular de dados pessoais, possui controle total sobre suas informações coletadas no ambiente COMANINS. É seu direito obter mediante requisição:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Confirmação da existência de tratamento dos seus dados.</li>
              <li>Acesso detalhado aos dados arquivados.</li>
              <li>Correção de informações incompletas, inexatas ou desatualizadas.</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
              <li>Revogação do consentimento concedido anteriormente para contatos comerciais.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider font-mono">
              4. Compartilhamento e Transferência de Dados
            </h4>
            <p>
              A COMANINS <strong>nunca comercializa ou compartilha</strong> seus dados com terceiros para fins de marketing. O compartilhamento ocorre única e exclusivamente nos seguintes cenários:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Armazenamento seguro em nuvem com provedores homologados de tecnologia.</li>
              <li>Para cumprimento de fiscalização técnica metrológica (órgãos auditores de qualidade ISO 17025 e Inmetro) com o intuito de atestar a validade dos laudos.</li>
              <li>Por determinação legal, judicial ou de autoridades administrativas de proteção de dados.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider font-mono">
              5. Medidas de Segurança Cibernética
            </h4>
            <p>
              Implementamos protocolos avançados de proteção contra acessos não autorizados, incidentes de vazamento ou alteração indevida de dados:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Tráfego de rede criptografado via protocolo HTTPS/TLS.</li>
              <li>Controle rígido de acessos ao painel de calibrações restrito apenas a técnicos autorizados.</li>
              <li>Armazenamento de senhas de acesso do portal utilizando rotinas de segurança.</li>
              <li>Backup persistente diário para evitar a perda indesejada de registros de conformidade.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider font-mono">
              6. Contato do Encarregado de Proteção de Dados (DPO)
            </h4>
            <p>
              Se você acredita que seus dados foram tratados de forma inadequada ou deseja exercer qualquer direito previsto no Art. 18 da LGPD, entre em contato direto com o nosso <strong>Encarregado de Dados (DPO)</strong>:
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
              <div className="font-semibold text-slate-800">E-mail de Contato:</div>
              <a href="mailto:dpo@comanins.com.br" className="text-blue-600 hover:underline font-mono">dpo@comanins.com.br</a>
              <div className="font-semibold text-slate-800 mt-2">Canal Físico:</div>
              <div>A/C: Comitê de Proteção de Dados e Metrologia Legal - COMANINS S/A.</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} COMANINS. Comprometidos com a ética e conformidade legal.
          </p>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
