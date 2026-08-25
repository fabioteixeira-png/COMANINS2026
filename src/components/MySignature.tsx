import React, { useState, useRef, useEffect } from 'react';
import { PortalUser, uploadSignatureImage, updatePortalUserDoc } from '../lib/firebase';
import { PenTool, Trash2, Check, AlertCircle } from 'lucide-react';
import SignaturePad from 'react-signature-canvas';

interface MySignatureProps {
  currentUser: PortalUser;
  canEdit?: boolean;
  onUpdateUser: (id: string, updates: Partial<PortalUser>) => void;
}

export default function MySignature({ currentUser, canEdit = false, onUpdateUser }: MySignatureProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const sigCanvas = useRef<any>(null);

  useEffect(() => {
    if (!canEdit) {
      setIsEditing(false);
      return;
    }
    if (!currentUser.signaturePath) {
      setIsEditing(true);
    }
  }, [canEdit, currentUser.signaturePath]);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleSaveSignature = async () => {
    if (!canEdit) {
      setIsEditing(false);
      setErrorMsg('Seu perfil possui somente permissão de visualização em Minha Assinatura.');
      return;
    }
    if (sigCanvas.current?.isEmpty()) {
      setErrorMsg('Por favor, desenhe sua assinatura antes de salvar.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      
      // Converte dataUrl para Blob para upload
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `signature_${currentUser.id}.png`, { type: 'image/png' });
      
      const newVersion = (currentUser.signatureVersion || 0) + 1;
      const downloadURL = await uploadSignatureImage(file, currentUser.id, newVersion);
      
      const updates = {
        signaturePath: downloadURL,
        signatureVersion: newVersion,
        signatureDate: new Date().toISOString()
      };
      
      await updatePortalUserDoc(currentUser.id, updates);
      onUpdateUser(currentUser.id, updates);
      
      setSuccessMsg('Assinatura salva com sucesso!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao salvar assinatura.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded shadow p-6 max-w-2xl mx-auto mt-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <PenTool className="mr-2" size={24} />
        Minha Assinatura
      </h2>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}
      
      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded mb-6 flex items-center">
          <Check className="w-5 h-5 mr-2 flex-shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {!isEditing && currentUser.signaturePath ? (
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded border border-slate-200 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 mb-4 uppercase tracking-wider font-semibold">Assinatura Atual</p>
            <img 
              src={currentUser.signaturePath} 
              alt="Assinatura" 
              className="max-h-48 object-contain bg-white rounded shadow-sm border border-slate-200 p-4"
            />
            <p className="text-xs text-slate-400 mt-4">
              Atualizada em: {new Date(currentUser.signatureDate || '').toLocaleDateString('pt-BR')} (Versão {currentUser.signatureVersion})
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded transition-colors flex items-center justify-center"
            >
              <PenTool className="mr-2" size={20} />
              Substituir Assinatura
            </button>
          )}
        </div>
      ) : canEdit ? (
        <div className="space-y-6">
          <div className="bg-amber-50 text-amber-800 p-4 rounded text-sm mb-4">
            <p className="font-semibold mb-1">Instruções:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Desenhe sua assinatura no quadro abaixo.</li>
              <li>A assinatura será usada nos certificados emitidos.</li>
              <li>Ela será salva com fundo transparente.</li>
            </ul>
          </div>

          <div className="border-2 border-slate-300 rounded overflow-hidden bg-white touch-none">
            <SignaturePad
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair',
                style: { width: '100%', height: '256px' }
              }}
              backgroundColor="rgba(255, 255, 255, 0)"
              penColor="black"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={clearSignature}
              type="button"
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded transition-colors flex items-center justify-center"
              disabled={isSaving}
            >
              <Trash2 className="mr-2" size={20} />
              Limpar
            </button>
            <button
              onClick={handleSaveSignature}
              type="button"
              className="flex-1 bg-royal-blue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : (
                <>
                  <Check className="mr-2" size={20} />
                  Salvar Assinatura
                </>
              )}
            </button>
          </div>
          
          {currentUser.signaturePath && (
            <button
              onClick={() => {
                setIsEditing(false);
                setErrorMsg('');
              }}
              type="button"
              className="w-full text-slate-500 hover:text-slate-700 text-sm font-semibold underline mt-4"
              disabled={isSaving}
            >
              Cancelar e manter assinatura atual
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded p-6 text-center text-slate-600">
          <p className="font-semibold text-slate-800">Nenhuma assinatura cadastrada.</p>
          <p className="text-sm mt-2">Seu perfil possui permissão somente para visualização neste módulo.</p>
        </div>
      )}
    </div>
  );
}
