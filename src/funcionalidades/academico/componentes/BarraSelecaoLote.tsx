import { Plus, Printer } from 'lucide-react';

interface BarraSelecaoLoteProps {
    quantidade: number;
    aoPromover: () => void;
    aoImprimir: () => void;
    aoCancelar: () => void;
}

export default function BarraSelecaoLote({ quantidade, aoPromover, aoImprimir, aoCancelar }: BarraSelecaoLoteProps) {
    if (quantidade === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-5 border border-slate-800 backdrop-blur-lg bg-opacity-95">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Status do Lote</span>
                    <span className="text-sm font-black leading-none">{quantidade} Alunos</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex gap-2">
                    <button
                        onClick={aoImprimir}
                        className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-700"
                    >
                        <Printer size={14} className="text-indigo-400" /> Imprimir
                    </button>
                    <button
                        onClick={aoPromover}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                        <Plus size={14} /> Enturmar
                    </button>
                    <button
                        onClick={aoCancelar}
                        className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-300 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
