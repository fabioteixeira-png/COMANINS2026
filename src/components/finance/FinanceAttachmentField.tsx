import React, { useRef, useState } from 'react';
import { Download, ExternalLink, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { FinanceDocumentAttachment, FinanceTransaction } from '../../types';
import { downloadCorporateFile, openCorporateFile } from '../../lib/firebase';

interface FinanceAttachmentFieldProps {
  label: string;
  attachments?: FinanceTransaction['attachments'];
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  canEdit?: boolean;
}

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.txt,.doc,.docx,.xls,.xlsx';

const isStructuredAttachment = (value: unknown): value is FinanceDocumentAttachment => {
  return !!value && typeof value === 'object' && typeof (value as any).storagePath === 'string';
};

const legacyName = (value: string) => {
  try {
    const clean = value.split('?')[0];
    return decodeURIComponent(clean.split('/').pop() || 'Documento');
  } catch {
    return 'Documento';
  }
};

const prettySize = (bytes?: number) => {
  const value = Number(bytes || 0);
  if (!value) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FinanceAttachmentField({ label, attachments = [], pendingFiles, onPendingFilesChange, canEdit = false }: FinanceAttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busyKey, setBusyKey] = useState('');
  const normalized = Array.isArray(attachments) ? attachments : [];

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...pendingFiles];
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_BYTES) {
        alert(`O arquivo ${file.name} excede o limite de 20 MB.`);
        continue;
      }
      if (next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) continue;
      if (normalized.length + next.length >= MAX_FILES) {
        alert(`Cada lançamento financeiro pode ter no máximo ${MAX_FILES} anexos.`);
        break;
      }
      next.push(file);
    }
    onPendingFilesChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const openExisting = async (attachment: NonNullable<FinanceTransaction['attachments']>[number], index: number, download = false) => {
    const key = `${index}-${download ? 'download' : 'open'}`;
    setBusyKey(key);
    try {
      if (isStructuredAttachment(attachment)) {
        if (download) await downloadCorporateFile(attachment.storagePath, attachment.fileName || 'documento');
        else await openCorporateFile(attachment.storagePath);
      } else if (typeof attachment === 'string' && attachment) {
        if (attachment.startsWith('secure-documents/')) {
          if (download) await downloadCorporateFile(attachment, legacyName(attachment));
          else await openCorporateFile(attachment);
        } else {
          window.open(attachment, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error: any) {
      alert(error?.message || 'Não foi possível abrir o documento financeiro.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white p-2 text-slate-600 shadow-sm"><Paperclip className="h-4 w-4" /></div>
          <div>
            <div className="text-xs font-bold text-slate-700">{label}</div>
            <div className="text-[10px] text-slate-500">PDF, imagem, Word ou Excel • até 20 MB por arquivo • documentos preservados para auditoria.</div>
          </div>
        </div>
        {canEdit && (
          <>
            <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={event => addFiles(event.target.files)} />
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
              <Upload className="h-3.5 w-3.5" />Adicionar arquivo
            </button>
          </>
        )}
      </div>

      {(normalized.length > 0 || pendingFiles.length > 0) && (
        <div className="mt-3 space-y-2">
          {normalized.map((attachment, index) => {
            const structured = isStructuredAttachment(attachment);
            const name = structured ? attachment.fileName : legacyName(String(attachment));
            const meta = structured ? [prettySize(attachment.size), attachment.sha256 ? `SHA ${attachment.sha256.slice(0, 10)}…` : ''].filter(Boolean).join(' • ') : 'Documento legado';
            return (
              <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-slate-500" /><div className="min-w-0"><div className="truncate text-xs font-bold text-slate-700">{name}</div><div className="text-[10px] text-slate-400">{meta}</div></div></div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" disabled={!!busyKey} onClick={() => openExisting(attachment, index, false)} title="Abrir" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ExternalLink className="h-3.5 w-3.5" /></button>
                  {structured && <button type="button" disabled={!!busyKey} onClick={() => openExisting(attachment, index, true)} title="Baixar" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Download className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            );
          })}
          {pendingFiles.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <div className="flex min-w-0 items-center gap-2"><Upload className="h-4 w-4 shrink-0 text-blue-600" /><div className="min-w-0"><div className="truncate text-xs font-bold text-blue-900">{file.name}</div><div className="text-[10px] text-blue-600">Será enviado ao salvar • {prettySize(file.size)}</div></div></div>
              <button type="button" onClick={() => onPendingFilesChange(pendingFiles.filter((_, itemIndex) => itemIndex !== index))} title="Remover antes de salvar" className="rounded-lg p-2 text-blue-700 hover:bg-blue-100"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
