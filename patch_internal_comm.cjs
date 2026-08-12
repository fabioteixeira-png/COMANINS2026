const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

// Add ArrowLeft import
code = code.replace(
  'import { Plus, Search, MessageSquare, Paperclip, Send, CheckCircle, Clock, FileText, User, X, Mail, Trash2 } from "lucide-react";',
  'import { Plus, Search, MessageSquare, Paperclip, Send, CheckCircle, Clock, FileText, User, X, Mail, Trash2, ArrowLeft } from "lucide-react";'
);

// Modify outer container
code = code.replace(
  '<div className="bg-slate-50 min-h-[calc(100vh-4rem)] p-6 animate-fade-in flex space-x-6">',
  '<div className="bg-slate-50 h-[calc(100dvh-4rem)] md:min-h-[calc(100vh-4rem)] p-2 md:p-6 animate-fade-in flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 overflow-hidden md:overflow-visible">'
);

// Modify List Column container
code = code.replace(
  '<div className="w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">',
  '<div className={`w-full md:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)] ${selectedTicket ? "hidden md:flex" : "flex"}`}>'
);

// Modify Detail Column container
code = code.replace(
  '<div className="w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">',
  '<div className={`w-full md:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] ${!selectedTicket ? "hidden md:flex" : "flex"}`}>'
);

// Modify Detail Column Header
const headerTarget = `            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="font-display font-bold text-xl text-slate-800">{selectedTicket.title}</h2>
                  <span className={\`text-xs font-bold px-2 py-1 rounded-md \${
                    selectedTicket.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                    selectedTicket.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }\`}>
                    {selectedTicket.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-slate-600 flex items-center space-x-4">
                  <span className="flex items-center"><User className="h-4 w-4 mr-1 text-slate-400" /> {selectedTicket.creatorName}</span>
                  <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-slate-400" /> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">`;

const headerReplace = `            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start md:items-center space-x-3 w-full md:w-auto">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center space-x-2 md:space-x-3 mb-1 md:mb-2">
                    <h2 className="font-display font-bold text-base md:text-xl text-slate-800 line-clamp-1">{selectedTicket.title}</h2>
                    <span className={\`text-[10px] md:text-xs font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-md shrink-0 \${
                      selectedTicket.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                      selectedTicket.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }\`}>
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] md:text-sm text-slate-600 flex items-center space-x-3 md:space-x-4">
                    <span className="flex items-center truncate"><User className="h-3 w-3 md:h-4 md:w-4 mr-1 text-slate-400 shrink-0" /> <span className="truncate">{selectedTicket.creatorName}</span></span>
                    <span className="flex items-center shrink-0"><Clock className="h-3 w-3 md:h-4 md:w-4 mr-1 text-slate-400" /> {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">`;

code = code.replace(headerTarget, headerReplace);

// New Ticket Modal layout fixes for mobile
const modalTarget = `      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-royal-blue/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-royal-blue" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Novo Chamado</h2>
              </div>
              <button 
                onClick={() => setShowNewTicketModal(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">`;

const modalReplace = `      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[90vh]">
            <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-royal-blue/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-royal-blue" />
                </div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">Novo Chamado</h2>
              </div>
              <button 
                onClick={() => setShowNewTicketModal(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">`;

code = code.replace(modalTarget, modalReplace);

const formFooterTarget = `              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-royal-blue text-white rounded-lg font-bold hover:bg-royal-dark transition-colors shadow-sm"
                >
                  Abrir Chamado
                </button>
              </div>
            </form>`;

const formFooterReplace = `              </div>
              <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-royal-blue text-white rounded-lg font-bold hover:bg-royal-dark transition-colors shadow-sm text-sm md:text-base"
                >
                  Abrir Chamado
                </button>
              </div>
            </form>`;

code = code.replace(formFooterTarget, formFooterReplace);

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
