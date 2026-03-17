import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usarRegrasHorarios } from '@/funcionalidades/configuracao-horarios';
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
    Timer
} from 'lucide-react';
import { usarPermissoes } from '@/compartilhado/autorizacao/ContextoPermissoes';

export default function FormHorariosAcesso() {
    const { id: idEscola } = usarEscola();
    const { regras, carregando: carregandoHorarios, erro: erroHorarios, salvar: salvarHorarios, usandoCache } = usarRegrasHorarios(idEscola);
    const { configs, salvar: salvarConfigs, isLoading: carregandoConfigs } = usarConfiguracoesEscola();
    const [janelas, definirJanelas] = useState<JanelaHorarioAcesso[]>([]);
    const [salvando, definirSalvando] = useState(false);
    const { ehAdmin, ehCentral, usuario } = usarPermissoes();
    const [confirmandoQR, setConfirmandoQR] = useState<{ dinamico: boolean } | null>(null);

    const carregando = carregandoHorarios || carregandoConfigs;

    // ... (resto do código igual até o return)

    // Carregar janelas do hook ao montar
    useEffect(() => {
        if (regras.length > 0) {
            definirJanelas(regras);
        }
    }, [regras]);

    const obterTurnoConfig = (hora: string) => {
        if (!hora) return { label: 'Turno Indefinido', icone: Clock, cor: 'indigo', css: 'text-slate-400 bg-slate-50 border-slate-200' };
        const h = parseInt(hora.split(':')[0], 10);
        if (h >= 5 && h < 12) return { label: 'Turno Matutino', icone: Sun, cor: 'amber', css: 'text-amber-600 bg-amber-50 border-amber-100' };
        if (h >= 12 && h < 18) return { label: 'Turno Vespertino', icone: CloudSun, cor: 'orange', css: 'text-orange-600 bg-orange-50 border-orange-100' };
        return { label: 'Turno Noturno', icone: Moon, cor: 'indigo', css: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    };

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

    const adicionarJanela = () => {
        definirJanelas([
            ...janelas,
            {
                horaInicio: '07:00',
                horaFim: '08:30',
                tipoAcesso: 'ENTRADA',
                descricao: '',
            },
        ]);

        // Timeout pequeno apenas para rolar a tela até o novo elemento caso a lista esteja grande
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const removerJanela = (indice: number) => {
        definirJanelas(janelas.filter((_, i) => i !== indice));
    };

    const atualizarJanela = (indice: number, campo: string, valor: string) => {
        const novasJanelas = [...janelas];
        novasJanelas[indice] = { ...novasJanelas[indice], [campo]: valor };
        
        // Se mudou a hora, recalcula o título inteligente
        if (campo === 'horaInicio') {
            novasJanelas[indice].descricao = obterTurnoConfig(valor).label;
        }
        
        definirJanelas(novasJanelas);
    };

    const aoSalvar = async () => {
        // Validações
        for (let i = 0; i < janelas.length; i++) {
            const j = janelas[i];
            if (j.horaInicio >= j.horaFim) {
                toast.error(`A Janela ${i + 1} precisa terminar depois da hora de início.`);
                return;
            }
        }

        // Validação de sobreposição
        for (let i = 0; i < janelas.length; i++) {
            for (let k = i + 1; k < janelas.length; k++) {
                const j1 = janelas[i];
                const j2 = janelas[k];
                if ((j1.horaInicio < j2.horaFim) && (j1.horaFim > j2.horaInicio)) {
                    toast.error(`Sobreposição detectada entre os horários ${i + 1} e ${k + 1}. Ajuste-os para evitar conflitos na portaria.`);
                    return;
                }
            }
        }

        definirSalvando(true);
        try {
            await salvarHorarios(janelas);
            toast.success('Horários salvos com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar horários: ' + (e instanceof Error ? e.message : 'Tente novamente'));
        } finally {
            definirSalvando(false);
        }
    };

    const handleSolicitarMudanca = (dinamico: boolean) => {
        if (!ehAdmin && !ehCentral) {
            toast.error('Acesso Negado: Apenas administradores podem alterar as políticas de segurança crítica.');
            return;
        }
        if (dinamico === configs?.qrDinamico) return;
        setConfirmandoQR({ dinamico });
    };

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

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="sm"
            icone={Save}
            loading={salvando}
            onClick={aoSalvar}
            className="shadow-suave"
        >
            Salvar Horários
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Portaria Inteligente"
            subtitulo="Controle os períodos oficiais de fluxo escolar para automação de registros e segurança."
            acoes={AcoesHeader}
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

                {/* --- SEÇÃO DE SEGURANÇA DO CARTÃO DIGITAL (DESIGN REFINADO) --- */}
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col lg:flex-row items-center justify-between p-6 lg:p-8 gap-8">
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner ${
                                    configs?.qrDinamico 
                                    ? 'bg-amber-50 border-amber-100 text-amber-500' 
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-500'
                                }`}>
                                    <ShieldAlert size={28} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Protocolo de Validação</h3>
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                            configs?.qrDinamico 
                                            ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                            {configs?.qrDinamico ? 'Anti-Fraude Ativo' : 'Funcionamento Offline'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold max-w-sm leading-relaxed uppercase tracking-tight">
                                        {configs?.qrDinamico 
                                            ? "Codificação dinâmica que expira a cada 15 segundos. Impede o uso de prints e fotos do cartão." 
                                            : "O código permanece o mesmo. Ideal para locais onde o aluno possui pouco sinal de internet."
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Seleção de Modo (Segmented Control Refinado) */}
                            <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-2xl w-full sm:w-[380px] h-14 relative shadow-inner">
                                <button
                                    onClick={() => handleSolicitarMudanca(false)}
                                    disabled={carregandoConfigs}
                                    className={`flex-1 h-full rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        configs?.qrDinamico === false 
                                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                                        : 'text-slate-400 hover:text-slate-500'
                                    }`}
                                >
                                    <WifiOff size={14} className={configs?.qrDinamico === false ? 'text-indigo-500' : 'text-slate-400'} />
                                    QR ESTÁTICO
                                </button>
                                <button
                                    onClick={() => handleSolicitarMudanca(true)}
                                    disabled={carregandoConfigs}
                                    className={`flex-1 h-full rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        configs?.qrDinamico === true 
                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                                        : 'text-slate-400 hover:text-slate-500'
                                    }`}
                                >
                                    <Wifi size={14} />
                                    QR DINÂMICO
                                </button>
                            </div>
                        </div>

                        {/* Overlay de Confirmação (Portal para garantir visual real-full-screen) */}
                        {confirmandoQR && createPortal(
                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-300">
                                <div 
                                    className="max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] relative overflow-hidden">
                                        
                                        {/* Badge de Alerta Discreta */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                                <ShieldAlert size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-[1000] text-slate-900 uppercase tracking-tight">Alterar Segurança</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ação Administrativa</p>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-8">
                                            {confirmandoQR.dinamico 
                                                ? "Deseja ativar o modo Dinâmico? Isso passará a exigir que os alunos tenham internet para gerar o QR Code, prevenindo fraudes." 
                                                : "Deseja voltar para o modo Fixo? O sistema funcionará 100% offline, mas os alunos poderão usar capturas de tela (prints)."
                                            }
                                        </p>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setConfirmandoQR(null)}
                                                className="flex-1 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-[1000] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <Botao 
                                                variante="primario" 
                                                className={`flex-1 h-12 text-[11px] font-[1000] uppercase tracking-widest ${
                                                    confirmandoQR.dinamico 
                                                    ? 'bg-amber-500 border-amber-600 hover:bg-amber-600 shadow-amber-500/20' 
                                                    : 'bg-indigo-600 border-indigo-700 hover:bg-indigo-700 shadow-indigo-600/20'
                                                }`} 
                                                onClick={confirmarMudancaQR}
                                                loading={carregandoConfigs}
                                            >
                                                Confirmar
                                            </Botao>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-center gap-2 items-center opacity-40">
                                        <Lock size={12} className="text-slate-900" />
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Área Restrita</span>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                    {(!ehAdmin && !ehCentral) && (
                        <div className="mt-3 px-6 flex items-center gap-2 text-slate-400">
                            <Lock size={12} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Apenas Administradores podem alterar estas configurações</span>
                        </div>
                    )}
                </div>
                
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
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                                
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
                                const isEntrada = janela.tipoAcesso === 'ENTRADA';
                                const turno = obterTurnoConfig(janela.horaInicio);
                                const duracao = calcularDuracao(janela.horaInicio, janela.horaFim);

                                return (
                                    <div key={indice} className="relative group/item">
                                        {/* Marcador da Timeline */}
                                        <div className={`absolute -left-[31px] top-6 w-5 h-5 rounded-full border-4 border-white shadow-md z-10 transition-all duration-500 group-hover/item:scale-125 ${
                                            isEntrada ? 'bg-amber-500' : 'bg-indigo-600'
                                        }`}></div>

                                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-suave hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden">
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
                                                                <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500/60 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                                                                    <Timer size={10} /> {duracao}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-dashed ${
                                                        isEntrada ? 'text-amber-600 border-amber-200 bg-amber-50/30' : 'text-indigo-600 border-indigo-200 bg-indigo-50/30'
                                                    }`}>
                                                        Fluxo de {isEntrada ? 'Entrada' : 'Saída'}
                                                    </div>
                                                    <button
                                                        onClick={() => removerJanela(indice)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Corpo do Card */}
                                            <div className="p-6 lg:p-10 flex flex-col md:flex-row items-center gap-8 lg:gap-12">
                                                
                                                {/* Seção das Horas */}
                                                <div className="flex items-center gap-4 bg-slate-50/80 p-2 rounded-[2.5rem] border border-slate-100">
                                                    <div className="flex flex-col items-center">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Início</label>
                                                        <input
                                                            type="time"
                                                            value={janela.horaInicio}
                                                            onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                                            className="w-24 h-16 bg-white border border-slate-200 rounded-3xl text-xl font-black text-center text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm"
                                                        />
                                                    </div>
                                                    <div className="w-6 h-1 bg-slate-200 rounded-full mt-6"></div>
                                                    <div className="flex flex-col items-center">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Fim</label>
                                                        <input
                                                            type="time"
                                                            value={janela.horaFim}
                                                            onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                                            className="w-24 h-16 bg-white border border-slate-200 rounded-3xl text-xl font-black text-center text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Seção do Sentido */}
                                                <div className="flex-1 w-full space-y-3">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Configurar Sentido do Fluxo</label>
                                                    <div className="flex items-center bg-slate-100/50 p-2 rounded-[2.5rem] border border-slate-200/40 h-20">
                                                        <button
                                                            onClick={() => atualizarJanela(indice, 'tipoAcesso', 'ENTRADA')}
                                                            className={`flex-1 flex flex-col justify-center items-center h-full rounded-3xl transition-all gap-1 ${
                                                                isEntrada ? 'bg-white text-amber-600 shadow-xl shadow-amber-500/10 border border-amber-100' : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                        >
                                                            <LogIn size={16} strokeWidth={isEntrada ? 3 : 2} />
                                                            <span className="text-[10px] font-[1000] tracking-widest">ENTRADA</span>
                                                        </button>
                                                        <button
                                                            onClick={() => atualizarJanela(indice, 'tipoAcesso', 'SAIDA')}
                                                            className={`flex-1 flex flex-col justify-center items-center h-full rounded-3xl transition-all gap-1 ${
                                                                !isEntrada ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                        >
                                                            <LogOut size={16} strokeWidth={!isEntrada ? 3 : 2} />
                                                            <span className="text-[10px] font-[1000] tracking-widest uppercase">Saída</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Visual Summary (Right side on desktop) */}
                                                <div className="hidden xl:flex flex-col items-center justify-center border-l border-slate-100 pl-12 py-2">
                                                    <div className={`text-3xl font-black tracking-tighter flex items-baseline gap-1 ${isEntrada ? 'text-amber-500' : 'text-indigo-600'}`}>
                                                        {janela.horaInicio}
                                                        <span className="text-xs text-slate-300">até</span>
                                                        {janela.horaFim}
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Status Portaria</p>
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
        </LayoutAdministrativo>
    );
}

