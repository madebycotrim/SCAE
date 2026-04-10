import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { 
    Activity, ArrowUp, XCircle, Clock, 
    CheckCircle2, Search, Fingerprint, Trash2,
    User, ArrowRightCircle, Wifi, WifiOff, RefreshCw, Power, Lock, Zap, Radar, Cpu,
    MessageSquare, Brush, Settings
} from 'lucide-react';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { alunoServico } from '@/funcionalidades/academico/servicos/aluno.servico';
import { api } from '@/compartilhado/servicos/api';
import toast from 'react-hot-toast';

interface StatusAgente {
    ok: boolean;
    agente: string;
    versao: string;
    escola: string;
    status: string;
    stats: {
        entradas: number;
        saidas: number;
        negados: number;
        ultimoAcesso: string | null;
        ultimosEventos: Array<{
            nome: string;
            matricula?: string;
            turma?: string;
            tipo: string;
            detalhe?: string;
            timestamp: string;
        }>;
    };
    leitores: Array<{
        id: string;
        nome: string;
        tipo: string;
        online: boolean;
        ip?: string;
        totalUsuarios?: number;
    }>;
}

import { ModalComunicacaoVisual } from '@/funcionalidades/configuracoes/componentes/ModalComunicacaoVisual';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

export default function PaginaAgente() {
    const navegar = useNavigate();
    const escola = usarEscola();
    const slugEscola = escola.id;
    const [statusLocal, setStatusLocal] = useState<StatusAgente | null>(null);
    const [statusNuvem, setStatusNuvem] = useState<any>(null);
    const [carregando, setCarregando] = useState(true);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    // Estados para Modais
    const [modalVisualAberto, setModalVisualAberto] = useState(false);
    const [modalConfigAberto, setModalConfigAberto] = useState(false);

    // Estado para Busca de Alunos
    const [termoBusca, setTermoBusca] = useState('');
    const [cadastrandoPara, setCadastrandoPara] = useState<string | null>(null);
    const [biometriasConfirmadas, setBiometriasConfirmadas] = useState<Set<string>>(new Set());
    const [estadoConfirmacao, setEstadoConfirmacao] = useState<{
        aberto: boolean;
        titulo: string;
        mensagem: string;
        aoConfirmar: () => void;
        variante?: 'perigo' | 'padrao';
    }>({
        aberto: false,
        titulo: '',
        mensagem: '',
        aoConfirmar: () => {},
    });

    const { dados: dataAlunos, recarregar: atualizarAlunos } = usarConsulta(
        ['alunos-agente-busca', slugEscola],
        () => alunoServico.carregarOnline(),
        { enabled: !!slugEscola }
    );

    const alunos = (dataAlunos?.alunos || []).map(a => ({
        ...a,
        biometria_cadastrada: biometriasConfirmadas.has(a.matricula) ? 1 : a.biometria_cadastrada
    }));

    const alunosFiltrados = termoBusca.length >= 2 
        ? alunos.filter(a => 
            a.nome_completo.toLowerCase().includes(termoBusca.toLowerCase()) || 
            a.matricula.includes(termoBusca)
          ).slice(0, 5)
        : [];

    const verificarSaudeGlobal = async () => {
        try {
            const res = await api.obter<any>('/agente/status');
            if (res.ok) setStatusNuvem(res.status);
        } catch {} 
    };

    const enviarComandoRemoto = async (acao: string, params: any = {}) => {
        const toastId = toast.loading('Enviando ordem para o Agente...');
        try {
            await api.enviar('/agente/comandos', { acao, params });
            toast.success('Comando enfileirado! O Agente executará em instantes.', { id: toastId });
        } catch (e: any) {
            toast.error(`Falha ao enviar: ${e.message}`, { id: toastId });
        }
    };

    const verificarAgenteLocal = async () => {
        try {
            // Tenta 127.0.0.1 primeiro
            let res = await fetch('http://127.0.0.1:1912/ping', { mode: 'cors' }).catch(() => null);
            
            // Se falhar, tenta localhost (alguns navegadores preferem este em contextos seguros)
            if (!res) {
                res = await fetch('http://localhost:1912/ping', { mode: 'cors' }).catch(() => null);
            }

            if (!res || !res.ok) throw new Error();
            const dados = await res.json();
            
            setStatusLocal(dados);
            setErroLocal(null);
        } catch (e) {
            setStatusLocal(null);
            setErroLocal('AGENTE LOCAL DESCONECTADO');
        } finally {
            setCarregando(false);
        }
    };

    const iniciarCadastroBiometrico = async (matricula: string, nome: string) => {
        if (!statusLocal?.ok) {
            toast.error('Agente offline localmente. Use o computador da portaria para cadastrar.');
            return;
        }
        setCadastrandoPara(matricula);
        const toastId = toast.loading(`Aguardando digital de ${nome.split(' ')[0]} no leitor...`);
        try {
            const res = await fetch('http://127.0.0.1:1912/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id: matricula })
            });
            const data = await res.json();
            if (data.ok) {
                await api.enviar('/agente/confirmar-biometria', { matricula });
                toast.success('Digital vinculada!', { id: toastId });
                setBiometriasConfirmadas(prev => new Set(prev).add(matricula));
                setTimeout(atualizarAlunos, 1500);
            } else {
                toast.error(data.erro || 'Falha na captura.', { id: toastId });
            }
        } catch (e) {
            toast.error('Erro de conexão local.', { id: toastId });
        } finally {
            setCadastrandoPara(null);
        }
    };

    const limparHistorico = async () => {
        setEstadoConfirmacao({
            aberto: true,
            titulo: 'Limpar Todo Histórico?',
            mensagem: 'Atenção: Isso removerá TODOS os registros de acesso da nuvem permanentemente. Esta ação não pode ser desfeita.',
            variante: 'perigo',
            aoConfirmar: async () => {
                setEstadoConfirmacao(prev => ({ ...prev, aberto: false }));
                try {
                    await api.remover('/acesso/registros');
                    try { await fetch('http://127.0.0.1:1912/reset-stats', { method: 'POST' }); } catch { }
                    toast.success('Histórico removido!');
                    verificarAgenteLocal();
                } catch (e) {
                    toast.error('Falha ao limpar histórico.');
                }
            }
        });
    };

    useEffect(() => {
        verificarAgenteLocal();
        verificarSaudeGlobal();
        const interval = setInterval(() => {
            verificarAgenteLocal();
            verificarSaudeGlobal();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const isOnlineNuvem = statusNuvem?.agente_online;

    // Componente de Radar para o Cabeçalho
    const [radarAberto, setRadarAberto] = useState(false);
    const leitores = statusNuvem?.hardware || [];
    const onlineCount = leitores.filter((l: any) => l.online).length;

    const BotoesAcao = (
        <div className="flex items-center gap-2">
            {/* BOTÃO CONFIGURAÇÕES (AGENTE) */}
            <div className="relative">
                <button
                    onClick={() => setModalConfigAberto(!modalConfigAberto)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${modalConfigAberto ? 'bg-slate-200 text-slate-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    <Settings size={16} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Agente</span>
                </button>

                <AnimatePresence>
                    {modalConfigAberto && (
                        <>
                            <div className="fixed inset-0 z-[45]" onClick={() => setModalConfigAberto(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-[50] overflow-hidden"
                            >
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Ferramentas de Sistema</h4>
                                </div>
                                <div className="p-3 flex flex-col gap-2">
                                    <Botao variante="secundario" tamanho="sm" fullWidth icone={Power} aoClicar={() => {
                                        setEstadoConfirmacao({
                                            aberto: true,
                                            titulo: 'Reiniciar Agente?',
                                            mensagem: 'Deseja reiniciar o AGENTE agora? Isso cortará a conexão por alguns segundos e pode interromper leituras em andamento.',
                                            variante: 'perigo',
                                            aoConfirmar: () => {
                                                enviarComandoRemoto('REBOOT_AGENT');
                                                setEstadoConfirmacao(prev => ({ ...prev, aberto: false }));
                                                setModalConfigAberto(false);
                                            }
                                        });
                                    }}>Reiniciar Agente</Botao>
                                    <Botao variante="ghost" tamanho="sm" fullWidth icone={RefreshCw} aoClicar={() => {
                                        enviarComandoRemoto('FORCE_SYNC');
                                        setModalConfigAberto(false);
                                    }}>Forçar Sincronia</Botao>
                                    <Botao variante="ghost" tamanho="sm" fullWidth icone={MessageSquare} aoClicar={() => {
                                        setModalVisualAberto(true);
                                        setModalConfigAberto(false);
                                    }}>Telas e Visor</Botao>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTÃO RADAR */}
            <div className="relative">
                <button
                    onClick={() => setRadarAberto(!radarAberto)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all
                        ${radarAberto ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                    `}
                >
                    <div className="relative">
                        <Radar size={16} className={radarAberto || onlineCount > 0 ? 'animate-pulse' : ''} />
                        {onlineCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                        )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">Radar</span>
                </button>

                <AnimatePresence>
                    {radarAberto && (
                        <>
                            <div className="fixed inset-0 z-[45]" onClick={() => setRadarAberto(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-[50] overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipamentos Ativos</h4>
                                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                        {onlineCount} Online
                                    </span>
                                </div>
                                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {leitores.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Search size={24} className="mx-auto text-slate-200 mb-2" />
                                            <p className="text-[9px] font-black text-slate-300 uppercase">Procurando...</p>
                                        </div>
                                    ) : (
                                        leitores.map((leitor: any) => (
                                            <div key={leitor.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${leitor.online ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {leitor.online ? <Wifi size={14} /> : <WifiOff size={14} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{leitor.nome}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{leitor.ip}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {leitor.online && (
                                                        <button 
                                                            onClick={() => {
                                                                setEstadoConfirmacao({
                                                                    aberto: true,
                                                                    titulo: 'Reiniciar Hardware?',
                                                                    mensagem: `Deseja reiniciar o hardware ${leitor.nome} agora?`,
                                                                    variante: 'padrao',
                                                                    aoConfirmar: () => {
                                                                        enviarComandoRemoto('REBOOT_HARDWARE', { id: leitor.id });
                                                                        setEstadoConfirmacao(prev => ({ ...prev, aberto: false }));
                                                                    }
                                                                });
                                                            }}
                                                            className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Reiniciar este hardware"
                                                        >
                                                            <RefreshCw size={12} />
                                                        </button>
                                                    )}
                                                    <div className={`w-1.5 h-1.5 rounded-full ${leitor.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                                    <Botao 
                                        variante="ghost" 
                                        tamanho="sm" 
                                        icone={Brush} 
                                        fullWidth
                                        aoClicar={() => {
                                            setEstadoConfirmacao({
                                                aberto: true,
                                                titulo: 'Faxina de Hardware?',
                                                mensagem: 'Deseja executar a Faxina de Hardware? Isso remove IDs órfãos do chip e sincroniza a lista de usuários autorizados.',
                                                variante: 'perigo',
                                                aoConfirmar: () => {
                                                    enviarComandoRemoto('CLEAN_HARDWARE');
                                                    setEstadoConfirmacao(prev => ({ ...prev, aberto: false }));
                                                }
                                            });
                                        }}
                                    >
                                        Fazer Faxina Geral
                                    </Botao>
                                    <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest">Remove usuários antigos do chip</p>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    return (
        <LayoutAdministrativo 
            titulo="Monitor do Agente" 
            subtitulo="Status de saúde e controle de acesso remoto"
            acoes={BotoesAcao}
        >
            <div className="space-y-6">
                
                {/* STATUS BAR SIMPLIFICADA */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${statusLocal ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Agente Local: {statusLocal ? 'Conectado' : 'Buscando...'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isOnlineNuvem ? 'bg-eletrico animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Sincronia Nuvem: {isOnlineNuvem ? 'Ativo' : 'Desconectado'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-300">
                        <span className="text-[9px] font-black uppercase tracking-tighter">Versão {statusLocal?.versao || '?.?'}</span>
                        <div className="w-1 h-1 bg-slate-100 rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[150px]">{statusLocal?.escola || ''}</span>
                    </div>
                </div>

                {/* MÉTRICAS (MISTO LOCAL/NUVEM) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Fluxo Hoje', valor: statusLocal?.stats?.entradas || 0, cor: 'bg-emerald-500', icone: ArrowUp, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
                        { label: 'Alertas / Negados', valor: statusLocal?.stats?.negados || 0, cor: 'bg-rose-500', icone: XCircle, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
                        { label: 'Tempo de Uptime', valor: statusNuvem?.uptime_seconds ? `${Math.floor(statusNuvem.uptime_seconds/3600)}h` : '--', cor: 'bg-amber-500', icone: Clock, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
                        { label: 'Sinal Úl. Acesso', valor: statusLocal?.stats?.ultimoAcesso || '--:--', cor: 'bg-indigo-500', icone: Activity, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' }
                    ].map((item, i) => (
                        <div key={i} className="relative bg-white p-5 rounded-r-2xl rounded-l-none border border-slate-100 shadow-sm flex items-center gap-4 group transition-all hover:shadow-md overflow-hidden">
                            {/* Barra de Acento Lateral */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.cor} opacity-60 group-hover:opacity-100 transition-all`} />
                            
                            {/* Ícone Circular (Sem Borda) */}
                            <div className={`w-12 h-12 rounded-full ${item.bg} ${item.text} flex items-center justify-center shrink-0`}>
                                <item.icone size={22} strokeWidth={2.5} />
                            </div>

                            {/* Conteúdo */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                                <span className="text-xl font-black text-slate-800 leading-none">{item.valor}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLUNA PRINCIPAL (ESQUERDA) */}
                    <div className="lg:col-span-2 space-y-4">
                        <CartaoConteudo className="p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="text"
                                    placeholder="Cadastrar Biometria: Nome ou matrícula..."
                                    value={termoBusca}
                                    onChange={(e) => setTermoBusca(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-eletrico transition-all"
                                />
                            </div>

                            <div className="space-y-3">
                                {alunosFiltrados.map((aluno) => (
                                    <div key={aluno.matricula} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-eletrico/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${aluno.biometria_cadastrada ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                                {aluno.biometria_cadastrada ? <CheckCircle2 size={24} /> : <User size={24} />}
                                            </div>
                                            <div>
                                                <h5 className="text-[13px] font-black text-slate-800 uppercase">{aluno.nome_completo}</h5>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aluno.matricula} • {aluno.turma_id || 'SEM TURMA'}</p>
                                            </div>
                                        </div>
                                        <Botao 
                                            variante={aluno.biometria_cadastrada ? 'secundario' : 'primario'}
                                            onClick={() => iniciarCadastroBiometrico(aluno.matricula, aluno.nome_completo)}
                                            carregando={cadastrandoPara === aluno.matricula}
                                            disabled={!statusLocal}
                                            icone={Fingerprint}
                                        >
                                            {aluno.biometria_cadastrada ? 'Recadastrar' : 'Cadastrar'}
                                        </Botao>
                                    </div>
                                ))}
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* COLUNA LATERAL (DIREITA) - FLUXO REAL-TIME */}
                    <div className="space-y-6">
                        <CartaoConteudo className="p-6">
                             <div className="flex items-center justify-between mb-6 px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo Real-Time</h4>
                                <button onClick={limparHistorico} className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1.5"><Trash2 size={12} /> Limpar</button>
                            </div>
                            <div className="space-y-3">
                                {(statusLocal?.stats?.ultimosEventos || []).map((ev, i) => (
                                    <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-eletrico bg-white border border-slate-100 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className={`w-2 h-2 rounded-full ${ev.tipo === 'NEGADO' || ev.tipo === 'TURNO_ERRADO' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-none mb-1">{ev.nome}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{ev.tipo} • {ev.detalhe || 'OK'}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!statusLocal?.stats?.ultimosEventos || statusLocal.stats.ultimosEventos.length === 0) && (
                                    <div className="py-10 text-center">
                                        <Clock className="mx-auto text-slate-200 mb-2" size={24} />
                                        <p className="text-[9px] font-black text-slate-300 uppercase">Aguardando acessos...</p>
                                    </div>
                                )}
                            </div>
                        </CartaoConteudo>
                    </div>
                </div>
            </div>
            <ModalComunicacaoVisual 
                aberto={modalVisualAberto} 
                aoFechar={() => setModalVisualAberto(false)}
                enviarComandoRemoto={enviarComandoRemoto}
            />

            {estadoConfirmacao.aberto && (
                <ModalConfirmacao
                    titulo={estadoConfirmacao.titulo}
                    mensagem={estadoConfirmacao.mensagem}
                    aoConfirmar={estadoConfirmacao.aoConfirmar}
                    aoCancelar={() => setEstadoConfirmacao(prev => ({ ...prev, aberto: false }))}
                    variante={estadoConfirmacao.variante}
                />
            )}
        </LayoutAdministrativo>
    );
}
