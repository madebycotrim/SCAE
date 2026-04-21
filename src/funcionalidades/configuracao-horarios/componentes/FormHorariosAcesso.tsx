import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usarRegrasHorarios } from '../hooks/usarRegrasHorarios';
import type { JanelaHorarioAcesso } from '@/funcionalidades/configuracao-horarios/types/regrasHorarios.tipos';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarConfiguracoesEscola } from '@/compartilhado/hooks/usarConfiguracoesEscola';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, CartaoConteudo } from '@/compartilhado/componentes/UI';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    Clock,
    Save,
    AlertCircle,
    Loader2,
    LogIn,
    LogOut,
    ArrowRight,
    ArrowLeft,
    ShieldAlert,
    Wifi,
    WifiOff,
    Check,
    X,
    Lock,
    Sun,
    CloudSun,
    Moon,
    Timer,
    RefreshCw,
    Cloud
} from 'lucide-react';
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

/**
 * Componente principal para configuração das janelas de horário de acesso (Portaria Inteligente).
 */
export default function FormHorariosAcesso() {
    const { id: idEscola } = usarEscola();
    const { regras, carregando: carregandoHorarios, erro: erroHorarios, salvar: salvarHorarios, usandoCache } = usarRegrasHorarios(idEscola);
    const { configs, salvar: salvarConfigs, isLoading: carregandoConfigs } = usarConfiguracoesEscola();
    const [janelas, definirJanelas] = useState<JanelaHorarioAcesso[]>([]);
    const [salvando, definirSalvando] = useState(false);
    const { ehAdmin, ehCentral, usuario } = usarPermissoes();
    const [confirmandoQR, setConfirmandoQR] = useState<{ dinamico: boolean } | null>(null);
    const [statusSincronizacao, definirStatusSincronizacao] = useState<'sincronizado' | 'salvando' | 'erro' | 'pendente'>('sincronizado');
    const [indiceRemovendo, setIndiceRemovendo] = useState<number | null>(null);
    const [jaCarregou, setJaCarregou] = useState(false);

    const carregando = carregandoHorarios || carregandoConfigs;

    // Carregar janelas apenas no carregamento inicial
    useEffect(() => {
        if (!carregandoHorarios && !jaCarregou) {
            if (regras.length > 0) {
                definirJanelas(regras);
            }
            setJaCarregou(true);
        }
    }, [regras, carregandoHorarios, jaCarregou]);

    /**
     * Define a configuração visual e de texto baseada na hora e tipo de acesso.
     */
    const obterConfiguracaoTurno = (hora: string, tipo: JanelaHorarioAcesso['tipoAcesso'] = 'ENTRADA') => {
        if (!hora) return { label: 'Turno Indefinido', icone: Clock, cor: 'indigo', css: 'text-slate-400 bg-slate-50 border-slate-200' };
        const h = parseInt(hora.split(':')[0], 10);
        
        // Matutino: Entrada cedo ou Saída de quem estudou de manhã (até 13h59)
        if ((h >= 5 && h < 12) || (h >= 12 && h < 14 && tipo === 'SAIDA')) {
            return { label: 'Turno Matutino', icone: Sun, cor: 'amber', css: 'text-amber-600 bg-amber-50 border-amber-100' };
        }
        
        // Vespertino: Entrada após meio-dia ou Saída de quem estudou à tarde (até 19h59)
        if ((h >= 12 && h < 18 && tipo === 'ENTRADA') || (h >= 14 && h < 20 && tipo === 'SAIDA')) {
            return { label: 'Turno Vespertino', icone: CloudSun, cor: 'orange', css: 'text-orange-600 bg-orange-50 border-orange-100' };
        }
        
        // Noturno: Entrada após 18h ou Saídas tarde da noite
        return { label: 'Turno Noturno', icone: Moon, cor: 'indigo', css: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    };

    /**
     * Calcula o tempo de duração de uma janela em formato amigável.
     */
    const calcularDuracao = (inicio: string, fim: string) => {
        if (!inicio || !fim) return '';
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = fim.split(':').map(Number);
        let totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMinutos < 0) return '';
        const h = Math.floor(totalMinutos / 60);
        const m = totalMinutos % 60;
        return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
    };

    /**
     * Adiciona uma nova janela de horário inteligente baseada nas existentes.
     */
    const adicionarJanela = () => {
        const temEntradaMatutina = janelas.some(j => {
            const h = parseInt(j.horaInicio.split(':')[0], 10);
            return h < 12 && j.tipoAcesso === 'ENTRADA';
        });

        const temSaidaMatutina = janelas.some(j => {
            const h = parseInt(j.horaInicio.split(':')[0], 10);
            return h >= 11 && h < 14 && j.tipoAcesso === 'SAIDA';
        });

        const temEntradaVespertina = janelas.some(j => {
            const h = parseInt(j.horaInicio.split(':')[0], 10);
            return h >= 12 && h < 15 && j.tipoAcesso === 'ENTRADA';
        });

        const temSaidaVespertina = janelas.some(j => {
            const h = parseInt(j.horaInicio.split(':')[0], 10);
            return h >= 17 && h < 19 && j.tipoAcesso === 'SAIDA';
        });

        const temEntradaNoturna = janelas.some(j => {
            const h = parseInt(j.horaInicio.split(':')[0], 10);
            return h >= 18 && j.tipoAcesso === 'ENTRADA';
        });

        let novaJanela: JanelaHorarioAcesso;

        if (!temEntradaMatutina) {
            novaJanela = { horaInicio: '07:00', horaFim: '07:45', tipoAcesso: 'ENTRADA', descricao: 'Turno Matutino' };
        } else if (!temSaidaMatutina) {
            novaJanela = { horaInicio: '12:00', horaFim: '12:30', tipoAcesso: 'SAIDA', descricao: 'Turno Matutino' };
        } else if (!temEntradaVespertina) {
            novaJanela = { horaInicio: '13:00', horaFim: '13:45', tipoAcesso: 'ENTRADA', descricao: 'Turno Vespertino' };
        } else if (!temSaidaVespertina) {
            novaJanela = { horaInicio: '18:00', horaFim: '18:30', tipoAcesso: 'SAIDA', descricao: 'Turno Vespertino' };
        } else if (!temEntradaNoturna) {
            novaJanela = { horaInicio: '19:00', horaFim: '19:45', tipoAcesso: 'ENTRADA', descricao: 'Turno Noturno' };
        } else {
            novaJanela = { horaInicio: '22:15', horaFim: '22:45', tipoAcesso: 'SAIDA', descricao: 'Turno Noturno' };
        }

        definirJanelas([...janelas, novaJanela]);
    };

    /**
     * Remove uma janela da lista pelo índice.
     */
    const removerJanela = (indice: number) => {
        definirJanelas(janelas.filter((_, i) => i !== indice));
    };

    /**
     * Atualiza um campo específico de uma janela.
     */
    const atualizarJanela = (indice: number, campo: string, valor: string) => {
        const novasJanelas = [...janelas];
        novasJanelas[indice] = { ...novasJanelas[indice], [campo]: valor };
        
        // Se mudou a hora, recalcula o título inteligente
        if (campo === 'horaInicio') {
            novasJanelas[indice].descricao = obterConfiguracaoTurno(valor).label;
        }
        
        definirJanelas(novasJanelas);
    };

    // Auto-save inteligente com debounce
    useEffect(() => {
        // Evita salvar se não houver mudanças reais em relação ao que veio do servidor
        if (regras.length > 0 && JSON.stringify(janelas) === JSON.stringify(regras)) {
            definirStatusSincronizacao('sincronizado');
            return;
        }
        if (carregandoHorarios) return;

        // Se janelas estiver vazia e regras também, não faz nada
        if (janelas.length === 0 && regras.length === 0) {
            definirStatusSincronizacao('sincronizado');
            return;
        }

        definirStatusSincronizacao('pendente');

        const timeout = setTimeout(async () => {
            // Validações silenciosas
            for (let i = 0; i < janelas.length; i++) {
                const j = janelas[i];
                if (j.horaInicio >= j.horaFim) {
                    definirStatusSincronizacao('erro');
                    return;
                }
            }

            for (let i = 0; i < janelas.length; i++) {
                for (let k = i + 1; k < janelas.length; k++) {
                    const j1 = janelas[i];
                    const j2 = janelas[k];
                    // Check for overlap: (start1 < end2) && (end1 > start2)
                    if ((j1.horaInicio < j2.horaFim) && (j1.horaFim > j2.horaInicio)) {
                        definirStatusSincronizacao('erro');
                        return;
                    }
                }
            }

            // Se chegou aqui, está pronto para salvar
            definirStatusSincronizacao('salvando');
            try {
                await salvarHorarios(janelas);
                definirStatusSincronizacao('sincronizado');
            } catch (e) {
                definirStatusSincronizacao('erro');
            }
        }, 1500);

        return () => clearTimeout(timeout);
    }, [janelas, regras, salvarHorarios, carregandoHorarios]);

    /**
     * Solicita alteração na política de segurança (QR Code Dinâmico).
     */
    const handleSolicitarMudanca = (dinamico: boolean) => {
        if (!ehAdmin && !ehCentral) {
            toast.error('Acesso Negado: Apenas administradores podem alterar as políticas de segurança crítica.');
            return;
        }
        if (dinamico === configs?.qrDinamico) return;
        setConfirmandoQR({ dinamico });
    };

    /**
     * Confirma e executa a mudança na política de segurança.
     */
    const confirmarMudancaQR = async () => {
        if (!confirmandoQR) return;
        try {
            await salvarConfigs({ qrDinamico: confirmandoQR.dinamico });
            toast.success('Política de segurança atualizada com sucesso!');
        } catch (e) {
            toast.error('Erro ao atualizar política de segurança.');
        } finally {
            setConfirmandoQR(null);
        }
    };

    const StatusSincronizacao = (
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-500 ${
            statusSincronizacao === 'sincronizado' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
            statusSincronizacao === 'salvando' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
            statusSincronizacao === 'erro' ? 'bg-rose-50 border-rose-100 text-rose-600' :
            'bg-slate-50 border-slate-100 text-slate-400'
        }`}>
            {statusSincronizacao === 'salvando' ? (
                <RefreshCw size={14} className="animate-spin" />
            ) : statusSincronizacao === 'erro' ? (
                <AlertCircle size={14} />
            ) : (
                <Cloud size={14} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">
                {statusSincronizacao === 'sincronizado' ? 'Sincronizado' :
                 statusSincronizacao === 'salvando' ? 'Sincronizando...' :
                 statusSincronizacao === 'erro' ? 'Erro de Validação' :
                 'Aguardando...'}
            </span>
        </div>
    );

    return (
        <LayoutAdministrativo
            titulo="Horários"
            subtitulo="Defina os períodos de entrada e saída para automatizar o controle de acesso"
            acoes={StatusSincronizacao}
        >
            <div className="space-y-6 pb-16">

                {erroHorarios && !usandoCache && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-800 shadow-suave">
                        <AlertCircle size={20} className="shrink-0 text-rose-600 mt-1" />
                        <div>
                            <p className="font-bold text-sm uppercase tracking-tight">Serviço Indisponível</p>
                            <p className="text-sm opacity-80 mt-1">Não foi possível conectar ao servidor de horários. Tente atualizar a página em instantes.</p>
                        </div>
                    </div>
                )}

                {usandoCache && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 text-amber-800 shadow-suave">
                        <AlertCircle size={20} className="shrink-0 text-amber-600 mt-1" />
                        <div>
                            <p className="font-bold text-sm uppercase tracking-tight">Monitoramento em Cache</p>
                            <p className="text-sm opacity-80 mt-1">Você está visualizando dados offline. Alterações serão aplicadas globalmente assim que a conexão for restabelecida.</p>
                        </div>
                    </div>
                )}

                {/* --- A SEÇÃO DE SEGURANÇA FOI MOVIDA PARA A TELA DE CONFIGURAÇÕES --- */}
                <div className="h-4"></div>

                {carregando ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando Horários</span>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">

                        {janelas.length === 0 && (
                            <CartaoConteudo className="text-center py-24 bg-white border-2 border-dashed border-slate-200/60 rounded-2xl group transition-all hover:border-indigo-200 hover:bg-indigo-50/30 overflow-hidden relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-2xl pointer-events-none"></div>
                                
                                <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-white rounded-2xl flex items-center justify-center mx-auto mb-8 border border-indigo-100 shadow-suave text-indigo-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10">
                                    <Clock size={40} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-2xl font-black text-slate-900 mb-3 tracking-tight relative z-10">Ritmo da Portaria Silencioso</h4>
                                <p className="text-sm text-slate-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed relative z-10">
                                    Sua escola ainda não possui janelas de acesso configuradas. Defina os horários de pico para automação de registros.
                                </p>
                                <Botao
                                    variante="primario"
                                    tamanho="lg"
                                    icone={Plus}
                                    onClick={adicionarJanela}
                                    className="shadow-xl shadow-indigo-500/20 relative z-10"
                                >
                                    Criar Intervalo de Acesso
                                </Botao>
                            </CartaoConteudo>
                        )}

                        <div className="relative pl-8 space-y-12 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200/60">
                            {janelas.map((janela, indice) => {
                                const ehEntrada = janela.tipoAcesso === 'ENTRADA';
                                const turno = obterConfiguracaoTurno(janela.horaInicio, janela.tipoAcesso);
                                const duracao = calcularDuracao(janela.horaInicio, janela.horaFim);

                                return (
                                    <div key={indice} className="relative group/item">
                                        {/* Marcador da Timeline */}
                                        <div className={`absolute -left-[31px] top-6 w-5 h-5 rounded-2xl border-4 border-white shadow-md z-10 transition-all duration-500 group-hover/item:scale-125 ${
                                            ehEntrada ? 'bg-amber-500' : 'bg-indigo-600'
                                        }`}></div>

                                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-suave hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden">
                                            {/* Header do Card */}
                                            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover/item:rotate-12 ${turno.css}`}>
                                                        <turno.icone size={18} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                                                            {turno.label}
                                                        </h4>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Janela #{indice + 1}</span>
                                                            {duracao && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500/60 uppercase bg-indigo-50 px-2 py-0.5 rounded-2xl">
                                                                    <Timer size={10} /> {duracao}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-dashed ${
                                                        ehEntrada ? 'text-amber-600 border-amber-200 bg-amber-50/30' : 'text-indigo-600 border-indigo-200 bg-indigo-50/30'
                                                    }`}>
                                                        Fluxo de {ehEntrada ? 'Entrada' : 'Saída'}
                                                    </div>
                                                    <button
                                                        onClick={() => setIndiceRemovendo(indice)}
                                                        className="w-9 h-9 rounded-2xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Corpo do Card */}
                                            <div className="p-6 lg:p-10">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
                                                    
                                                    {/* Seção das Horas */}
                                                    <div className="flex flex-col space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Janela de Horário</label>
                                                        <div className="flex items-center justify-between gap-4 bg-slate-100/50 p-2 rounded-2xl border border-slate-200/40 h-20">
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <label className="text-[9px] font-[1000] text-slate-400 uppercase tracking-tighter mb-1 opacity-60">Início</label>
                                                                <input
                                                                    type="time"
                                                                    value={janela.horaInicio}
                                                                    onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                                                    className="w-full h-11 bg-white border border-slate-200 rounded-2xl text-lg font-black text-center p-0 text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit-fields-wrapper]:flex [&::-webkit-datetime-edit-fields-wrapper]:justify-center [&::-webkit-calendar-picker-indicator]:hidden"
                                                                />
                                                            </div>
                                                            <div className="w-4 h-0.5 bg-slate-300/50 rounded-full mt-4"></div>
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <label className="text-[9px] font-[1000] text-slate-400 uppercase tracking-tighter mb-1 opacity-60">Fim</label>
                                                                <input
                                                                    type="time"
                                                                    value={janela.horaFim}
                                                                    onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                                                    className="w-full h-11 bg-white border border-slate-200 rounded-2xl text-lg font-black text-center p-0 text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit-fields-wrapper]:flex [&::-webkit-datetime-edit-fields-wrapper]:justify-center [&::-webkit-calendar-picker-indicator]:hidden"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Seção do Sentido */}
                                                    <div className="flex flex-col space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sentido do Fluxo</label>
                                                        <div className="flex items-center bg-slate-100/50 p-2 rounded-2xl border border-slate-200/40 h-20 w-full">
                                                            <button
                                                                type="button"
                                                                onClick={() => atualizarJanela(indice, 'tipoAcesso', 'ENTRADA')}
                                                                className={`flex-1 flex flex-col justify-center items-center h-full rounded-2xl transition-all gap-1 ${
                                                                    ehEntrada ? 'bg-white text-amber-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                            >
                                                                <LogIn size={16} strokeWidth={3} />
                                                                <span className="text-[10px] font-[1000] tracking-widest">ENTRADA</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => atualizarJanela(indice, 'tipoAcesso', 'SAIDA')}
                                                                className={`flex-1 flex flex-col justify-center items-center h-full rounded-2xl transition-all gap-1 ${
                                                                    !ehEntrada ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                            >
                                                                <LogOut size={16} strokeWidth={3} />
                                                                <span className="text-[10px] font-[1000] tracking-widest uppercase">SAÍDA</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Resumo Visual */}
                                                    <div className="flex flex-col items-center justify-center border-l border-slate-100 pl-8 h-20">
                                                        <div className={`text-3xl font-black tracking-tighter flex items-baseline gap-1 ${ehEntrada ? 'text-amber-500' : 'text-indigo-600'}`}>
                                                            {janela.horaInicio}
                                                            <span className="text-xs text-slate-300 uppercase">até</span>
                                                            {janela.horaFim}
                                                        </div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Status Portaria</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {janelas.length > 0 && (
                             <button
                                 onClick={adicionarJanela}
                                 className="w-full mt-12 h-20 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:border-indigo-300 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex items-center justify-center gap-4 group"
                             >
                                 <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                     <Plus size={20} strokeWidth={3} />
                                 </div>
                                 Novo Bloco de Horário
                             </button>
                        )}

                    </div>
                )}
            </div>

            {indiceRemovendo !== null && (
                <ModalConfirmacao
                    titulo="Excluir Janela de Horário?"
                    mensagem={`Deseja realmente remover o ${obterConfiguracaoTurno(janelas[indiceRemovendo].horaInicio, janelas[indiceRemovendo].tipoAcesso).label}? Isso pode afetar o fluxo de ${janelas[indiceRemovendo].tipoAcesso === 'ENTRADA' ? 'entrada' : 'saída'} da portaria.`}
                    variante="perigo"
                    aoConfirmar={() => {
                        removerJanela(indiceRemovendo);
                        setIndiceRemovendo(null);
                        toast.success('Horário removido com sucesso!');
                    }}
                    aoCancelar={() => setIndiceRemovendo(null)}
                />
            )}
        </LayoutAdministrativo>
    );
}

