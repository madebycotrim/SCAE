import { Plus } from 'lucide-react';

interface BarraSelecaoLoteProps {
    quantidade: number;
    aoPromover: () => void;
    aoCancelar: () => void;
}

export default function BarraSelecaoLote({ quantidade, aoPromover, aoCancelar }: BarraSelecaoLoteProps) {
    if (quantidade === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md bg-opacity-95">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecionados</span>
                    <span className="text-lg font-black">{quantidade} Alunos</span>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div className="flex gap-2">
                    <button
                        onClick={aoPromover}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Enturmar em Lote
                    </button>
                    <button
                        onClick={aoCancelar}
                        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
