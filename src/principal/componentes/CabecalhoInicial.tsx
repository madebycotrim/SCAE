import { ShieldCheck, Sun, Moon } from 'lucide-react';

interface CabecalhoInicialProps {
    temaEscuro: boolean;
    aoAlternarTema: () => void;
    aoAbrirModalSobre: () => void;
    aoAbrirModalContato: () => void;
}

export function CabecalhoInicial({ temaEscuro, aoAlternarTema, aoAbrirModalSobre, aoAbrirModalContato }: CabecalhoInicialProps) {
    return (
        <header className={`sticky top-0 z-[100] w-full border-b backdrop-blur-xl transition-all duration-300 ${temaEscuro ? 'bg-[#0B0F19]/80 border-slate-800/60' : 'bg-white border-slate-100 shadow-suave'}`}>
            <div className="h-16 px-6 md:px-8 flex items-center justify-between max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${temaEscuro ? 'bg-slate-800 border bg-slate-700/60' : 'bg-[#0d1f3c]'}`}>
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-xl font-bold tracking-tight transition-colors ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                        SCAE<span className="text-sky-400">.</span>
                    </span>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
                        <button onClick={aoAbrirModalSobre} className={`transition-colors ${temaEscuro ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            Sobre a SCAE
                        </button>
                        <div className={`h-4 w-px ${temaEscuro ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <button onClick={aoAbrirModalContato} className={`transition-colors ${temaEscuro ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            Entrar em Contato
                        </button>
                    </div>

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={aoAlternarTema}
                        className={`p-2 rounded-full transition-colors ${temaEscuro ? 'bg-slate-800 text-yellow-500 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                        aria-label="Alternar tema escuro"
                    >
                        {temaEscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </header>
    );
}

