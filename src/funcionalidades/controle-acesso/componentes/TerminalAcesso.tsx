import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { Botao, CartaoConteudo } from '@compartilhado/componentes/UI';
import {
    Maximize2,
    ArrowLeft,
    Zap,
    ShieldCheck,
    Clock,
    Wifi,
    WifiOff,
    Radar,
    Terminal,
    Fingerprint
} from 'lucide-react';

import { format } from 'date-fns';
import { usarEscola } from '@escola/ProvedorEscola';
import { usarTipoAcesso } from '../hooks/usarTipoAcesso';
import { usarControleAcessoWorker } from '../hooks/usarControleAcessoWorker';
import { TIPO_ACESSO } from '../types/controleAcesso.tipos';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { FeedbackLeitura, RegistroLeitura } from './FeedbackLeitura';

const log = criarRegistrador('ControleAcesso');

export default function TerminalAcesso() {
    const navigate = useNavigate();
    const escola = usarEscola();
    const { usuarioAtual } = usarAutenticacao();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const tipoAcessoAtual = usarTipoAcesso();
    const { acionarWorker, statusWorker } = usarControleAcessoWorker();

    // Estados de UI
    const [ultimoAcesso, definirUltimoAcesso] = useState<RegistroLeitura | null>(null);
    const [online, definirOnline] = useState(navigator.onLine);
    const [pausado, definirPausado] = useState(false);

    // Audio Refs
    const audioSucesso = useRef(new Audio('/sons/sucesso.mp3'));
    const audioErro = useRef(new Audio('/sons/erro.mp3'));

    useEffect(() => {
        const handleStatusChange = () => definirOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    const processarCodigo = useCallback(async (codigo: string) => {
        if (pausado) return;
        definirPausado(true);

        try {
            const banco = await bancoLocal.iniciarBanco();
            const aluno = await banco.get('alunos', codigo);

            if (aluno) {
                if (aluno.ativo === false) {
                    definirUltimoAcesso({
                        tipo: 'ERRO',
                        mensagem: 'Acesso Negado: Discente Inativo',
                        hora: format(new Date(), 'HH:mm:ss'),
                        aluno: aluno
                    });
                    audioErro.current.play().catch(() => { });
                } else {
                    const novoRegistro = {
                        id: crypto.randomUUID(),
                        escola_id: escola.id,
                        aluno_matricula: aluno.matricula,
                        aluno_nome: aluno.nome_completo,
                        aluno_turma: aluno.turma_id,
                        timestamp_acesso: new Date().toISOString(),
                        tipo_movimentacao: tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO ? 'ENTRADA' : tipoAcessoAtual,
                        sincronizado: 0
                    };

                    await banco.add('registros_acesso', novoRegistro);
                    acionarWorker();

                    definirUltimoAcesso({
                        tipo: 'SUCESSO',
                        aluno: aluno,
                        mensagem: 'Acesso Liberado',
                        hora: format(new Date(), 'HH:mm:ss')
                    });
                    audioSucesso.current.play().catch(() => { });
                }
            } else {
                definirUltimoAcesso({
                    tipo: 'ERRO',
                    mensagem: 'Credencial não localizada',
                    hora: format(new Date(), 'HH:mm:ss')
                });
                audioErro.current.play().catch(() => { });
            }

        } catch (erro) {
            log.error('Erro no processamento QR', erro);
        } finally {
            // Reset após delay (3.5s para dar tempo de ver o feedback premium)
            setTimeout(() => {
                definirUltimoAcesso(null);
                definirPausado(false);
            }, 3500);
        }
    }, [pausado, escola.id, tipoAcessoAtual, acionarWorker]);

    useEffect(() => {
        const config = {
            fps: 15, // Aumentado para scan mais fluido
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };
        const scanner = new Html5QrcodeScanner("reader", config, false);
        scanner.render(processarCodigo, () => { });
        scannerRef.current = scanner;

        return () => {
            scanner.clear().catch((e) => log.warn('Erro scanner clear', e));
        };
    }, [processarCodigo]);

    const fechar = () => navigate(`/${escola.id}/admin/painel`);

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden text-slate-100 font-sans selection:bg-indigo-500">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

            {/* Header High-Tech */}
            <header className="h-[80px] border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 z-20 shadow-2xl shrink-0">
                <div className="flex items-center gap-6">
                    <Botao
                        variante="ghost"
                        icone={ArrowLeft}
                        onClick={fechar}
                        className="bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border-white/10"
                    />
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-black text-white uppercase tracking-tighter">
                                Terminal de Acesso
                            </h1>
                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded uppercase tracking-widest shadow-lg shadow-indigo-900/20">V2.4 CORE</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">Monitoramento de Fluxo Estratégico</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : tipoAcessoAtual === TIPO_ACESSO.SAIDA
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                        {tipoAcessoAtual === TIPO_ACESSO.ENTRADA && 'MODO: ENTRADA'}
                        {tipoAcessoAtual === TIPO_ACESSO.SAIDA && 'MODO: SAÍDA'}
                        {tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO && 'INDEFINIDO'}
                    </div>

                    <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-xl ${online ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        {online ? <Wifi size={14} strokeWidth={2.5} /> : <WifiOff size={14} strokeWidth={2.5} />}
                        {online ? 'Sincronizado' : 'Offline'}
                    </div>

                    <div className="text-right hidden sm:block border-l border-white/10 pl-6">
                        <p className="text-xs font-black text-white leading-tight uppercase tracking-tight">{usuarioAtual?.email?.split('@')[0]}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            {statusWorker.pendentes > 0
                                ? <span className="text-amber-500 animate-pulse">Lote Pendente: {statusWorker.pendentes}</span>
                                : 'Kernel Autorizado'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Content Area UI SaaS Grid */}
            <main className="flex-1 flex flex-col lg:flex-row p-8 gap-8 max-w-[1600px] mx-auto w-full overflow-hidden relative z-10">

                {/* Main Scanning Reactor */}
                <CartaoConteudo className="flex-[5] flex flex-col items-center justify-center p-12 relative bg-slate-900/40 border-white/5 shadow-2xl overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>

                    <div className="text-center space-y-2 mb-12">
                        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                            <Radar size={16} className="animate-spin-slow" /> Sensores Ativos
                        </h2>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Câmera de Varredura</h3>
                    </div>

                    {/* Industrial Scanner Frame */}
                    <div className="relative w-full max-w-lg aspect-square bg-black rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 group-hover:ring-indigo-500/30 transition-all duration-700">
                        {/* Scanner Component */}
                        <div id="reader" className="w-full h-full bg-black scale-[1.05] grayscale contrast-125 opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700"></div>

                        {/* Scanner HUD Elements */}
                        <div className="absolute inset-8 border border-white/10 rounded-2xl pointer-events-none z-10 flex flex-col justify-between p-4">
                            <div className="flex justify-between items-start">
                                <div className="w-6 h-6 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-lg"></div>
                                <div className="w-6 h-6 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-lg"></div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="w-6 h-6 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-lg"></div>
                                <div className="w-6 h-6 border-b-2 border-r-2 border-indigo-500/50 rounded-br-lg"></div>
                            </div>
                        </div>

                        {/* Scanning Laser Animation */}
                        {!pausado && (
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_20px_#6366f1] animate-[scan_3s_infinite] z-10"></div>
                        )}
                    </div>

                    <div className="mt-12 flex items-center gap-6 px-8 py-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                        <Maximize2 size={24} className="text-slate-500 animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-[240px] leading-relaxed">
                            Aproxime a credencial QR à zona de varredura para validação instantânea.
                        </p>
                    </div>
                </CartaoConteudo>

                {/* Operational Sidebar Dashboard */}
                <CartaoConteudo className="flex-[3] lg:max-w-md w-full p-8 flex flex-col bg-slate-900 border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-10 z-10 relative">
                        <h3 className="text-xs font-black text-slate-300 flex items-center gap-3 uppercase tracking-widest">
                            <Terminal size={18} className="text-indigo-500" /> Kernel Dashboard
                        </h3>
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                            <Zap size={14} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar z-10 relative">
                        {ultimoAcesso ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                {/* Telemetry Card */}
                                <div className="bg-slate-800/50 rounded-[2.5rem] p-10 border border-white/5 text-center relative overflow-hidden shadow-2xl backdrop-blur-3xl group-hover:border-indigo-500/20 transition-all">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter leading-none">
                                        {ultimoAcesso.aluno?.nome_completo || 'Unknown'}
                                    </h2>
                                    <p className="text-[9px] font-mono font-black text-indigo-400/60 mb-8 uppercase tracking-[0.3em]">
                                        PID: {ultimoAcesso.aluno?.matricula || 'NULL_PTR'}
                                    </p>

                                    {ultimoAcesso.aluno && (
                                        <div className="inline-flex items-center gap-3 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black border border-white/10 shadow-2xl uppercase tracking-widest transform transition-transform group-hover:scale-110">
                                            <ShieldCheck size={14} strokeWidth={2.5} /> {ultimoAcesso.aluno.turma_id}
                                        </div>
                                    )}
                                </div>

                                {/* Status Details Cluster */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-colors">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Timestamp</span>
                                            <span className="text-xs font-mono font-black text-slate-300 uppercase">{ultimoAcesso.hora}</span>
                                        </div>
                                        <Clock size={20} className="text-slate-600" strokeWidth={2} />
                                    </div>

                                    <div className={`flex items-center justify-between p-6 rounded-[2rem] border-2 shadow-2xl transition-all ${ultimoAcesso.tipo === 'SUCESSO'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                        }`}>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Status Autenticação</span>
                                            <span className="text-sm font-black uppercase tracking-tighter leading-none">{ultimoAcesso.mensagem}</span>
                                        </div>
                                        <Fingerprint size={28} strokeWidth={2.5} className="opacity-50" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-8 opacity-40 group-hover:opacity-60 transition-opacity">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse"></div>
                                    <div className="relative w-24 h-24 rounded-[2rem] border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/50">
                                        <Radar size={40} className="animate-spin-slow" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Aguardando Pulso</p>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest max-w-[180px] leading-relaxed mx-auto">
                                        Sensor de Proximidade Ativado. Conecte credencial...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Operational Guardrails */}
                    <div className="pt-8 border-t border-white/5 flex items-center justify-between z-10 relative">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo Estável</span>
                        </div>
                        <p className="text-[10px] font-mono font-black text-indigo-400/40 uppercase tracking-widest">
                            SCAE OS v2.0
                        </p>
                    </div>
                </CartaoConteudo>
            </main>

            {/* Overlay de Feedback Fullscreen Premium */}
            {ultimoAcesso && (
                <FeedbackLeitura registro={ultimoAcesso} />
            )}

            {/* Global HUD Animation Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan {
                    0% { top: 0% }
                    50% { top: 100% }
                    100% { top: 0% }
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg) }
                    to { transform: rotate(360deg) }
                }
            ` }} />
        </div>
    );
}
