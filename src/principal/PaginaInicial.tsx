// TODO: refatorar arquivo longo (> 300 linhas) para extrair lógica em hooks ou componentes menores, reduzindo a dívida técnica
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Smartphone, ShieldCheck, Zap, Users, Building2, WifiOff, AlertTriangle, Palette, ChevronDown, GraduationCap } from 'lucide-react';

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
    const [escolaSelecionada, definirEscolaSelecionada] = useState<string | null>(null);
    const [escolaDados, definirEscolaDados] = useState<any | null>(null);
    const [carregandoDadosEscola, definirCarregandoDadosEscola] = useState(false);
    const navegar = useNavigate();

    // Carrega todas as escolas cadastradas ao montar a página
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        fetch(`${apiUrl}/publico/escolas`)
            .then(r => r.ok ? r.json() : { dados: [] })
            .then(dados => definirEscolasCadastradas(dados.dados || []))
            .catch(() => definirEscolasCadastradas([]));
    }, []);

    const selecionarEscola = async (slug: string) => {
        definirEscolaSelecionada(slug);
        definirCarregandoDadosEscola(true);
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const resposta = await fetch(`${apiUrl}/publico/escolas/${slug}`);
            if (resposta.ok) {
                const dados = await resposta.json();
                const infoEscola = dados.dados;
                definirEscolaDados(infoEscola);

                // ⚡ Atalho Inteligente: Se não usa QR Code, vai direto para o Login
                if (infoEscola?.metodo_entrada !== 'QRCODE') {
                    navegar(`/${slug}/login`);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes da escola:', error);
        } finally {
            definirCarregandoDadosEscola(false);
        }
    };

    const irParaPerfil = (perfil: 'aluno' | 'gestor') => {
        if (!escolaSelecionada) return;
        if (perfil === 'aluno') {
            navegar(`/${escolaSelecionada}/aluno`);
        } else {
            navegar(`/${escolaSelecionada}/login`);
        }
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-eletrico/30 overflow-x-hidden relative flex flex-col pt-safe-top transition-colors duration-500 ${temaEscuro ? 'bg-marinho text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
            <SEO
                titulo="Catraki — Controle de acesso escolar inteligente"
                descricao="O sistema que registra cada entrada e saída dos alunos, alerta sobre riscos de evasão e garante a segurança escolar. Desenvolvido para as melhores instituições."
            />

            {/* Background HUD Dinâmico */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Gradiente de Profundidade */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${temaEscuro ? 'bg-gradient-to-b from-marinho via-[#0D162D] to-marinho opacity-100' : 'bg-white opacity-0'}`} />
                
                {/* Tech GridHUD */}
                <div className="absolute inset-0"
                    style={{
                        backgroundImage: temaEscuro
                            ? 'radial-gradient(circle at 2px 2px, rgba(43, 89, 255, 0.1) 1px, transparent 0)'
                            : 'radial-gradient(circle at 2px 2px, rgba(15, 23, 42, 0.05) 1px, transparent 0)',
                        backgroundSize: '32px 32px'
                    }}>
                </div>

                {/* Brilhos Atmosféricos */}
                {temaEscuro && (
                    <>
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: [0.1, 0.2, 0.1],
                                x: [0, 50, 0],
                                y: [0, -30, 0]
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-eletrico/20 blur-[160px] rounded-full" 
                        />
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.3, 1],
                                opacity: [0.05, 0.15, 0.05],
                                x: [0, -40, 0],
                                y: [0, 60, 0]
                            }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-eletrico/10 blur-[140px] rounded-full" 
                        />
                    </>
                )}
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
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                >
                    {/* Badge de Status Live */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-eletrico/10 border border-eletrico/20 mb-8 backdrop-blur-md"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-eletrico uppercase tracking-[0.2em]">Sistema Bio-Identitário Ativo</span>
                    </motion.div>

                    <h1 className={`text-6xl md:text-[6.5rem] font-black tracking-tighter mb-8 leading-[0.95] transition-colors ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                        Sua escola sabe<br />
                        <span className="relative inline-block mt-2">
                            <span className={`relative z-10 text-transparent bg-clip-text bg-gradient-to-r ${temaEscuro ? 'from-eletrico via-blue-400 to-eletrico' : 'from-eletrico to-eletrico'} animate-gradient-x`}>
                                quem entrou.
                            </span>
                            {/* Efeito de Brilho de Scan */}
                            <motion.div 
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] z-20"
                            />
                        </span>
                        <br />
                        <span className={`text-3xl md:text-[3.8rem] font-bold mt-6 inline-block tracking-tight opacity-80 ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                            Segurança em tempo real.
                        </span>
                    </h1>

                    <p className={`text-xl md:text-[1.4rem] max-w-2xl mx-auto mb-16 font-medium leading-relaxed transition-colors ${temaEscuro ? 'text-slate-500' : 'text-slate-500'}`}>
                        A plataforma definitiva para controle de acesso, biometria e <span className={temaEscuro ? 'text-slate-300' : 'text-slate-900'}>segurança proativa</span> na educação brasileira.
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
                                aoSelecionarEscola={selecionarEscola}
                                aoAbrirModalContato={() => definirModalContatoAberto(true)}
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
                                        onClick={() => definirEscolaSelecionada(null)}
                                        className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${temaEscuro ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Mudar Escola
                                    </button>
                                </div>

                                <div className={`grid grid-cols-1 ${escolaDados?.metodo_entrada === 'QRCODE' ? 'sm:grid-cols-2' : 'max-w-md mx-auto'} gap-4`}>
                                    {/* SOU ALUNO - Aparece apenas se for QRCODE */}
                                    {escolaDados?.metodo_entrada === 'QRCODE' && (
                                        <button
                                            onClick={() => irParaPerfil('aluno')}
                                            className={`group relative flex flex-col items-center gap-6 p-8 rounded-2xl border transition-all text-center hover:-translate-y-1 active:scale-[0.98] ${temaEscuro 
                                                ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-eletrico/50' 
                                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-eletrico hover:shadow-media'}`}
                                        >
                                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${temaEscuro ? 'bg-eletrico/10 text-eletrico group-hover:scale-110' : 'bg-eletrico/10 text-eletrico group-hover:scale-110'}`}>
                                                <GraduationCap size={44} strokeWidth={2} />
                                            </div>
                                            <div>
                                                <p className={`text-lg font-black uppercase tracking-tight mb-1 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>Sou Aluno</p>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Acessar meu Cartão Digital / QR Code</p>
                                            </div>
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronDown className="w-5 h-5 -rotate-90 text-eletrico" />
                                            </div>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => irParaPerfil('gestor')}
                                        className={`group relative flex flex-col items-center gap-6 p-8 rounded-2xl border transition-all text-center hover:-translate-y-1 active:scale-[0.98] ${temaEscuro 
                                            ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-eletrico/50' 
                                            : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-eletrico hover:shadow-media'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${temaEscuro ? 'bg-eletrico/10 text-eletrico group-hover:scale-110' : 'bg-eletrico/10 text-eletrico group-hover:scale-110'}`}>
                                            <ShieldCheck size={44} strokeWidth={2} />
                                        </div>
                                        <div>
                                            <p className={`text-lg font-black uppercase tracking-tight mb-1 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>Sou Gestor / Equipe</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Acessar Painel de Controle Escolar</p>
                                        </div>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronDown className="w-5 h-5 -rotate-90 text-eletrico" />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CTA Gestor — Design Industrial */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="mt-12 w-full max-w-3xl relative z-40"
                >
                    <div
                        onClick={() => definirModalContatoAberto(true)}
                        className={`group flex flex-col md:flex-row items-center justify-between gap-6 p-1 bg-gradient-to-r from-eletrico/20 via-transparent to-eletrico/20 rounded-[2rem] cursor-pointer transition-all hover:scale-[1.01]`}
                    >
                        <div className={`flex flex-col md:flex-row items-center gap-6 px-10 py-6 rounded-[1.8rem] w-full border ${temaEscuro ? 'bg-marinho/90 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex-1 text-center md:text-left">
                                <p className={`text-lg font-black tracking-tight ${temaEscuro ? 'text-white' : 'text-slate-800'}`}>
                                    É gestor e quer o Catraki na sua escola?
                                </p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 opacity-60 ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Implantação imediata para instituições parceiras.
                                </p>
                            </div>
                            <div className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs transition-all bg-eletrico text-white shadow-xl shadow-eletrico/20 group-hover:shadow-eletrico/40 group-hover:-translate-y-1`}>
                                SOLICITAR DEMONTRAÇÃO
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                <PainelMockup temaEscuro={temaEscuro} />

            </main>



            {/* Como funciona na prática */}
            <section className={`relative z-20 w-full py-16 ${temaEscuro ? 'bg-[#0B0F19]/80' : 'bg-slate-50/80'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Como funciona na prática
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            Do portão ao painel administrativo — em segundos, sem complicação.
                        </p>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-transparent">
                        {/* Connecting Line (Desktop) */}
                        <div className={`hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] ${temaEscuro ? 'bg-slate-800' : 'bg-slate-200'} z-0`}></div>

                        {/* Passo 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center group cursor-default">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${temaEscuro ? 'bg-slate-800 text-white border border-slate-700 group-hover:bg-slate-700' : 'bg-slate-100 text-eletrico border border-slate-200 group-hover:bg-eletrico group-hover:text-white'}`}>
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}><span className="text-eletrico">1.</span> O Aluno Chega</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                Aproxima o crachá ou o celular do tablet na portaria. Sem fila, sem espera.
                            </p>
                        </div>

                        {/* Passo 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center group cursor-default">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-suave transition-colors duration-300 ${temaEscuro ? 'bg-slate-800 text-white border border-slate-700 group-hover:bg-slate-700' : 'bg-slate-100 text-eletrico border border-slate-200 group-hover:bg-eletrico group-hover:text-white'}`}>
                                <Zap className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}><span className="text-eletrico">2.</span> Validação Instantânea</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                O tablet valida a assinatura digital do crachá e libera o acesso em milissegundos — sem atrasos na entrada.
                            </p>
                        </div>

                        {/* Passo 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center group cursor-default">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-suave transition-colors duration-300 ${temaEscuro ? 'bg-slate-800 text-white border border-slate-700 group-hover:bg-slate-700' : 'bg-slate-100 text-eletrico border border-slate-200 group-hover:bg-eletrico group-hover:text-white'}`}>
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-800'}`}><span className="text-eletrico">3.</span> Gestão Ativa</h3>
                            <p className={`text-sm font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                A coordenação acompanha em tempo real o histórico de entradas e saídas dos alunos — com horário exato e fotos (opcional).
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Funcionalidades — Preview Section */}
            <section className={`relative z-20 w-full py-16 ${temaEscuro ? 'bg-[#080C16]' : 'bg-white'}`}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Mais do que um controle de portão
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            O Catraki é uma plataforma completa de gestão de acesso, frequência e segurança escolar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div className={`p-8 rounded-2xl border transition-all ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Alertas de Evasão</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Identifica alunos com faltas consecutivas e avisa a coordenação antes que o quadro se agrave.</p>
                        </div>

                        <div className={`p-8 rounded-2xl border transition-all ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-orange-600'}`}>
                                <WifiOff className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Funciona Offline</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>O terminal opera 100% sem internet. Registros sincronizam automaticamente quando a rede retorna.</p>
                        </div>

                        <div className={`p-8 rounded-2xl border transition-all ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-eletrico/20 text-eletrico' : 'bg-eletrico/10 text-eletrico'}`}>
                                <Palette className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Identidade da Escola</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>URL exclusiva, cores personalizadas e marca própria — do login ao quiosque do portão.</p>
                        </div>

                        <div className={`p-8 rounded-2xl border transition-all ${temaEscuro ? 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${temaEscuro ? 'bg-eletrico/20 text-eletrico' : 'bg-eletrico/10 text-eletrico'}`}>
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>LGPD desde o Início</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Proteção reforçada para dados de menores, com logs imutáveis e coleta mínima de dados.</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={() => definirModalSobreAberto(true)}
                            className={`group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-sm transition-all hover:scale-105 ${temaEscuro
                                ? 'bg-eletrico/90 text-white hover:bg-eletrico shadow-suave'
                                : 'bg-eletrico text-white hover:bg-eletrico/90 shadow-suave'
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
                            Tudo o que você precisa saber antes de implantar o Catraki.
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
                                r: 'Não na portaria. O terminal de leitura opera 100% offline e sincroniza os registros automaticamente quando a rede volta.'
                            },
                            {
                                p: 'Os dados ficam seguros?',
                                r: 'Sim. Cumprimos rigorosamente a LGPD, coletando o mínimo necessário (sem biometria) e mantendo logs imutáveis no Brasil.'
                            },
                            {
                                p: 'Como a gestão acessa?',
                                r: 'A equipe pedagógica e de portaria acessa o painel pelo computador ou celular via conta Google institucional (@Seduc/@SEEDF).'
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
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all bg-transparent text-white border-2 border-white/20 hover:border-white/40 hover:bg-white/10 active:scale-95"
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

