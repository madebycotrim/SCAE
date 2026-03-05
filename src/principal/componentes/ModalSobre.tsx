import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Smartphone, Users, ShieldCheck, Palette, WifiOff, AlertTriangle } from 'lucide-react';
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
                                    className={`p-2.5 rounded-xl transition-colors shadow-suave
                                    ${temaEscuro ? 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-200'}`}
                                    aria-label="Fechar Modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className={`p-6 md:p-8 overflow-y-auto ${temaEscuro ? 'bg-[#0B0F19]' : 'bg-white'}`}>
                                <div className="space-y-12">
                                    {/* 1 — Controle de Acesso */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-sky-900/30 border-sky-800/50 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-600'}`}>
                                            <Zap className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-sky-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">1</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Controle de Acesso no Portão</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">A portaria da escola não pode depender da internet para funcionar.</em>
                                                A validação ocorre em milissegundos via leitura de <strong>QR Code com assinatura digital</strong>. O tablet do quiosque valida o crachá localmente, sem precisar consultar nenhum servidor — se a rede cair, o portão continua operando normalmente. Cada leitura é registrada com data, hora e tipo de movimentação (entrada ou saída).
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2 — Portal do Responsável */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-emerald-900/30 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                            <Smartphone className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">2</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Portal do Responsável</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">Pais tranquilos produzem alunos mais seguros.</em>
                                                Uma ponte de confiança entre a escola e a família. Os pais se cadastram pelo <strong>link público da escola</strong>, vinculam-se aos filhos e acessam um painel com o histórico completo de entradas e saídas. Cada responsável vê <strong>apenas os dados dos seus próprios filhos</strong> — ninguém mais.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3 — Alertas de Risco de Evasão */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-rose-900/30 border-rose-800/50 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                            <AlertTriangle className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">3</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Alertas de Risco de Evasão Escolar</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">Uma falta não deveria se tornar uma evasão por falta de informação.</em>
                                                O sistema monitora a frequência diariamente e <strong>sinaliza alunos com 3 ou mais faltas consecutivas</strong> sem justificativa. Esses alertas aparecem em um painel exclusivo da coordenação pedagógica, permitindo que o orientador educacional entre em contato com a família <strong>antes</strong> que o quadro se agrave. Quando o aluno retorna, o alerta é arquivado automaticamente — sem burocracia e sem intervenção manual.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4 — Gestão de Turmas e Horários */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-amber-900/30 border-amber-800/50 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">4</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Gestão de Turmas e Horários de Acesso</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">O controle do portão começa no mapa de turmas.</em>
                                                A secretaria cadastra turmas por série, letra, turno e sala. O sistema permite configurar <strong>janelas de acesso por turno</strong>, restringindo a entrada de alunos fora do seu horário autorizado. Alunos do vespertino, por exemplo, não conseguem validar o acesso no período matutino sem autorização prévia registrada.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 5 — Painel Administrativo */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-fuchsia-900/30 border-fuchsia-800/50 text-fuchsia-400' : 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-fuchsia-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">5</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Painel Administrativo e Gestão Central</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">Direção que enxerga tudo, decide melhor.</em>
                                                O painel da administração reúne <strong>registros de acesso, alunos, turmas e relatórios</strong> em um único lugar. Para redes com múltiplas unidades, a <strong>Gestão Central</strong> consolida todas as escolas em um painel unificado — permitindo acompanhar cada unidade sem precisar acessar escola por escola.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 6 — Modo Offline */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-orange-900/30 border-orange-800/50 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                            <WifiOff className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">6</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Funciona Mesmo Sem Internet</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">A rede pode cair. O sistema, não.</em>
                                                O terminal de acesso opera <strong>100% offline</strong>. Todos os registros são armazenados localmente no dispositivo com identificador único, garantindo que nenhuma leitura se perca ou se duplique. Quando a conexão retorna, o sistema <strong>sincroniza automaticamente</strong> os registros pendentes, corrige a hora do dispositivo se necessário e atualiza a lista de crachás bloqueados — tudo sem intervenção humana.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 7 — Identidade Visual (White Label) */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-cyan-900/30 border-cyan-800/50 text-cyan-400' : 'bg-cyan-50 border-cyan-100 text-cyan-600'}`}>
                                            <Palette className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">7</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>A Cara da Sua Escola</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">O sistema veste a identidade da sua instituição.</em>
                                                Cada escola recebe uma <strong>URL exclusiva</strong> (ex: <code className="text-xs px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">seuapp.com/sua-escola</code>) e as cores da instituição são aplicadas automaticamente em <strong>todas as telas</strong> — da tela de login ao quiosque do portão, passando pelo painel administrativo. Para os pais, a experiência é a de um sistema próprio da escola, não de uma plataforma genérica.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 8 — LGPD */}
                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-suave relative
                                        ${temaEscuro ? 'bg-blue-900/30 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                            <ShieldCheck className="w-8 h-8" />
                                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">8</div>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-2 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>Conformidade LGPD desde o Primeiro Dia</h3>
                                            <p className={`leading-relaxed text-base ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <em className="block mb-2 opacity-80">Dados de menores exigem cuidado redobrado — e o SCAE foi construído com isso em mente.</em>
                                                O sistema coleta apenas o <strong>mínimo necessário</strong> para funcionar (matrícula, nome, turma e horário). Cada ação administrativa é registrada em <strong>logs de auditoria imutáveis</strong>, permitindo rastrear quem acessou o quê e quando. A base legal de tratamento segue o Art. 14 da LGPD, com proteção reforçada para dados de crianças e adolescentes.
                                            </p>
                                        </div>
                                    </div>


                                </div>

                                <div className="mt-12 p-8 bg-gradient-to-br from-slate-900 to-sky-950 rounded-3xl text-center shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    <h4 className="text-white font-extrabold text-2xl mb-3 relative z-10">O próximo passo lógico para a sua instituição.</h4>
                                    <p className="text-sky-200/80 text-base font-medium mb-6 max-w-lg mx-auto relative z-10">
                                        Assuma o controle de acesso e eleve a percepção de valor e segurança da sua escola perante as famílias.
                                    </p>
                                    <button
                                        onClick={() => {
                                            aoFechar();
                                            aoAbrirModalContato();
                                        }}
                                        className="relative z-10 inline-flex items-center gap-2 bg-white text-sky-900 hover:bg-sky-50 hover:scale-105 active:scale-95 px-8 py-3.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    >
                                        Entre em contato
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


