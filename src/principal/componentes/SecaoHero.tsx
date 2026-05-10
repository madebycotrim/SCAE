import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { BuscadorEscolas } from './BuscadorEscolas';

interface Props {
    temaEscuro: boolean;
    escolaSelecionada: string | null;
    aoSelecionarEscola: (slug: string) => void;
    aoAbrirModalContato: () => void;
    aoLimparEscola: () => void;
    aoIrParaPerfil: (perfil: 'aluno' | 'gestor') => void;
}

/**
 * Seção de entrada (Hero) com o buscador e portal de identificação.
 */
export const SecaoHero = ({ 
    temaEscuro, 
    escolaSelecionada, 
    aoSelecionarEscola, 
    aoAbrirModalContato, 
    aoLimparEscola,
    aoIrParaPerfil 
}: Props) => {
    return (
        <main id="identificacao" className="relative z-30 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-20 max-w-4xl mx-auto text-center w-full min-h-[calc(100vh-80px)]">
            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
                
                {/* Glow Azul Centralizado atrás do texto para tirar o peso do preto */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-eletrico/5 blur-[120px] rounded-full pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full"
                >
                    <h1 className={`text-6xl md:text-[6.5rem] font-black tracking-tighter mb-8 leading-[0.95] transition-colors ${temaEscuro ? 'text-white' : 'text-[#0d1f3c]'}`}>
                        Sua escola em<br />
                        <span className="relative inline-block mt-2">
                            <span className="relative z-10 bg-gradient-to-r from-[#2b59ff] to-[#60a5fa] bg-clip-text text-transparent">
                                total segurança
                            </span>
                        </span>
                        <br />
                        <span className="text-3xl md:text-[3.8rem] font-bold mt-6 inline-block tracking-tight transition-colors bg-gradient-to-r from-[#2b59ff] to-[#3b82f6] bg-clip-text text-transparent">
                            Gestão de acesso em tempo real
                        </span>
                    </h1>

                    <p className={`text-xl md:text-[1.4rem] max-w-3xl mx-auto mb-16 font-medium leading-relaxed transition-colors ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                        Tecnologia híbrida que combina <span className="text-eletrico font-bold">Biometria de Alta Precisão</span> e <span className="text-eletrico font-bold">QR Code Digital</span>. Proteja sua instituição com a solução de monitoramento mais rápida e confiável do mercado
                    </p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {!escolaSelecionada ? (
                        <motion.div
                            key="busca"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            <BuscadorEscolas
                                temaEscuro={temaEscuro}
                                aoSelecionarEscola={aoSelecionarEscola}
                                aoAbrirModalContato={aoAbrirModalContato}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="perfil"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl mx-auto"
                        >
                            <div className={`p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-700 ${temaEscuro ? 'bg-marinho/80 border-slate-800' : 'bg-white border-slate-100'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-eletrico/5 blur-3xl rounded-full" />
                                
                                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                                    <div className="text-left w-full md:w-auto">
                                        <h2 className={`text-3xl font-black uppercase tracking-tight mb-1 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                                            Portal de Identificação
                                        </h2>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Selecione sua credencial de acesso</p>
                                    </div>
                                    <button 
                                        onClick={aoLimparEscola}
                                        className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${temaEscuro ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Mudar Escola
                                    </button>
                                </div>

                                <button
                                    onClick={() => aoIrParaPerfil('gestor')}
                                    className={`group relative w-full flex items-center justify-center gap-3 p-6 rounded-2xl border transition-all font-black text-lg ${temaEscuro 
                                        ? 'bg-eletrico text-white border-transparent hover:bg-blue-500' 
                                        : 'bg-[#0d1f3c] text-white border-transparent hover:bg-[#0a1628]'}`}
                                >
                                    <ShieldCheck size={24} />
                                    ACESSAR PAINEL DA ESCOLA
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Indicador de Scroll */}
            {!escolaSelecionada && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: [0, 10, 0] }}
                    transition={{ 
                        opacity: { delay: 1, duration: 1 },
                        y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                    }}
                    className={`mt-12 flex flex-col items-center gap-2 ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Descobrir mais</span>
                    <ChevronDown size={20} />
                </motion.div>
            )}
        </main>
    );
};

