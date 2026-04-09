import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { 
    Activity, ArrowUp, XCircle, Clock, 
    CheckCircle2, Search, Fingerprint, Trash2,
    User, ArrowRightCircle, Wifi, WifiOff, RefreshCw, Power, Lock, Zap
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

export default function PaginaAgente() {
    const navegar = useNavigate();
    const escola = usarEscola();
    const slugEscola = escola.id;
    const [statusLocal, setStatusLocal] = useState<StatusAgente | null>(null);
    const [statusNuvem, setStatusNuvem] = useState<any>(null);
    const [carregando, setCarregando] = useState(true);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    // Estado para Busca de Alunos
    const [termoBusca, setTermoBusca] = useState('');
    const [cadastrandoPara, setCadastrandoPara] = useState<string | null>(null);
    const [biometriasConfirmadas, setBiometriasConfirmadas] = useState<Set<string>>(new Set());

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
            const res = await fetch('http://127.0.0.1:1912/ping', { mode: 'cors' });
            if (!res.ok) throw new Error();
            const dados = await res.json();
            
            // 🛡️ TRAVA DE SEGURANÇA: Se não tem hardware, a página permanece "oculta" redirecionando o usuário
            if (dados.ok && dados.leitoresAtivos === 0) {
                toast.error('Página indisponível: Nenhum leitor detectado.');
                navegar(`/${slugEscola}/admin/painel`);
                return;
            }

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
        if (!window.confirm('Atenção: Isso removerá TODOS os registros de acesso da nuvem. Continuar?')) return;
        try {
            await api.remover('/acesso/registros');
            try { await fetch('http://127.0.0.1:1912/reset-stats', { method: 'POST' }); } catch {}
            toast.success('Histórico removido!');
            verificarAgenteLocal();
        } catch (e) {
            toast.error('Falha ao limpar histórico.');
        }
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

    return (
        <LayoutAdministrativo titulo="Monitor do Agente" subtitulo="Status de saúde e controle de acesso remoto">
            <div className="space-y-6">
                
                {/* STATUS BAR */}
                <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${statusLocal ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Local: {statusLocal ? 'Conectado' : 'Offline'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isOnlineNuvem ? 'bg-eletrico animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Nuvem: {isOnlineNuvem ? 'Ativo' : 'Desconectado'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Botao variante="ghost" tamanho="sm" icone={RefreshCw} onClick={() => enviarComandoRemoto('FORCE_SYNC')}>Sincronizar Agora</Botao>
                        <Botao variante="ghost" tamanho="sm" icone={Power} onClick={() => { if(confirm('Reiniciar o Agente remotamente?')) enviarComandoRemoto('REBOOT_AGENT'); }}>Reiniciar Agente</Botao>
                    </div>
                </div>

                {/* MÉTRICAS (MISTO LOCAL/NUVEM) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Entradas', valor: statusLocal?.stats?.entradas || 0, cor: 'bg-emerald-500', icone: ArrowUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                            { label: 'Negados/Erros', valor: statusLocal?.stats?.negados || 0, cor: 'bg-rose-500', icone: XCircle, bg: 'bg-rose-50', text: 'text-rose-600' },
                            { label: 'Uptime', valor: statusNuvem?.uptime_seconds ? `${Math.floor(statusNuvem.uptime_seconds/3600)}h` : '--', cor: 'bg-amber-500', icone: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
                            { label: 'Último Acesso', valor: statusLocal?.stats?.ultimoAcesso || '--:--', cor: 'bg-eletrico', icone: Activity, bg: 'bg-eletrico/10', text: 'text-eletrico' }
                        ].map((item, i) => (
                            <CartaoConteudo key={i} className="relative p-5 overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.cor}`} />
                                <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.text} flex items-center justify-center`}>
                                    <item.icone size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                    <h4 className="text-2xl font-black text-slate-800 leading-none">{item.valor}</h4>
                                </div>
                            </div>
                        </CartaoConteudo>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* BUSCA E CADASTRO */}
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

                        <CartaoConteudo className="p-6">
                             <div className="flex items-center justify-between mb-6 px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo Real-Time</h4>
                                <button onClick={limparHistorico} className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1.5"><Trash2 size={12} /> Limpar Tudo</button>
                            </div>
                            <div className="space-y-2">
                                {(statusLocal?.stats?.ultimosEventos || []).map((ev, i) => (
                                    <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev.tipo === 'NEGADO' || ev.tipo === 'TURNO_ERRADO' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {ev.tipo === 'ENTRADA' ? <ArrowRightCircle size={18} /> : <XCircle size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-black text-slate-800 uppercase leading-none">{ev.nome}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{ev.tipo} • {ev.detalhe || 'OK'}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-eletrico bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                            {new Date(ev.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* OPERACIONAL (SAÚDE DOS LEITORES) */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 group flex items-center gap-2">
                                <Zap size={12} className="text-amber-500" /> Equipamentos em Radar
                            </h4>
                            <div className="space-y-3">
                                {(statusNuvem?.hardware || []).map((leitor: any) => (
                                    <CartaoConteudo key={leitor.id} className="relative p-5 overflow-hidden group hover:border-eletrico/30 transition-all">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${leitor.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${leitor.online ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {leitor.online ? <Wifi size={20} /> : <WifiOff size={20} />}
                                                </div>
                                                <div>
                                                    <h5 className="text-[12px] font-black text-slate-800 uppercase leading-none">{leitor.nome}</h5>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">{leitor.ip}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <Botao 
                                                variante="secundario" 
                                                className="w-full !py-2 !text-[10px]" 
                                                icone={Lock} 
                                                onClick={() => enviarComandoRemoto('ABRIR_CATRACA', { leitorId: leitor.id })}
                                                disabled={!leitor.online}
                                            >
                                                Abrir Catraca
                                            </Botao>
                                        </div>
                                    </CartaoConteudo>
                                ))}

                                {(!statusNuvem?.hardware || statusNuvem.hardware.length === 0) && (
                                    <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                                        <Search size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Nenhum hardware detectado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
