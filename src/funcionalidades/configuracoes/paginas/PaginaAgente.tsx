import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao, CardMetrica } from '@/compartilhado/componentes/UI';
import { 
    Activity, ArrowUp, XCircle, Clock, 
    CheckCircle2, Search, Fingerprint, Trash2,
    User, Wifi, WifiOff, RefreshCw, Power, Zap, Radar,
    MessageSquare, Brush, Settings
} from 'lucide-react';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { alunoServico } from '@/funcionalidades/academico/servicos/aluno.servico';
import { api } from '@/compartilhado/servicos/api';
import toast from 'react-hot-toast';

import { agenteServico, EstadoAgenteLocal } from '@/compartilhado/servicos/agente.servico';
import { ModalComunicacaoVisual } from '@/funcionalidades/configuracoes/componentes/ModalComunicacaoVisual';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';
import { usarAgente } from '@/compartilhado/contextos/ContextoAgente';

/**
 * Dashboard de Telemetria e Comando do Agente.
 * Permite monitorar a saúde do Catraki Edge Agent, cadastrar biometrias em tempo real
 * e emitir diretivas remotas para o hardware da portaria.
 */
export default function PaginaAgente() {
    const escola = usarEscola();
    const slugEscola = escola.id;

    // Estados de Telemetria
    const [estadoLocal, definirEstadoLocal] = useState<EstadoAgenteLocal | null>(null);
    const [estadoNuvem, definirEstadoNuvem] = useState<any>(null);
    const [carregando, setCarregando] = useState(true);
    const [erroConexaoLocal, setErroConexaoLocal] = useState<string | null>(null);

    // Controle de Interface
    const [modalVisualAberto, setModalVisualAberto] = useState(false);
    const [menuConfigAberto, setMenuConfigAberto] = useState(false);
    const [radarAberto, setRadarAberto] = useState(false);

    // Lógica de Cadastro Biométrico
    const [termoBusca, setTermoBusca] = useState('');
    const [matriculaEmCadastro, setMatriculaEmCadastro] = useState<string | null>(null);
    const [biometriasConfirmadas, setBiometriasConfirmadas] = useState<Set<string>>(new Set());

    // Estado do Gerenciador de Confirmação (UI)
    const [confirmacaoUI, definirConfirmacaoUI] = useState<{
        aberto: boolean;
        titulo: string;
        mensagem: string;
        aoConfirmar: () => void;
        variante?: 'perigo' | 'padrao';
        semCancelar?: boolean;
        textoConfirmar?: string;
    }>({
        aberto: false,
        titulo: '',
        mensagem: '',
        aoConfirmar: () => {},
    });

    /** Carrega lista de alunos para busca de cadastro */
    const { dados: dadosAlunos, recarregar: atualizarAlunos } = usarConsulta(
        ['alunos-agente-busca', slugEscola],
        () => alunoServico.carregarOnline(),
        { enabled: !!slugEscola }
    );

    /** Alunos com flag de biometria atualizado em tempo real */
    const listaAlunos = (dadosAlunos?.alunos || []).map(aluno => ({
        ...aluno,
        biometria_cadastrada: biometriasConfirmadas.has(aluno.matricula) ? 1 : aluno.biometria_cadastrada
    }));

    /** Filtro dinâmico para seleção de aluno */
    const alunosFiltrados = termoBusca.length >= 2 
        ? listaAlunos.filter(aluno => 
            aluno.nome_completo.toLowerCase().includes(termoBusca.toLowerCase()) || 
            aluno.matricula.includes(termoBusca)
          ).slice(0, 5)
        : [];

    /**
     * Sincroniza o status do agente registrado no servidor central (Nuvem).
     */
    const verificarSaudeNuvem = async () => {
        try {
            const resposta = await api.obter<any>('/agente/status');
            if (resposta.ok) definirEstadoNuvem(resposta.status);
        } catch (erro) {
            // Silencioso: mantem estado anterior
        } 
    };

    /**
     * Envia um comando administrativo para a fila de processamento do agente.
     * @param acao - Identificador da diretiva (ex: REBOOT_AGENT)
     * @param parametros - Dados complementares para o comando
     */
    const enviarComandoAdministrativo = async (acao: string, parametros: any = {}) => {
        const idAviso = toast.loading('Despachando diretiva para o Agente...');
        try {
            await api.enviar('/agente/comandos', { acao, params: parametros });
            toast.success('Comando enfileirado no Barramento de Mensagens.', { id: idAviso });
        } catch (erro: any) {
            toast.error(`Falha no despacho: ${erro.message}`, { id: idAviso });
        }
    };

    /**
     * Tenta estabelecer contato com o componente de software local.
     */
    const verificarConexaoLocal = async () => {
        try {
            const dados = await agenteServico.verificarSaude();
            definirEstadoLocal(dados);
            setErroConexaoLocal(null);
        } catch (erro) {
            definirEstadoLocal(null);
            setErroConexaoLocal('AGENTE LOCAL DESCONECTADO');
        } finally {
            setCarregando(false);
        }
    };

    /**
     * Aciona o hardware local para captura e registro da digital de um aluno.
     * @param matricula - CPF ou Matrícula do aluno
     * @param nome - Nome completo para feedback visual
     */
    const gerenciarCadastroBiometrico = async (matricula: string, nome: string) => {
        if (!estadoLocal?.online) {
            toast.error('O Agente Local deve estar online para capturar biometrias.');
            return;
        }

        setMatriculaEmCadastro(matricula);
        const idAviso = toast.loading(`Posicione o dedo de ${nome.split(' ')[0]} no leitor...`);

        try {
            const resposta = await agenteServico.iniciarCaptura(matricula);
            
            if (resposta.ok) {
                await api.enviar('/agente/confirmar-biometria', { matricula });
                toast.success('Assinatura biométrica vinculada ao rastro digital!', { id: idAviso });
                setBiometriasConfirmadas(anterior => new Set(anterior).add(matricula));
                setTimeout(atualizarAlunos, 1500);
            } else {
                const mensagemErro = resposta.erro || 'Falha técnica na captura.';
                if (mensagemErro.includes('cadastrada')) {
                    toast.dismiss(idAviso);
                    definirConfirmacaoUI({
                        aberto: true,
                        titulo: 'Digital Duplicada',
                        mensagem: 'O algoritmo de segurança identificou que esta digital já está associada a outra conta neste terminal.',
                        variante: 'perigo',
                        semCancelar: true,
                        aoConfirmar: () => definirConfirmacaoUI(anterior => ({ ...anterior, aberto: false })),
                        textoConfirmar: 'Entendido'
                    });
                } else {
                    toast.error(mensagemErro, { id: idAviso });
                }
            }
        } catch (erro) {
            toast.error('Erro de protocolo com o leitor biométrico.', { id: idAviso });
        } finally {
            setMatriculaEmCadastro(null);
        }
    };

    /**
     * Solicita confirmação antes de apagar registros voláteis.
     */
    const solicitarLimpezaHistorico = () => {
        definirConfirmacaoUI({
            aberto: true,
            titulo: 'Purgar Histórico?',
            mensagem: 'Esta operação removerá os registros de eventos da sessão atual. Os dados consolidados na nuvem não serão afetados.',
            variante: 'perigo',
            aoConfirmar: async () => {
                definirConfirmacaoUI(anterior => ({ ...anterior, aberto: false }));
                try {
                    await api.remover('/acesso/registros');
                    await agenteServico.resetarEstatisticas();
                    toast.success('Pico de tráfego resetado.');
                    verificarConexaoLocal();
                } catch (erro) {
                    toast.error('Falha na purgação de dados.');
                }
            }
        });
    };

    /** Loop de Monitoramento (Heartbeat) */
    useEffect(() => {
        verificarConexaoLocal();
        verificarSaudeNuvem();
        
        const intervalo = setInterval(() => {
            verificarConexaoLocal();
            verificarSaudeNuvem();
        }, 5000);

        return () => clearInterval(intervalo);
    }, []);

    const estaConectadoNuvem = estadoNuvem?.agente_online;
    const listaLeitores = estadoNuvem?.hardware || [];
    const contagemLeitoresOnline = listaLeitores.filter((leitor: any) => leitor.online).length;

    /** Componente de Interface de Ações Master */
    const AcoesMaster = (
        <div className="flex items-center gap-4">
            {/* STATUS DE CONECTIVIDADE */}
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2" title={estadoLocal ? `Hardware v${estadoLocal.versao}` : 'Serviço offline'}>
                    <div className={`w-2 h-2 rounded-full ${estadoLocal ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Agente: {estadoLocal ? 'Online' : 'Offline'}</span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${estaConectadoNuvem ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-rose-500'}`} />
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Nuvem: {estaConectadoNuvem ? 'Ativa' : 'Desconectada'}</span>
                </div>
            </div>

            <div className="w-px h-5 bg-slate-200 mx-1 hidden md:block" />

            {/* BARRA DE CONTROLES */}
            <div className="flex items-center gap-2">
                {/* MENU DE CONFIGURAÇÕES DO AGENTE */}
                <div className="relative">
                    <button
                        onClick={() => setMenuConfigAberto(!menuConfigAberto)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all ${menuConfigAberto ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Settings size={16} />
                        <span className="text-[10px] font-black uppercase tracking-tight">Sistema</span>
                    </button>

                    <AnimatePresence>
                        {menuConfigAberto && (
                            <>
                                <div className="fixed inset-0 z-[45]" onClick={() => setMenuConfigAberto(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-[50] overflow-hidden"
                                >
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Console Administrativo</h4>
                                    </div>
                                    <div className="p-3 flex flex-col gap-2">
                                        <Botao variante="secundario" tamanho="sm" fullWidth icone={Power} aoClicar={() => {
                                            definirConfirmacaoUI({
                                                aberto: true,
                                                titulo: 'Reiniciar Agente?',
                                                mensagem: 'Esta ação forçará o reinício do software servidor local.',
                                                variante: 'perigo',
                                                aoConfirmar: () => {
                                                    enviarComandoAdministrativo('REBOOT_AGENT');
                                                    definirConfirmacaoUI(anterior => ({ ...anterior, aberto: false }));
                                                    setMenuConfigAberto(false);
                                                }
                                            });
                                        }}>Reiniciar Binário</Botao>
                                        <Botao variante="ghost" tamanho="sm" fullWidth icone={RefreshCw} aoClicar={() => {
                                            enviarComandoAdministrativo('FORCE_SYNC');
                                            setMenuConfigAberto(false);
                                        }}>Forçar Sincronia</Botao>
                                        <Botao variante="ghost" tamanho="sm" fullWidth icone={MessageSquare} aoClicar={() => {
                                            setModalVisualAberto(true);
                                            setMenuConfigAberto(false);
                                        }}>Comunicação Visual</Botao>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* BOTÃO DO RADAR DE HARDWARE */}
                <div className="relative">
                    <button
                        onClick={() => setRadarAberto(!radarAberto)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all
                            ${radarAberto ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200 shadow-inner' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                        `}
                    >
                        <div className="relative">
                            <Radar size={16} className={radarAberto || contagemLeitoresOnline > 0 ? 'animate-pulse' : ''} />
                            {contagemLeitoresOnline > 0 && (
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
                                    className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[50] overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Terminais de Leitura</h4>
                                        <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-full uppercase border border-emerald-100 italic">
                                            {contagemLeitoresOnline} online
                                        </span>
                                    </div>
                                    <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                                        {listaLeitores.length === 0 ? (
                                            <div className="py-10 text-center flex flex-col items-center">
                                                <Radar size={32} className="text-slate-100 mb-4" />
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Escaneando barramento...</p>
                                            </div>
                                        ) : (
                                            listaLeitores.map((leitor: any) => (
                                                <div key={leitor.id} className="p-4 bg-slate-50 border border-slate-200/50 rounded-[1.5rem] flex items-center justify-between group transition-colors hover:bg-white hover:border-indigo-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${leitor.online ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-400'}`}>
                                                            {leitor.online ? <Wifi size={18} /> : <WifiOff size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1.5">{leitor.nome}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter bg-white px-1.5 py-0.5 rounded border border-slate-100">{leitor.ip}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {leitor.online && (
                                                            <button 
                                                                onClick={() => {
                                                                    definirConfirmacaoUI({
                                                                        aberto: true,
                                                                        titulo: 'Reiniciar Terminal?',
                                                                        mensagem: `Gostaria de forçar o reboot de hardware para o leitor "${leitor.nome}"?`,
                                                                        variante: 'padrao',
                                                                        aoConfirmar: () => {
                                                                            enviarComandoAdministrativo('REBOOT_HARDWARE', { id: leitor.id });
                                                                            definirConfirmacaoUI(anterior => ({ ...anterior, aberto: false }));
                                                                        }
                                                                    });
                                                                }}
                                                                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm"
                                                                title="Reiniciar este hardware"
                                                            >
                                                                <RefreshCw size={14} />
                                                            </button>
                                                        )}
                                                        <div className={`w-2 h-2 rounded-full ${leitor.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4">
                                        <Botao 
                                            variante="secundario" 
                                            tamanho="sm" 
                                            icone={Brush} 
                                            fullWidth
                                            aoClicar={() => {
                                                definirConfirmacaoUI({
                                                    aberto: true,
                                                    titulo: 'Faxina de Tabelas?',
                                                    mensagem: 'Isso limpará os registros temporários de IDs órfãos no cache do hardware.',
                                                    variante: 'perigo',
                                                    aoConfirmar: () => {
                                                        enviarComandoAdministrativo('CLEAN_HARDWARE');
                                                        definirConfirmacaoUI(anterior => ({ ...anterior, aberto: false }));
                                                    }
                                                });
                                            }}
                                        >
                                            Executar Limpeza
                                        </Botao>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

    return (
        <LayoutAdministrativo 
            titulo="Operação de Hardware" 
            subtitulo="Monitoramento em tempo real do ecossistema local"
            acoes={AcoesMaster}
        >
            <div className="space-y-8">
                
                {/* MÉTRICAS DE OPERAÇÃO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CardMetrica
                        label="Fluxo Registrado"
                        valor={estadoLocal?.stats?.entradas || 0}
                        icone={ArrowUp}
                        bg="bg-emerald-50/50"
                        text="text-emerald-600"
                        border="border-emerald-100/50"
                    />
                    <CardMetrica
                        label="Divergências"
                        valor={estadoLocal?.stats?.negados || 0}
                        icone={XCircle}
                        bg="bg-rose-50/50"
                        text="text-rose-600"
                        border="border-rose-100/50"
                    />
                    <CardMetrica
                        label="Uptime Servidor"
                        valor={estadoNuvem?.uptime_seconds ? `${Math.floor(estadoNuvem.uptime_seconds / 3600)}h` : '--'}
                        icone={Clock}
                        bg="bg-indigo-50/50"
                        text="text-indigo-600"
                        border="border-indigo-100/50"
                    />
                    <CardMetrica
                        label="Latência Pulsar"
                        valor={estadoLocal?.stats?.ultimoAcesso || '--:--'}
                        icone={Activity}
                        bg="bg-slate-100/50"
                        text="text-slate-600"
                        border="border-slate-200/50"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* BUSCA DE BIOMETRIA */}
                    <div className="lg:col-span-8 flex flex-col">
                        <CartaoConteudo className="p-10 flex-1 bg-white/60 backdrop-blur-3xl shadow-2xl rounded-[2.5rem]">
                            <div className="flex items-center justify-between mb-10">
                                <div className="space-y-1">
                                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] leading-none mb-2">Central de Identidade</h4>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vinculação de rastro biométrico em alta fidelidade</p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
                                    <Fingerprint size={24} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="relative mb-8 group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                                    <Search size={24} />
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Localizar Aluno (Nome ou Matrícula)..."
                                    value={termoBusca}
                                    onChange={(e) => setTermoBusca(e.target.value)}
                                    className="w-full pl-16 pr-6 h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] font-bold text-sm outline-none focus:bg-white focus:border-slate-900 focus:shadow-2xl transition-all placeholder:text-slate-300 uppercase tracking-widest text-slate-900"
                                />
                            </div>

                            <div className="space-y-4">
                                {alunosFiltrados.length > 0 ? (
                                    alunosFiltrados.map((aluno) => (
                                        <motion.div 
                                            key={aluno.matricula} 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-slate-900/10 hover:shadow-2xl transition-all"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${aluno.biometria_cadastrada ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                                                    {aluno.biometria_cadastrada ? <CheckCircle2 size={28} /> : <User size={28} />}
                                                </div>
                                                <div>
                                                    <h5 className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none mb-2">{aluno.nome_completo}</h5>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{aluno.matricula}</span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{aluno.turma_id || 'INDISPONÍVEL'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Botao 
                                                variante={aluno.biometria_cadastrada ? 'secundario' : 'primario'}
                                                aoClicar={() => gerenciarCadastroBiometrico(aluno.matricula, aluno.nome_completo)}
                                                carregando={matriculaEmCadastro === aluno.matricula}
                                                disabled={!estadoLocal}
                                                icone={Fingerprint}
                                            >
                                                {aluno.biometria_cadastrada ? 'Recadastrar' : 'Capturar Digital'}
                                            </Botao>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50/30 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl relative border border-slate-50">
                                            {termoBusca.length > 0 ? (
                                                <Search size={32} className="text-slate-200" />
                                            ) : (
                                                <>
                                                    <Radar size={32} className="text-slate-200" strokeWidth={1} />
                                                    <div className="absolute top-0 right-0 w-6 h-6 bg-indigo-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                                                        <Zap size={10} className="text-white fill-white" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <h5 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">
                                            {termoBusca.length > 0 ? "Registro não mapeado" : "Sonar de Identidade Ativo"}
                                        </h5>
                                        <p className="text-[10px] font-bold text-slate-400 max-w-[280px] leading-relaxed uppercase tracking-tighter">
                                            {termoBusca.length > 0 
                                                ? "O rastro acadêmico não foi localizado no barramento." 
                                                : "Digite o protocolo do aluno para vincular uma nova digital no hardware local."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* LIVE RADAR (DIREITA) */}
                    <div className="lg:col-span-4 flex flex-col">
                        <CartaoConteudo className="p-8 flex-1 bg-white border border-slate-200 shadow-xl rounded-[2.5rem]">
                             <div className="flex items-center justify-between mb-8 px-2">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">Live Radar</h4>
                                <button onClick={solicitarLimpezaHistorico} className="text-[9px] font-black text-rose-500 hover:text-rose-600 transition-colors uppercase flex items-center gap-2 tracking-[0.2em]"><Trash2 size={14} /> Purgar</button>
                            </div>
                            <div className="space-y-4">
                                {(estadoLocal?.stats?.ultimosEventos || []).map((evento, index) => {
                                    const éAlerta = evento.tipo !== 'ENTRADA' && evento.tipo !== 'SAIDA';
                                    const éSaída = evento.tipo === 'SAIDA';

                                    return (
                                        <motion.div 
                                            key={index} 
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-4 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-between group hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${éAlerta ? 'bg-rose-50 text-rose-500' : éSaída ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                    {éAlerta ? <XCircle size={18} /> : éSaída ? <Zap size={18} /> : <Activity size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-black text-slate-900 uppercase leading-none mb-1.5">{evento.nome.split(' ')[0]}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{evento.matricula}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-900 mb-1 leading-none">
                                                    {new Date(evento.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic ${éAlerta ? 'bg-rose-100 text-rose-600' : éSaída ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {evento.tipo}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {(!estadoLocal?.stats?.ultimosEventos || estadoLocal.stats.ultimosEventos.length === 0) && (
                                    <div className="py-24 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                                            <Clock className="text-slate-100" size={28} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Silêncio Operacional</p>
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
                enviarComandoRemoto={enviarComandoAdministrativo}
            />

            {confirmacaoUI.aberto && (
                <ModalConfirmacao
                    titulo={confirmacaoUI.titulo}
                    mensagem={confirmacaoUI.mensagem}
                    aoConfirmar={confirmacaoUI.aoConfirmar}
                    aoCancelar={() => definirConfirmacaoUI(anterior => ({ ...anterior, aberto: false }))}
                    variante={confirmacaoUI.variante}
                    semCancelar={confirmacaoUI.semCancelar}
                    textoConfirmar={confirmacaoUI.textoConfirmar}
                />
            )}
        </LayoutAdministrativo>
    );
}
