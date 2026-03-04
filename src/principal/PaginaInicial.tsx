import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, Bell, ShieldCheck, Zap, Users, GraduationCap, BookOpen, Library, Landmark } from 'lucide-react';

import { CabecalhoInicial } from './componentes/CabecalhoInicial';
import { BuscadorEscolas } from './componentes/BuscadorEscolas';
import { PainelMockup } from './componentes/PainelMockup';
import { ModalSobre } from './componentes/ModalSobre';
import { ModalContato } from './componentes/ModalContato';
import { RodapeInicial } from './componentes/RodapeInicial';
import { SEO } from './componentes/SEO';

export default function PaginaInicial() {
    const [temaEscuro, definirTemaEscuro] = useState(false);
    const [modalSobreAberto, definirModalSobreAberto] = useState(false);
    const [modalContatoAberto, definirModalContatoAberto] = useState(false);
    const navegar = useNavigate();

    const selecionarEscola = (slug: string) => {
        navegar(`/${slug}/login`);
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col pt-safe-top transition-colors duration-500 ${temaEscuro ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
            <SEO
                titulo="SCAE - O acesso escolar reimaginado"
                descricao="Encontre o portal da sua instituição de ensino e acesse a plataforma de gestão e monitoramento inteligente SCAE."
            />

            {/* Animated Modern Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-multiply"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, delay: 0.2, ease: "easeOut" }}
                    className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-multiply"
                />
            </div>

            <CabecalhoInicial
                temaEscuro={temaEscuro}
                aoAlternarTema={() => definirTemaEscuro(!temaEscuro)}
                aoAbrirModalSobre={() => definirModalSobreAberto(true)}
                aoAbrirModalContato={() => definirModalContatoAberto(true)}
            />

            {/* Main Content */}
            <main className="relative z-30 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-32 max-w-4xl mx-auto text-center w-full">

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <h1 className={`text-5xl md:text-[5.5rem] font-extrabold tracking-tight mb-6 leading-[1.05] transition-colors ${temaEscuro ? 'text-slate-50' : 'text-slate-900'}`}>
                        O acesso escolar,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-400">
                            reimaginado.
                        </span>
                    </h1>

                    <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed transition-colors ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                        Encontre o portal da sua instituição de ensino e acesse a plataforma de gestão e monitoramento inteligente.
                    </p>
                </motion.div>

                <BuscadorEscolas
                    temaEscuro={temaEscuro}
                    aoSelecionarEscola={selecionarEscola}
                    aoAbrirModalContato={() => definirModalContatoAberto(true)}
                />

                {/* Conversão Otimizada */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.25 }}
                    className="mt-6 flex flex-col items-center relative z-40"
                >
                    <button
                        onClick={() => definirModalContatoAberto(true)}
                        className={`group flex items-center gap-2 px-5 py-2 rounded-full border shadow-sm hover:shadow text-sm font-semibold transition-all cursor-pointer backdrop-blur-sm ${temaEscuro ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-white/60 hover:bg-white border-slate-200/60 text-slate-600'}`}
                    >
                        É gestor e quer o SCAE na sua escola?
                        <span className={`font-bold group-hover:underline ${temaEscuro ? 'text-indigo-400' : 'text-indigo-600'}`}>Fale conosco</span>
                        <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${temaEscuro ? 'text-indigo-500' : 'text-indigo-400'}`} />
                    </button>
                </motion.div>

                <PainelMockup temaEscuro={temaEscuro} />

            </main>

            {/* Partner Logos Strip (Social Proof - Simplified) */}
            <div className={`w-full py-10 border-y relative z-10 ${temaEscuro ? 'border-slate-800/60 bg-[#0B0F19]/40' : 'border-slate-200/60 bg-white/40'}`}>
                <div className="max-w-5xl mx-auto px-6 text-center text-slate-500 font-medium text-sm uppercase tracking-widest">
                    Segurança e Controle para Instituições de Ensino
                </div>
            </div>

            {/* Como funciona em 3 Segundos */}
            <section className={`relative z-20 w-full py-24 ${temaEscuro ? 'bg-[#0B0F19]/80' : 'bg-slate-50/80'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Como funciona em 3 segundos
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            A magia da tecnologia operando nos bastidores. O acesso é instantâneo, seguro e transparente para os pais.
                        </p>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-transparent">
                        {/* Connecting Line (Desktop) */}
                        <div className={`hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] ${temaEscuro ? 'bg-slate-800' : 'bg-slate-200'} z-0`}></div>

                        {/* Passo 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${temaEscuro ? 'bg-slate-800 text-indigo-400 border border-slate-700' : 'bg-white text-indigo-600 border border-slate-100'}`}>
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}>1. O Aluno Chega</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                Aproxima o crachá ou o smartphone do terminal de acesso inteligente de validação.
                            </p>
                        </div>

                        {/* Passo 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${temaEscuro ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-white text-emerald-600 border border-slate-100'}`}>
                                <Zap className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}>2. Validação Instantânea</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                A catraca analisa os dados e libera o acesso em milissegundos, evitando enormes filas.
                            </p>
                        </div>

                        {/* Passo 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${temaEscuro ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-white text-blue-600 border border-slate-100'}`}>
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}>3. Pais Tranquilos</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                Os pais recebem uma notificação em tempo real no app com o horário oficial da entrada.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <RodapeInicial temaEscuro={temaEscuro} />

            <ModalSobre
                aberto={modalSobreAberto}
                aoFechar={() => definirModalSobreAberto(false)}
                temaEscuro={temaEscuro}
                aoAbrirModalContato={() => definirModalContatoAberto(true)}
            />

            <ModalContato
                aberto={modalContatoAberto}
                aoFechar={() => definirModalContatoAberto(false)}
                temaEscuro={temaEscuro}
            />
        </div>
    );
}

