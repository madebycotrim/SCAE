// TODO: refatorar arquivo longo (> 300 linhas) para extrair lÃ³gica em hooks ou componentes menores, reduzindo a dÃ­vida tÃ©cnica
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, ShieldCheck, Zap, Users, Building2, WifiOff, AlertTriangle, Palette, ChevronDown } from 'lucide-react';

import { CabecalhoInicial } from './componentes/CabecalhoInicial';
import { BuscadorEscolas } from './componentes/BuscadorEscolas';
import { PainelMockup } from './componentes/PainelMockup';
import { ModalSobre } from './componentes/ModalSobre';
import { ModalContato } from './componentes/ModalContato';
import { RodapeInicial } from './componentes/RodapeInicial';
import { SEO } from './componentes/SEO';

interface EscolaCadastrada {
    id: string;
    nome: string;
}

export default function PaginaInicial() {
    const [temaEscuro, definirTemaEscuro] = useState(false);
    const [modalSobreAberto, definirModalSobreAberto] = useState(false);
    const [modalContatoAberto, definirModalContatoAberto] = useState(false);
    const [escolasCadastradas, definirEscolasCadastradas] = useState<EscolaCadastrada[]>([]);
    const navegar = useNavigate();

    // Carrega todas as escolas cadastradas ao montar a pÃ¡gina
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        fetch(`${apiUrl}/publico/escolas`)
            .then(r => r.ok ? r.json() : { dados: [] })
            .then(dados => definirEscolasCadastradas(dados.dados || []))
            .catch(() => definirEscolasCadastradas([]));
    }, []);

    const selecionarEscola = (slug: string) => {
        navegar(`/${slug}/login`);
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-sky-500/30 overflow-x-hidden relative flex flex-col pt-safe-top transition-colors duration-500 ${temaEscuro ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
            <SEO
                titulo="SCAE â€” Controle de acesso escolar inteligente"
                descricao="O sistema que registra cada entrada e saída dos alunos, alerta sobre riscos de evasão e mantém os pais informados. Desenvolvido para escolas públicas brasileiras."
            />

            {/* Background â€” grid sutil */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Grid tÃ©cnico sutil */}
                <div className="absolute inset-0"
                    style={{
                        backgroundImage: temaEscuro
                            ? 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)'
                            : 'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}>
                </div>
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
                    <h1 className={`text-5xl md:text-[5.5rem] font-black tracking-tight mb-8 leading-[1.05] transition-colors ${temaEscuro ? 'text-slate-50' : 'text-slate-900'}`}>
                        Sua escola sabe<br />
                        <span className="relative inline-block mt-1 md:mt-2">
                            <span className={`relative z-10 text-transparent bg-clip-text bg-gradient-to-r ${temaEscuro ? 'from-sky-400 to-indigo-400' : 'from-[#0d1f3c] to-sky-600'}`}>
                                quem entrou.
                            </span>
                        </span>
                        <br />
                        <span className={`text-3xl md:text-[3.25rem] font-bold mt-4 md:mt-6 inline-block tracking-tight ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                            Os pais tambÃ©m.
                        </span>
                    </h1>

                    <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed transition-colors ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                        Busque a sua escola abaixo e acesse o portal de acompanhamento.
                    </p>
                </motion.div>

                <BuscadorEscolas
                    temaEscuro={temaEscuro}
                    aoSelecionarEscola={selecionarEscola}
                    aoAbrirModalContato={() => definirModalContatoAberto(true)}
                />

                {/* CTA Gestor â€” Destaque visual prÃ³prio */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.25 }}
                    className="mt-8 w-full max-w-xl relative z-40"
                >
                    <div
                        onClick={() => definirModalContatoAberto(true)}
                        className={`group flex items-center justify-between gap-4 px-8 py-5 rounded-2xl border cursor-pointer transition-all shadow-suave hover:shadow-media ${temaEscuro
                            ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <div>
                            <p className={`text-base font-bold ${temaEscuro ? 'text-white' : 'text-slate-700'}`}>
                                Ã‰ gestor e quer o SCAE na sua escola?
                            </p>
                            <p className={`text-sm font-medium mt-0.5 ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                Implantação gratuita para escolas públicas.
                            </p>
                        </div>
                        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all group-hover:scale-105 ${temaEscuro
                            ? 'bg-[#0d1f3c] hover:bg-[#0a1628] text-white shadow-suave'
                            : 'bg-[#0d1f3c] hover:bg-[#0a1628] text-white shadow-suave'
                            }`}>
                            Fale conosco
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                </motion.div>

                <PainelMockup temaEscuro={temaEscuro} />

            </main>



            {/* Como funciona na prÃ¡tica */}
            <section className={`relative z-20 w-full py-16 ${temaEscuro ? 'bg-[#0B0F19]/80' : 'bg-slate-50/80'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Como funciona na prÃ¡tica
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            Do portÃ£o ao celular dos pais â€” em segundos, sem complicaÃ§Ã£o.
                        </p>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-transparent">
                        {/* Connecting Line (Desktop) */}
                        <div className={`hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] ${temaEscuro ? 'bg-slate-800' : 'bg-slate-200'} z-0`}></div>

                        {/* Passo 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center group cursor-default">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-suave transition-colors duration-300 ${temaEscuro ? 'bg-slate-800 text-white border border-slate-700 group-hover:bg-slate-700' : 'bg-slate-100 text-[#0d1f3c] border border-slate-200 group-hover:bg-[#0d1f3c] group-hover:text-white'}`}>
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}><span className="text-sky-400">1.</span> O Aluno Chega</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                Aproxima o crachÃ¡ ou o celular do tablet na portaria. Sem fila, sem espera.
                            </p>
                        </div>

                        {/* Passo 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center group cursor-default">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-suave transition-colors duration-300 ${temaEscuro ? 'bg-slate-800 text-white border border-slate-700 group-hover:bg-slate-700' : 'bg-slate-100 text-[#0d1f3c] border border-slate-200 group-hover:bg-[#0d1f3c] group-hover:text-white'}`}>
                                <Zap className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}><span className="text-sky-400">2.</span> ValidaÃ§Ã£o InstantÃ¢nea</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                O tablet valida a assinatura digital do crachÃ¡ e libera o acesso em milissegundos â€” sem atrasos na entrada.
                            </p>
                        </div>

                        {/* Passo 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center group cursor-default">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-suave transition-colors duration-300 ${temaEscuro ? 'bg-slate-800 text-white border border-slate-700 group-hover:bg-slate-700' : 'bg-slate-100 text-[#0d1f3c] border border-slate-200 group-hover:bg-[#0d1f3c] group-hover:text-white'}`}>
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}><span className="text-sky-400">3.</span> Pais Informados</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                Os responsÃ¡veis acompanham no portal o histÃ³rico de entradas e saÃ­das dos seus filhos â€” com horÃ¡rio exato.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Funcionalidades â€” Preview Section */}
            <section className={`relative z-20 w-full py-16 ${temaEscuro ? 'bg-[#080C16]' : 'bg-white'}`}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Mais do que um controle de portÃ£o
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            O SCAE é uma plataforma completa de gestão de acesso, frequência e segurança escolar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div className={`p-8 rounded-2xl border transition-all hover:shadow-media ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Alertas de EvasÃ£o</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Identifica alunos com faltas consecutivas e avisa a coordenaÃ§Ã£o antes que o quadro se agrave.</p>
                        </div>

                        <div className={`p-8 rounded-2xl border transition-all hover:shadow-media ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                <WifiOff className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Funciona Offline</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>O terminal opera 100% sem internet. Registros sincronizam automaticamente quando a rede retorna.</p>
                        </div>

                        <div className={`p-8 rounded-2xl border transition-all hover:shadow-media ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-sky-900/30 text-sky-400' : 'bg-sky-50 text-sky-400'}`}>
                                <Palette className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Identidade da Escola</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>URL exclusiva, cores personalizadas e marca prÃ³pria â€” do login ao quiosque do portÃ£o.</p>
                        </div>

                        <div className={`p-8 rounded-2xl border transition-all hover:shadow-media ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-slate-800 text-[#0d1f3c]' : 'bg-slate-100 text-[#0d1f3c]'}`}>
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>LGPD desde o InÃ­cio</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>ProteÃ§Ã£o reforÃ§ada para dados de menores, com logs imutÃ¡veis e coleta mÃ­nima de dados.</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={() => definirModalSobreAberto(true)}
                            className={`group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:scale-105 ${temaEscuro
                                ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-suave'
                                : 'bg-[#0d1f3c] text-white hover:bg-[#0a1628] shadow-suave'
                                }`}
                        >
                            Explorar todas as funcionalidades
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className={`relative z-20 w-full py-16 border-t ${temaEscuro ? 'bg-[#0B0F19]/60 border-slate-800/60' : 'bg-slate-50/50 border-slate-200/60'}`}>
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className={`text-3xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Perguntas Frequentes
                        </h2>
                        <p className={`text-lg font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            Tudo o que você precisa saber antes de implantar o SCAE.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto flex flex-col gap-4 text-left">
                        {[
                            {
                                p: 'É gratuito para escolas públicas?',
                                r: 'Sim. O projeto possui licença gratuita garantida para implantação em escolas públicas estaduais e municipais.'
                            },
                            {
                                p: 'Precisa de internet para funcionar?',
                                r: 'NÃ£o na portaria. O terminal de leitura opera 100% offline e sincroniza os registros automaticamente quando a rede volta.'
                            },
                            {
                                p: 'Os dados ficam seguros?',
                                r: 'Sim. Cumprimos rigorosamente a LGPD, coletando o mÃ­nimo necessÃ¡rio (sem biometria) e mantendo logs imutÃ¡veis no Brasil.'
                            },
                            {
                                p: 'Como os pais acessam?',
                                r: 'Os responsÃ¡veis acessam o portal pelo celular via conta Google. A vinculaÃ§Ã£o Ã© feita pelo e-mail cadastrado na matrÃ­cula do aluno.'
                            }
                        ].map((faq, index) => (
                            <details key={index} className={`group rounded-2xl border transition-all ${temaEscuro ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <summary className={`flex justify-between items-center font-bold cursor-pointer list-none p-6 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'} [&::-webkit-details-marker]:hidden`}>
                                    <span className="text-lg">{faq.p}</span>
                                    <span className={`transition-transform duration-300 group-open:rotate-180 ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                                        <ChevronDown className="w-5 h-5" />
                                    </span>
                                </summary>
                                <p className={`text-sm font-medium leading-relaxed px-6 pb-6 pt-0 ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {faq.r}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className={`relative z-20 w-full py-20 ${temaEscuro ? 'bg-[#0a1628]' : 'bg-[#0d1f3c]'}`}>
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-8 text-white">
                        Pronto para modernizar o controle de acesso da sua escola?
                    </h2>
                    <button
                        onClick={() => definirModalContatoAberto(true)}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all bg-transparent text-white border-2 border-white/20 hover:border-white/40 hover:bg-white/10 active:scale-95 shadow-suave"
                    >
                        Fale conosco
                    </button>
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

