import { ShieldCheck, Sun, Moon } from 'lucide-react';

interface CabecalhoInicialProps {
    temaEscuro: boolean;
    aoAlternarTema: () => void;
    aoAbrirModalSobre: () => void;
    aoAbrirModalContato: () => void;
}

export function CabecalhoInicial({ temaEscuro, aoAlternarTema, aoAbrirModalSobre, aoAbrirModalContato }: CabecalhoInicialProps) {
    return (
        <header className={`sticky top-0 z-[100] w-full border-b backdrop-blur-xl transition-all duration-300 ${temaEscuro ? 'bg-[#0B0F19]/80 border-slate-800/60' : 'bg-[#F8FAFC]/80 border-slate-200/60'}`}>
            <div className="py-4 px-6 md:px-8 flex items-center justify-between max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-600/10">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-xl font-bold tracking-tight transition-colors ${temaEscuro ? 'text-white' : 'text-slate-800'}`}>
                        SCAE
                    </span>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
                        <button onClick={aoAbrirModalSobre} className={`transition-colors ${temaEscuro ? 'text-slate-300 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>
                            Sobre a SCAE
                        </button>
                        <div className={`h-4 w-px ${temaEscuro ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <button onClick={aoAbrirModalContato} className={`transition-colors ${temaEscuro ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                            Entrar em Contato
                        </button>
                    </div>

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={aoAlternarTema}
                        className={`p-2 rounded-full transition-colors ${temaEscuro ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200'}`}
                        aria-label="Alternar tema escuro"
                    >
                        {temaEscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </header>
    );
}
