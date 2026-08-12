const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

// 1. Imports
code = code.replace(/import \{ Plus, Search, MessageSquare, Paperclip, Send, CheckCircle, Clock, FileText, User, X, Mail \} from "lucide-react";/,
'import { Plus, Search, MessageSquare, Paperclip, Send, CheckCircle, Clock, FileText, User, X, Mail, Trash2 } from "lucide-react";');

code = code.replace(/import \{ syncInternalTickets, saveInternalTicket, PortalUser \} from "\.\.\/lib\/firebase";/,
'import { syncInternalTickets, saveInternalTicket, deleteInternalTicket, PortalUser } from "../lib/firebase";');

// 2. handleDeleteTicket
const handlerInsert = `
  const handleDeleteTicket = async () => {
    if (!selectedTicket || !isUserAdmin) return;
    if (window.confirm("Tem certeza que deseja excluir este chamado permanentemente? Essa ação não pode ser desfeita.")) {
      try {
        await deleteInternalTicket(selectedTicket.id);
        setSelectedTicket(null);
      } catch (err) {
        console.error("Erro ao excluir", err);
        alert("Falha ao excluir chamado.");
      }
    }
  };

  const handleCloseTicket`;

code = code.replace(/  const handleCloseTicket/g, handlerInsert);

// 3. JSX Buttons
const jsxTarget = `              {selectedTicket.status !== 'finalizado' && (
                <button 
                  onClick={handleCloseTicket}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold text-sm rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Finalizar Chamado</span>
                </button>
              )}`;

const jsxReplace = `              <div className="flex items-center space-x-2">
                {isUserAdmin && (
                  <button 
                    onClick={handleDeleteTicket}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-sm rounded-lg flex items-center space-x-2 transition-colors"
                    title="Excluir Chamado (Apenas Administrador)"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir</span>
                  </button>
                )}
                {selectedTicket.status !== 'finalizado' && (
                  <button 
                    onClick={handleCloseTicket}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold text-sm rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Finalizar Chamado</span>
                  </button>
                )}
              </div>`;

code = code.replace(jsxTarget, jsxReplace);

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
