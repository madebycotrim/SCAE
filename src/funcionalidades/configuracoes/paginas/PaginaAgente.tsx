import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { 
    Activity, ArrowUp, XCircle, Clock, 
    Shield, CheckCircle2, Search, Fingerprint, Trash2,
    User, ShieldCheck, ArrowRightCircle
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
            matricula?: string;
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
    const escola = usarEscola();
    const slugEscola = escola.id;
    const [status, setStatus] = useState<StatusAgente | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

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

    const verificarAgente = async () => {
        try {
            const res = await fetch('http://127.0.0.1:1912/ping', { mode: 'cors' });
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

    const iniciarCadastroBiometrico = async (matricula: string, nome: string) => {
        if (!status?.ok) {
            toast.error('Agente offline. Certifique-se que o app Catraki está aberto.');
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
                toast.success('Digital vinculada com sucesso!', { id: toastId });
                setBiometriasConfirmadas(prev => new Set(prev).add(matricula));
                setTimeout(atualizarAlunos, 2000);
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
        const interval = setInterval(verificarAgente, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <LayoutAdministrativo titulo="Gestão de Biometria" subtitulo="Controle de acesso e cadastro em tempo real">
            <div className="space-y-6">
                {/* MÉTRICAS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Entradas', valor: status?.stats?.entradas || 0, cor: 'bg-emerald-500', icone: ArrowUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                        { label: 'Negados', valor: status?.stats?.negados || 0, cor: 'bg-rose-500', icone: XCircle, bg: 'bg-rose-50', text: 'text-rose-600' },
                        { label: 'Pico', valor: '--:--', cor: 'bg-amber-500', icone: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
                        { label: 'Último', valor: status?.stats?.ultimoAcesso || '--:--', cor: 'bg-indigo-500', icone: Activity, bg: 'bg-indigo-50', text: 'text-indigo-600' }
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
                                    placeholder="Nome ou matrícula..."
                                    value={termoBusca}
                                    onChange={(e) => setTermoBusca(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div className="space-y-3">
                                {alunosFiltrados.map((aluno) => (
                                    <div key={aluno.matricula} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all">
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
                                            disabled={!status?.ok}
                                            icone={Fingerprint}
                                        >
                                            {aluno.biometria_cadastrada ? 'Recadastrar' : 'Cadastrar'}
                                        </Botao>
                                    </div>
                                ))}
                                {termoBusca.length >= 2 && alunosFiltrados.length === 0 && (
                                    <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase">Nenhum aluno encontrado</div>
                                )}
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* OPERACIONAL */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Agente Catraki Local</h4>
                            <div className="space-y-3">
                                {status?.leitores?.map(leitor => (
                                    <CartaoConteudo key={leitor.id} className="relative p-4 overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${leitor.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h5 className="text-[11px] font-black text-slate-800 uppercase">{leitor.nome}</h5>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{leitor.tipo} • {leitor.online ? 'Online' : 'Offline'}</p>
                                            </div>
                                            <div className={`w-2.5 h-2.5 rounded-full ${leitor.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                        </div>
                                    </CartaoConteudo>
                                ))}
                                
                                <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-4">
                                    {!status && erro && (
                                        <div className="flex items-center gap-2 text-rose-500 text-[9px] font-black uppercase animate-bounce">
                                            <AlertTriangle size={14} /> {erro}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-slate-300 text-[9px] font-black uppercase">
                                        GERENCIADO FISICAMENTE
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FLUXO */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fluxo Real-Time</h4>
                            <div className="space-y-2">
                                {(status?.stats?.ultimosEventos || []).map((ev, i) => (
                                    <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ev.tipo === 'NEGADO' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                {ev.tipo === 'NEGADO' ? <XCircle size={14} /> : <ArrowRightCircle size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{ev.nome}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{ev.matricula || '---'}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                            {ev.timestamp.includes('T') ? new Date(ev.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ev.timestamp}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}

// Para manter ícones do Lucide
const AlertTriangle = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
