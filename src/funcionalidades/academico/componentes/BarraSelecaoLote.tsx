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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 border border-white/5">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Seleção</span>
                    <span className="text-sm font-bold leading-none">{quantidade} {quantidade === 1 ? 'Selecionado' : 'Selecionados'}</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex gap-2">
                    <button
                        onClick={aoImprimir}
                        className="h-9 px-4 bg-slate-800 text-white hover:bg-slate-700 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Printer size={14} /> Imprimir
                    </button>
                    <button
                        onClick={aoPromover}
                        className="h-9 px-4 bg-white text-slate-950 hover:bg-slate-100 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus size={14} /> Enturmar
                    </button>
                    <button
                        onClick={aoCancelar}
                        className="h-9 px-4 bg-transparent text-slate-500 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
