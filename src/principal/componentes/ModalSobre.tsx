import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Smartphone, Users, ShieldCheck } from 'lucide-react';
import FocusTrap from 'focus-trap-react';

interface ModalSobreProps {
    aberto: boolean;
    aoFechar: () => void;
    temaEscuro: boolean;
    aoAbrirModalContato: () => void;
}

export function ModalSobre({ aberto, aoFechar, temaEscuro, aoAbrirModalContato }: ModalSobreProps) {

    useEffect(() => {
        if (!aberto) return;

        const lidarComEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                aoFechar();
            }
        };

        // Trap focus e overflow hidden no body
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', lidarComEsc);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', lidarComEsc);
        };
    }, [aberto, aoFechar]);

    return (
        <AnimatePresence>
            {aberto && (
                <FocusTrap focusTrapOptions={{ initialFocus: false, allowOutsideClick: true }}>
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-md"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-sobre-titulo"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0"
                            onClick={aoFechar}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`relative w-full max-w-4xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]
                            ${temaEscuro ? 'bg-[#0B0F19] border-slate-700' : 'bg-white border-slate-100'}`}
                        >
                            {/* Modal Header */}
                            <div className={`flex items-center justify-between p-6 md:p-8 border-b 
                            ${temaEscuro ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                                <div>
                                    <h2 id="modal-sobre-titulo" className={`text-2xl md:text-3xl font-extrabold ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                                        Como o SCAE facilita a sua vida?
                                    </h2>
                                    <p className={`mt-1 font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Entenda como revolucionamos a entrada, saída e a segurança dos alunos.
                                    </p>
                                </div>
                                <button
                                    onClick={aoFechar}
                                    className={`p-2.5 rounded-xl transition-colors shadow-sm
                                    ${temaEscuro ? 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'}`}
                                    aria-label="Fechar Modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className={`p-6 md:p-8 overflow-y-auto ${temaEscuro ? 'bg-[#0B0F19]' : 'bg-white'}`}>
                                <div className="space-y-12">
                                    {/* Passo 1 - Controle de Acesso */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm relative
                                        ${temaEscuro ? 'bg-indigo-900/30 border-indigo-800/50 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                            <Zap className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">1</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Controle de Acesso Inteligente</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                A validação no portão ocorre em milissegundos via leitura de <strong>QR Code Dinâmico</strong> ou biometria. O sistema gerencia não apenas alunos, mas também o acesso de funcionários e visitantes, operando de forma descentralizada para garantir o funcionamento ininterrupto durante os horários de pico, mesmo que ocorram instabilidades na rede.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passo 2 - Responsáveis */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm relative
                                        ${temaEscuro ? 'bg-emerald-900/30 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                            <Smartphone className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">2</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Aplicativo e Painel do Responsável</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Uma ponte de confiança digital entre o colégio e a família. Assim que a catraca é acionada, os pais recebem <strong>notificações automáticas</strong> (push ou e-mail) indicando a entrada, saída antecipada ou possíveis atrasos dos filhos. Além do monitoramento de acesso, o painel centraliza avisos e históricos consolidados de frequência.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passo 3 - Alunos e Turmas */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm relative
                                        ${temaEscuro ? 'bg-amber-900/30 border-amber-800/50 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">3</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Gestão Centralizada de Turmas e Horários</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                O motor de acesso do SCAE vai muito além de um "abre-portas". A secretaria cadastra o mapa de turmas, turnos e integra essas informações com as <strong>janelas de acesso exclusivas de cada série</strong>. Alunos do turno vespertino, por exemplo, não conseguem acessar as dependências da instituição durante o período matutino sem autorização prévia registrada no sistema.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passo 4 - Evasão */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm relative
                                        ${temaEscuro ? 'bg-rose-900/30 border-rose-800/50 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                            <Users className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">4</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Módulo Preditivo de Evasão Escolar</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Ao cruzar as métricas de frequência, a inteligência do sistema <strong>sinaliza alunos em zona crítica</strong> de faltas ou com atrasos crônicos. A coordenação pedagógica visualiza estes painéis de risco e dispara medidas de engajamento antes do agravamento do quadro, transformando o "controle de faltas" numa ferramenta real de sucesso e retenção do estudante.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passo 5 - Dashboard */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm relative
                                        ${temaEscuro ? 'bg-fuchsia-900/30 border-fuchsia-800/50 text-fuchsia-400' : 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-fuchsia-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">5</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Dashboards Gerenciais (BI) e Relatórios</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Painéis visuais fornecem à gestão institucional total clareza processual. Por meio de <strong>relatórios gráficos em tempo real</strong>, o diretor audita picos de ocupação do colégio e gargalos na rotina de entrada e saída. Em redes de franquias e múltiplas unidades, esse comando sobe para a Gestão Central, consolidando dados num só lugar.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passo 6 - LGPD e Logs */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm relative
                                        ${temaEscuro ? 'bg-blue-900/30 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                            <ShieldCheck className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">6</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Portal LGPD e Auditoria de Logs</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Construído com conformidade integral à Lei Geral de Proteção de Dados sob a base de <strong>obrigação legal e segurança</strong>. O sistema registra de forma autônoma a validação de cada QR Code na catraca e conta com um rigoroso módulo de Logs de Atividades para auditar acessos manuais de exceção. No 'Portal do Titular', os pais acompanham com total transparência o histórico exato de entradas e saídas exclusivamente dos seus respectivos filhos.
                                            </p>
                                        </div>
                                    </div>

                                </div>

                                <div className="mt-12 p-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl text-center shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    <h4 className="text-white font-extrabold text-2xl mb-3 relative z-10">O próximo passo lógico para a sua instituição.</h4>
                                    <p className="text-indigo-200/80 text-base font-medium mb-6 max-w-lg mx-auto relative z-10">
                                        Assuma o controle de acesso e eleve a percepção de valor e segurança da sua escola perante as famílias.
                                    </p>
                                    <button
                                        onClick={() => {
                                            aoFechar();
                                            aoAbrirModalContato();
                                        }}
                                        className="relative z-10 inline-flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 hover:scale-105 active:scale-95 px-8 py-3.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    >
                                        Falar com um Consultor
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </FocusTrap>
            )}
        </AnimatePresence>
    );
}

