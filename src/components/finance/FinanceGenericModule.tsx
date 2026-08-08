import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

interface FinanceGenericModuleProps {
  title: string;
  description: string;
  columns: string[];
  data: any[];
  actionLabel?: string;
}

export default function FinanceGenericModule({ title, description, columns, data, actionLabel = "Novo Registro" }: FinanceGenericModuleProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none" />
          </div>
          <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">
            <Filter className="h-4 w-4" />
          </button>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors">
            <Plus className="h-4 w-4" />
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="px-6 py-3 font-semibold">{col}</th>
              ))}
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? data.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50 transition-colors">
                {columns.map((col, colIndex) => {
                  const val = Object.values(item)[colIndex];
                  return (
                    <td key={colIndex} className="px-6 py-4 text-slate-700">
                      {val as React.ReactNode}
                    </td>
                  );
                })}
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button className="p-1 text-slate-400 hover:text-royal-blue"><Edit className="h-4 w-4" /></button>
                    <button className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
