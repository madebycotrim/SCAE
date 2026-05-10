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
                <div className="flex items-center group cursor-pointer select-none" onClick={() => window.location.href = '/'}>
                    <span className={`text-2xl font-black tracking-tighter uppercase italic transition-colors ${temaEscuro ? 'text-white' : 'text-marinho'}`}>
                        Catraki
                    </span>
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

                    <button
                        onClick={aoAlternarTema}
                        className={`p-2 rounded-full transition-colors ${temaEscuro ? 'bg-slate-800 text-yellow-500 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                        aria-label="Alternar tema escuro"
                    >
                        {temaEscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Botão de Login Admin */}
                    <button 
                        onClick={() => {
                            const elemento = document.getElementById('identificacao');
                            elemento?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${temaEscuro ? 'bg-eletrico text-white hover:bg-blue-500 shadow-lg shadow-eletrico/20' : 'bg-[#0d1f3c] text-white hover:bg-[#152a4d] shadow-lg shadow-marinho/10'}`}
                    >
                        <ShieldCheck size={16} />
                        Acesso Administrativo
                    </button>
                </div>
            </div>
        </header>
    );
}

