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
    XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StatusAgente {
    ok: boolean;
    agente: string;
    versao: string;
    escola: string;
    status: string;
}

export default function PaginaAgente() {
    const [status, setStatus] = useState<StatusAgente | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status de Conexão */}
                    <CartaoConteudo className="p-6 border-l-4 border-l-emerald-500">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status de Conexão</p>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    {status?.ok ? '100% Conectado' : 'Desconectado'}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`w-2 h-2 rounded-full ${status?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                        {status?.ok ? 'Ponte de hardware ativa' : 'Aguardando agente local...'}
                                    </span>
                                </div>
                            </div>
                            <div className={`p-3 rounded-2xl ${status?.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Activity size={24} />
                            </div>
                        </div>
                    </CartaoConteudo>

                    {/* Versão e Escola */}
                    <CartaoConteudo className="p-6 border-l-4 border-l-indigo-500">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Versão do Engine</p>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    v{status?.versao || '---'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-2">
                                    {status?.agente || 'Catraki Edge Control'}
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Cpu size={24} />
                            </div>
                        </div>
                    </CartaoConteudo>

                    {/* Escola Vinculada */}
                    <CartaoConteudo className="p-6 border-l-4 border-l-amber-500">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidade Vinculada</p>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight truncate max-w-[180px]">
                                    {status?.escola || '---'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-2">
                                    Sincronização em nuvem ativa
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                <Globe size={24} />
                            </div>
                        </div>
                    </CartaoConteudo>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
