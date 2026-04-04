import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { 
    Users, Activity, Signal, AlertTriangle, 
    ArrowUp, XCircle, Clock, RefreshCw,
    Shield, CheckCircle2, Search, Fingerprint, Trash2,
    Settings, Save, X, User, ShieldCheck, Plus, SearchCheck
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
        ip?: string;
        porta?: string;
    }>;
}

export default function PaginaAgente() {
    const { id: slugEscola } = usarEscola();
    const [status, setStatus] = useState<StatusAgente | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    // Estado para Busca de Alunos
    const [termoBusca, setTermoBusca] = useState('');
    const [editandoLeitor, setEditandoLeitor] = useState<any>(null);
    const [formLeitor, setFormLeitor] = useState({ ip: '', porta: '' });
    const [showAddHardware, setShowAddHardware] = useState(false);
    const [formNovo, setFormNovo] = useState({ id: '', ip: '', porta: '14' });
    const [cadastrandoPara, setCadastrandoPara] = useState<string | null>(null);

    const { dados: dataAlunos, recarregar: atualizarAlunos } = usarConsulta(
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

    const verificarAgente = async () => {
        try {
            const res = await fetch('http://127.0.0.1:1912/ping');
            if (!res.ok) throw new Error();
            const dados = await res.json();
            setStatus(dados);
            setErro(null);
        } catch (e) {
            setStatus(null);
            setErro('AGENTE LOCAL DESCONECTADO');
        } finally {
            setCarregando(false);
        }
    };

    /**
     * Salva as configurações de IP/Porta no Agente Local
     */
    const salvarConfigLeitor = async (id: string) => {
        try {
            const res = await fetch('http://localhost:1912/config/leitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...formLeitor })
            });
            const data = await res.json();
            if (data.ok) {
                toast.success('Configuração salva! Reinicie o Agente.');
                setEditandoLeitor(null);
            } else throw new Error(data.mensagem);
        } catch (e: any) {
            toast.error('Erro ao configurar Agente: ' + e.message);
        }
    };

    /**
     * Adiciona um novo leitor à config do Agente
     */
    const adicionarHardware = async () => {
        if (!formNovo.id || !formNovo.ip) return toast.error('Preencha o ID e o IP');
        try {
            const res = await fetch('http://localhost:1912/config/adicionar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formNovo)
            });
            const data = await res.json();
            if (data.ok) {
                toast.success('Equipamento adicionado!');
                setShowAddHardware(false);
                setFormNovo({ id: '', ip: '', porta: '14' });
            } else throw new Error(data.mensagem);
        } catch (e: any) {
            toast.error('Erro: ' + e.message);
        }
    };

    /**
     * Solicita ao agente local que inicie a captura biométrica
     */
    const iniciarCadastroBiometrico = async (matricula: string, nome: string) => {
        if (!status?.ok) {
            toast.error('Agente offline. Certifique-se que o app Catraki está aberto.');
            return;
        }

        setCadastrandoPara(matricula);
        const toastId = toast.loading(`Aguardando digital de ${nome.split(' ')[0]} no leitor...`, { 
            style: { border: '2px solid #6366f1', fontWeight: 'bold' }
        });

        try {
            const res = await fetch('http://127.0.0.1:1912/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id: matricula })
            });

            const data = await res.json();
            if (data.ok) {
                toast.success('Digital vinculada com sucesso!', { id: toastId });
                atualizarAlunos(); // Atualiza a lista para mostrar o novo status
            } else {
                toast.error(data.mensagem || 'Falha na captura.', { id: toastId });
            }
        } catch (e) {
            toast.error('Erro de conexão local.', { id: toastId });
        } finally {
            setCadastrandoPara(null);
        }
    };

    useEffect(() => {
        verificarAgente();
        const interval = setInterval(verificarAgente, 5000); // Polling rápido para dashboard
        return () => clearInterval(interval);
    }, []);

    return (
        <LayoutAdministrativo
            titulo="Gestão de Biometria"
            subtitulo="Controle de acesso e cadastro de digitais em tempo real"
        >
            <div className="space-y-6">
                {/* 1. MÉTRICAS DE FLUXO (CABEÇALHO) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <ArrowUp size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{status?.stats?.entradas || 0}</h4>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <XCircle size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negados</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{status?.stats?.negados || 0}</h4>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pico</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">--:--</h4>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{status?.stats?.ultimoAcesso || '--:--'}</h4>
                            </div>
                        </div>
                    </CartaoConteudo>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. ÁREA DE CADASTRO (PRINCIPAL) */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 text-center md:text-left">Pesquisar Aluno para Cadastro</h4>
                        <CartaoConteudo className="p-6 border-slate-200">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="text"
                                    placeholder="Pesquise o Aluno pelo nome ou matrícula..."
                                    value={termoBusca}
                                    onChange={(e) => setTermoBusca(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all outline-none placeholder:text-slate-300"
                                />
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence mode="wait">
                                    {alunosFiltrados.length > 0 ? (
                                        alunosFiltrados.map((aluno) => (
                                            <motion.div
                                                key={aluno.matricula}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-200 hover:shadow-media-suave transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${aluno.biometria_cadastrada ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                                        {aluno.biometria_cadastrada ? <CheckCircle2 size={24} /> : <User size={24} />}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
                                                            {aluno.nome_completo}
                                                        </h5>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aluno.matricula}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{aluno.turma_id || 'SEM TURMA'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Botao 
                                                    variante={aluno.biometria_cadastrada ? 'secundario' : 'primario'}
                                                    tamanho="md"
                                                    onClick={() => iniciarCadastroBiometrico(aluno.matricula, aluno.nome_completo)}
                                                    carregando={cadastrandoPara === aluno.matricula}
                                                    disabled={!status?.ok}
                                                    icone={Fingerprint}
                                                >
                                                    {aluno.biometria_cadastrada ? 'Recadastrar' : 'Cadastrar Digital'}
                                                </Botao>
                                            </motion.div>
                                        ))
                                    ) : termoBusca.length >= 2 ? (
                                        <div className="py-12 text-center">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum aluno encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                            <Fingerprint size={48} className="mx-auto mb-4 text-slate-200" strokeWidth={1} />
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Processo de Cadastro</h5>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Passe o mouse ou toque para selecionar um aluno</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* 3. COLUNA DIREITA (OPERACIONAL) */}
                    <div className="space-y-6">
                        {/* EQUIPAMENTOS */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Hardware Conectado</h4>
                            <div className="grid gap-3">
                                {status?.leitores && status.leitores.length > 0 ? status.leitores.map((leitor: any) => (
                                    <CartaoConteudo key={leitor.id} className="relative p-4 overflow-hidden border-slate-100 shadow-sm">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${leitor.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${leitor.online ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
                                                <div>
                                                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{leitor.nome}</h5>
                                                    
                                                    {editandoLeitor === leitor.id ? (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <input 
                                                                value={formLeitor.ip}
                                                                onChange={e => setFormLeitor({...formLeitor, ip: e.target.value})}
                                                                className="text-[8px] bg-slate-50 border border-slate-200 rounded px-1 w-24 h-5 font-mono"
                                                                placeholder="IP"
                                                            />
                                                            <input 
                                                                value={formLeitor.porta}
                                                                onChange={e => setFormLeitor({...formLeitor, porta: e.target.value})}
                                                                className="text-[8px] bg-slate-50 border border-slate-200 rounded px-1 w-10 h-5 font-mono"
                                                                placeholder="14"
                                                            />
                                                            <button 
                                                                onClick={() => salvarConfigLeitor(leitor.id)}
                                                                className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                                            >
                                                                <Save size={8} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditandoLeitor(null)}
                                                                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                                            >
                                                                <X size={8} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                            <span>{leitor.tipo}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                            <span className="font-mono">
                                                                {leitor.ip}{leitor.ip?.includes(':') ? '' : `:${leitor.porta}`}
                                                            </span>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditandoLeitor(leitor.id);
                                                                    setFormLeitor({ ip: leitor.ip, porta: String(leitor.porta) });
                                                                }}
                                                                className="p-1 hover:text-indigo-600 transition-colors"
                                                                title="Configurar Rede"
                                                            >
                                                                <Settings size={10} />
                                                            </button>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${leitor.online ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {leitor.online ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    </CartaoConteudo>
                                )) : (
                                    <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nenhum equipamento detectado</p>
                                    </div>
                                )}
                            </div>

                            {/* Botão de Adicionar ou Formulário de Adição */}
                            {!showAddHardware ? (
                                <button 
                                    onClick={() => setShowAddHardware(true)}
                                    className="w-full h-11 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all mt-4"
                                >
                                    <Plus size={16} /> Adicionar Equipamento
                                </button>
                            ) : (
                                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl mt-4 space-y-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Novo Hardware</h5>
                                        <button onClick={() => setShowAddHardware(false)} className="text-slate-400 hover:text-rose-500"><X size={14} /></button>
                                    </div>
                                    <input 
                                        placeholder="ID do Hardware (ex: iDFlex Entrada)" 
                                        value={formNovo.id}
                                        onChange={e => setFormNovo({...formNovo, id: e.target.value})}
                                        className="w-full px-3 h-9 bg-white border border-indigo-100 rounded-lg text-[11px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all uppercase"
                                    />
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="Endereço IP (ex: 192.168.1.34)" 
                                            value={formNovo.ip}
                                            onChange={e => setFormNovo({...formNovo, ip: e.target.value})}
                                            className="flex-1 px-3 h-9 bg-white border border-indigo-100 rounded-lg text-[11px] font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all"
                                        />
                                        <input 
                                            placeholder="Porta" 
                                            value={formNovo.porta}
                                            onChange={e => setFormNovo({...formNovo, porta: e.target.value})}
                                            className="w-16 px-3 h-9 bg-white border border-indigo-100 rounded-lg text-[11px] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all"
                                        />
                                    </div>
                                    <button 
                                        onClick={adicionarHardware}
                                        className="w-full h-9 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all"
                                    >
                                        <SearchCheck size={14} /> Registrar Dispositivo
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* MINI FEED DE ACESSOS */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 flex items-center justify-between">
                                Fluxo Recente
                                <Activity size={12} className="text-indigo-400 animate-pulse" />
                            </h4>
                            <div className="space-y-2">
                                <AnimatePresence mode="popLayout">
                                    {(status?.stats?.ultimosEventos || []).map((ev: any, idx: number) => (
                                        <motion.div
                                            key={`${ev.timestamp}-${idx}`}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ev.tipo === 'NEGADO' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                    {ev.tipo === 'NEGADO' ? <XCircle size={14} /> : <User size={14} />}
                                                </div>
                                                <div className="max-w-[120px]">
                                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">
                                                        {ev.nome}
                                                    </p>
                                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${ev.tipo === 'NEGADO' ? 'text-rose-400' : 'text-slate-400'}`}>
                                                        {ev.tipo}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 font-mono">{ev.timestamp}</span>
                                        </motion.div>
                                    ))}
                                    {(!status?.stats?.ultimosEventos || status.stats.ultimosEventos.length === 0) && (
                                        <div className="py-8 text-center opacity-30">
                                            <Clock size={24} className="mx-auto mb-2" />
                                            <p className="text-[9px] font-bold uppercase tracking-widest">Aguardando acessos...</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* AJUDA RAPIDA */}
                        <CartaoConteudo className="p-4 bg-indigo-50 text-indigo-700 border-indigo-100">
                            <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ShieldCheck size={14} />
                                Ajuda Técnica
                            </h5>
                            <p className="text-[10px] font-bold leading-relaxed opacity-80">
                                1. Abra o app Catraki no PC;<br/>
                                2. Busque o aluno por nome;<br/>
                                3. Clique em "Cadastrar Digital";<br/>
                                4. Peça para o aluno colocar o dedo no leitor duas vezes.
                            </p>
                        </CartaoConteudo>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
