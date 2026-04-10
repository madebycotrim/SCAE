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
                {/* Logo CATRAKI Premium */}
                <div className="flex items-center gap-3.5 group cursor-pointer select-none">
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${temaEscuro ? 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-lg shadow-indigo-900/20' : 'bg-[#0d1f3c] shadow-lg shadow-blue-900/20'}`}>
                        <ShieldCheck className="w-5 h-5 text-white relative z-10" />
                        <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="flex flex-col -gap-1">
                        <span className={`text-xl font-black tracking-tight leading-none flex items-center gap-0.5 transition-colors ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            CATRAKI
                            <span className="relative flex h-2 w-2 mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 shadow-sm shadow-blue-600/50"></span>
                            </span>
                        </span>
                        <span className={`text-[8px] font-bold uppercase tracking-[0.3em] opacity-40 ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            Inteligência Edge
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
                        <button onClick={aoAbrirModalSobre} className={`transition-colors ${temaEscuro ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            Sobre a Catraki
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

