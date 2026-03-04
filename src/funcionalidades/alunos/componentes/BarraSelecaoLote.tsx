import { Plus } from 'lucide-react';

interface BarraSelecaoLoteProps {
    quantidade: number;
    aoPromover: () => void;
    aoCancelar: () => void;
}

export default function BarraSelecaoLote({ quantidade, aoPromover, aoCancelar }: BarraSelecaoLoteProps) {
    if (quantidade === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-5 border border-slate-800 backdrop-blur-md bg-opacity-98">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Selecionados</span>
                    <span className="text-sm font-black leading-none">{quantidade} Alunos</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex gap-2">
                    <button
                        onClick={aoPromover}
                        className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus size={14} /> Enturmar
                    </button>
                    <button
                        onClick={aoCancelar}
                        className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
