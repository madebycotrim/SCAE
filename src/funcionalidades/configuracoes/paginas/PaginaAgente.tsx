import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { 
    Cpu, 
    RefreshCw, 
    ShieldCheck, 
    Activity, 
    Globe, 
    HardDrive,
    Terminal,
    Power,
    CheckCircle2,
    XCircle,
    Fingerprint,
    Search,
    User,
    ChevronRight,
    Loader2,
    ArrowUp,
    Clock,
    Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { alunoServico } from '@/funcionalidades/academico/servicos/aluno.servico';
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
            tipo: string;
            timestamp: string;
        }>;
    };
    leitores: Array<{
        id: string;
        nome: string;
        tipo: string;
        online: boolean;
    }>;
}

export default function PaginaAgente() {
    const { id: slugEscola } = usarEscola();
    const [status, setStatus] = useState<StatusAgente | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    // Estado para Busca de Alunos
    const [termoBusca, setTermoBusca] = useState('');
    const [cadastrandoPara, setCadastrandoPara] = useState<string | null>(null);

    const { dados: dataAlunos } = usarConsulta(
        ['alunos-agente-busca', slugEscola],
        () => alunoServico.carregarOnline(),
        { enabled: !!slugEscola }
    );

    const alunos = dataAlunos?.alunos || [];

    const alunosFiltrados = termoBusca.length >= 2 
        ? alunos.filter(a => 
            a.nome_completo.toLowerCase().includes(termoBusca.toLowerCase()) || 
            a.matricula.includes(termoBusca)
          ).slice(0, 5)
        : [];

    const iniciarCadastroBiometrico = async (matricula: string, nome: string) => {
        if (!status?.ok) {
            toast.error('Agente offline. Não é possível iniciar cadastro.');
            return;
        }

        setCadastrandoPara(matricula);
        toast.loading(`Aguardando digital de ${nome.split(' ')[0]}...`, { id: 'enroll-toast' });

        try {
            const res = await fetch('http://127.0.0.1:1912/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id: matricula })
            });

            const data = await res.json();
            if (data.ok) {
                toast.success('Biometria cadastrada com sucesso!', { id: 'enroll-toast' });
            } else {
                toast.error(data.mensagem || 'Falha ao cadastrar biometria.', { id: 'enroll-toast' });
            }
        } catch (e) {
            toast.error('Erro de comunicação com o Agente local.', { id: 'enroll-toast' });
        } finally {
            setCadastrandoPara(null);
        }
    };

    const verificarAgente = async () => {
        setCarregando(true);
        setErro(null);
        try {
            const res = await fetch('http://127.0.0.1:1912/ping');
            if (!res.ok) throw new Error('Agente não respondeu corretamente');
            const dados = await res.json();
            setStatus(dados);
        } catch (e) {
            setErro('Não foi possível comunicar com o Agente Catraki Local. Certifique-se que o aplicativo está aberto neste computador.');
            setStatus(null);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        verificarAgente();
        const interval = setInterval(verificarAgente, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <LayoutAdministrativo
            titulo="Agente de Hardware"
            subtitulo="Gerenciamento da ponte de comunicação local"
        >
            <div className="space-y-6">
                {erro && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold uppercase tracking-tight flex items-center gap-3">
                        <XCircle size={18} />
                        {erro}
                    </div>
                )}

                {/* DASHBOARD EM TEMPO REAL - ESTILO PREMIUM */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <CartaoConteudo className="p-5 bg-slate-950 text-white border-none">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <ArrowUp size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entradas</p>
                                <h3 className="text-3xl font-black">{status?.stats?.entradas ?? 0}</h3>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="p-5 bg-slate-950 text-white border-none">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                                <XCircle size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Negados</p>
                                <h3 className="text-3xl font-black">{status?.stats?.negados ?? 0}</h3>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="p-5 bg-slate-950 text-white border-none">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pico</p>
                                <h3 className="text-xl font-black uppercase tracking-tight">--:--</h3>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="p-5 bg-slate-950 text-white border-none">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Último</p>
                                <h3 className="text-xl font-black uppercase tracking-tight">{status?.stats?.ultimoAcesso ?? '--:--'}</h3>
                            </div>
                        </div>
                    </CartaoConteudo>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* EQUIPAMENTOS */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Equipamentos</h4>
                        {status?.leitores ? status.leitores.map((leitor: any) => (
                            <CartaoConteudo key={leitor.id} className="p-4 bg-slate-900 border-none">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${leitor.online ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                        <div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-tight">{leitor.nome}</h4>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Hardware: {leitor.tipo}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${leitor.online ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {leitor.online ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </CartaoConteudo>
                        )) : (
                            <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <Radio className="mx-auto mb-2 text-slate-300 animate-pulse" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Procurando hardware...</p>
                            </div>
                        )}
                    </div>

                    {/* MINI FEED */}
                    <div className="space-y-4 lg:col-span-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Mini Feed</h4>
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {status?.stats?.ultimosEventos && status.stats.ultimosEventos.length > 0 ? (
                                    status.stats.ultimosEventos.map((ev: any, idx: number) => (
                                        <motion.div
                                            key={`${ev.timestamp}-${idx}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ev.tipo === 'NEGADO' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                    {ev.tipo === 'NEGADO' ? <XCircle size={14} /> : <User size={14} />}
                                                </div>
                                                <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight truncate max-w-[200px]">
                                                    {ev.nome}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 font-mono">{ev.timestamp}</span>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="p-10 text-center opacity-20">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhuma atividade recente</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* BUSCA E CADASTRO BIOMÉTRICO */}
                    <CartaoConteudo className="p-6 border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Fingerprint size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cadastro Biométrico</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vincular digital ao aluno</p>
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Busque por nome ou matrícula..."
                                value={termoBusca}
                                onChange={(e) => setTermoBusca(e.target.value)}
                                className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <AnimatePresence>
                                {alunosFiltrados.length > 0 ? (
                                    alunosFiltrados.map((aluno) => (
                                        <motion.div
                                            key={aluno.matricula}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-200 hover:shadow-media-suave transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[150px]">
                                                        {aluno.nome_completo}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        MAT: {aluno.matricula} • {aluno.turma_id || 'SEM TURMA'}
                                                    </p>
                                                </div>
                                            </div>

                                            <Botao 
                                                variante={aluno.biometria_cadastrada ? 'secundario' : 'primario'}
                                                tamanho="sm"
                                                onClick={() => iniciarCadastroBiometrico(aluno.matricula, aluno.nome_completo)}
                                                carregando={cadastrandoPara === aluno.matricula}
                                                disabled={!status?.ok}
                                            >
                                                {aluno.biometria_cadastrada ? 'Atualizar Digital' : 'Cadastrar Digital'}
                                            </Botao>
                                        </motion.div>
                                    ))
                                ) : termoBusca.length >= 2 ? (
                                    <div className="py-10 text-center opacity-40">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhum aluno encontrado</p>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center opacity-30">
                                        <Search size={32} className="mx-auto mb-3 text-slate-300" strokeWidth={1} />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Digite para pesquisar alunos</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CartaoConteudo>

                    {/* Log de Eventos Local */}
                    <CartaoConteudo className="p-0 overflow-hidden border border-slate-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Terminal size={14} className="text-slate-600" />
                                Logs do Agente (Sessão Atual)
                            </h4>
                            <Botao variante="secundario" onClick={verificarAgente} carregando={carregando} tamanho="sm">
                                <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
                            </Botao>
                        </div>
                        <div className="bg-slate-950 p-6 font-mono text-[11px] text-emerald-500/80 h-[300px] overflow-y-auto custom-scrollbar leading-relaxed">
                            <p className="text-slate-500 mb-2">[{new Date().toLocaleTimeString()}] Iniciando monitoramento da ponte...</p>
                            {status?.ok ? (
                                <>
                                    <p>[OK] Servidor de descoberta remoto respondendo em localhost:1912</p>
                                    <p>[INFO] Handshake com Agente v{status.versao} concluído com sucesso.</p>
                                    <p>[INFO] Escola autorizada: {status.escola}</p>
                                    <p>[SYNC] Sincronização de registros de acesso habilitada.</p>
                                    <p>[HW] Drivers de hardware carregados e aguardando eventos...</p>
                                    <div className="mt-4 animate-pulse text-emerald-400">_ Aguardando novas batidas de ponto...</div>
                                </>
                            ) : (
                                <p className="text-rose-400 font-bold uppercase tracking-widest mt-4">
                                    ERRO: O agente local não pôde ser localizado.
                                    Verifique se o executável do Catraki Agent está rodando neste PC.
                                </p>
                            )}
                        </div>
                    </CartaoConteudo>

                    {/* Guia Rápido */}
                    <div className="space-y-6">
                        <CartaoConteudo className="p-6 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200">
                            <h4 className="text-lg font-black uppercase tracking-tight mb-2">Ponte de Hardware</h4>
                            <p className="text-sm text-indigo-100 leading-relaxed font-bold">
                                O Agente Catraki é o responsável por falar com as catracas e leitores biométricos físicos na sua rede local.
                            </p>
                            <div className="mt-6 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-[11px] font-bold">Sempre mantenha o app do agente aberto no PC da portaria.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-[11px] font-bold">Certifique-se de que nenhum firewall está bloqueando a porta 1912.</p>
                                </div>
                            </div>
                        </CartaoConteudo>

                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={verificarAgente}
                                className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 hover:shadow-md transition-all group text-left"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 mb-3 transition-colors">
                                    <RefreshCw size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight block">Reiniciar Verificação</span>
                            </button>
                            <button 
                                onClick={() => window.open('http://127.0.0.1:1912/ping', '_blank')}
                                className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 hover:shadow-md transition-all group text-left"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 mb-3 transition-colors">
                                    <Power size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight block">Ping Manual (Porta 1912)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
