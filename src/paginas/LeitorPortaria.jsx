import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../contexts/ContextoAutenticacao';
import { bancoLocal } from '../servicos/bancoLocal';
import { api } from '../servicos/api';
import {
    Maximize2,
    ArrowLeft,
    Zap,
    ShieldCheck,
    UserX,
    Clock,
    Wifi,
    WifiOff
} from 'lucide-react';

import { format } from 'date-fns';

export default function LeitorPortaria() {
    const navigate = useNavigate();
    const { usuarioAtual } = useAutenticacao();
    const scannerRef = useRef(null);

    // Estados de UI
    const [ultimoAcesso, definirUltimoAcesso] = useState(null);
    const [statusLeitura, definirStatusLeitura] = useState('AGUARDANDO'); // AGUARDANDO, SUCESSO, ERRO, ALERTA
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

    const processarCodigo = useCallback(async (codigo) => {
        if (pausado) return;
        definirPausado(true);

        try {
            const banco = await bancoLocal.iniciarBanco();
            const aluno = await banco.get('alunos', codigo);

            if (aluno) {
                // Registrar Acesso
                const novoRegistro = {
                    aluno_matricula: aluno.matricula,
                    aluno_nome: aluno.nome_completo,
                    aluno_turma: aluno.turma_id,
                    timestamp: new Date().toISOString(),
                    tipo_movimentacao: 'ENTRADA', // Lógica de entrada/saída pode ser melhorada
                    sincronizado: false
                };

                await banco.add('registros_acesso', novoRegistro);

                // Tenta sync imediato se online
                if (navigator.onLine) {
                    api.enviar('/registros-acesso', novoRegistro).catch(console.warn);
                }

                definirUltimoAcesso({
                    tipo: 'SUCESSO',
                    aluno: aluno,
                    mensagem: 'Acesso Liberado',
                    hora: format(new Date(), 'HH:mm:ss')
                });
                definirStatusLeitura('SUCESSO');
                audioSucesso.current.play().catch(() => { });

            } else {
                definirUltimoAcesso({
                    tipo: 'ERRO',
                    mensagem: 'Aluno não encontrado',
                    matricula: codigo,
                    hora: format(new Date(), 'HH:mm:ss')
                });
                definirStatusLeitura('ERRO');
                audioErro.current.play().catch(() => { });
            }

        } catch (erro) {
            console.error('Erro no processamento:', erro);
            definirStatusLeitura('ERRO');
        } finally {
            // Reset após delay
            setTimeout(() => {
                definirStatusLeitura('AGUARDANDO');
                definirPausado(false);
            }, 3000);
        }
    }, [pausado]);

    useEffect(() => {
        // Inicializar Scanner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };
        const scanner = new Html5QrcodeScanner("reader", config, false);

        scanner.render(processarCodigo, () => {
            // Ignorar erros de scan contínuo
        });

        scannerRef.current = scanner;

        return () => {
            scanner.clear().catch(console.error);
        };
    }, [processarCodigo]);

    const fechar = () => navigate('/painel');

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden text-white font-sans selection:bg-indigo-500/30">
            {/* Header / Top Bar */}
            <div className="h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={fechar}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                            PORTARIA INTELIGENTE
                        </h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Monitoramento Ativo</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span className="text-xs font-bold">{online ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white leading-tight">{usuarioAtual?.email}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Operador</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row relative">

                {/* Scanner Section (Left/Top) */}
                <div className="flex-1 bg-black relative flex items-center justify-center p-4">
                    {/* Scanner Container with Futuristic Border */}
                    <div className="relative w-full max-w-md aspect-square bg-slate-900 rounded-3xl border-2 border-slate-700 overflow-hidden shadow-2xl ring-1 ring-white/5">
                        {/* Scanner Lib Div */}
                        <div id="reader" className="w-full h-full bg-black"></div>

                        {/* Overlay Graphics */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Scanning Animation */}
                            {!pausado && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-[varredura_2s_infinite]"></div>}

                            {/* Corners */}
                            <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                            <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>

                            {/* Status Overlay (Success/Error) */}
                            {statusLeitura !== 'AGUARDANDO' && (
                                <div className={`absolute inset-0 backdrop-blur-sm bg-opacity-90 flex flex-col items-center justify-center transition-all duration-300 z-10 ${statusLeitura === 'SUCESSO' ? 'bg-emerald-900/80' : 'bg-rose-900/80'
                                    }`}>
                                    <div className={`p-6 rounded-full bg-white mb-4 animate-[scale-in_0.3s_ease-out]`}>
                                        {statusLeitura === 'SUCESSO' ?
                                            <ShieldCheck size={48} className="text-emerald-600" /> :
                                            <UserX size={48} className="text-rose-600" />
                                        }
                                    </div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
                                        {statusLeitura === 'SUCESSO' ? 'ACESSO PERMITIDO' : 'ACESSO NEGADO'}
                                    </h2>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Panel (Right/Bottom) */}
                <div className="w-full md:w-96 bg-slate-800 border-l border-white/5 p-6 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" />
                        Último Registro
                    </h3>

                    {ultimoAcesso ? (
                        <div className="flex-1 flex flex-col animate-[fade-in_0.5s_ease-out]">
                            {/* Student Card */}
                            <div className="bg-slate-700/50 rounded-2xl p-6 border border-white/5 mb-6 text-center shadow-lg relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-slate-800 shadow-xl">
                                    <span className="text-3xl font-bold text-white">
                                        {ultimoAcesso.aluno?.nome_completo?.[0] || '?'}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold text-white mb-1 leading-tight">
                                    {ultimoAcesso.aluno?.nome_completo || 'Desconhecido'}
                                </h2>
                                <p className="text-slate-400 font-mono text-sm mb-4">
                                    {ultimoAcesso.aluno?.matricula || ultimoAcesso.matricula}
                                </p>

                                {ultimoAcesso.aluno && (
                                    <div className="inline-block bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/30">
                                        Turma {ultimoAcesso.aluno.turma_id}
                                    </div>
                                )}
                            </div>

                            {/* Details List */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                    <span className="text-sm text-slate-400">Horário</span>
                                    <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-400" />
                                        {ultimoAcesso.hora}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                    <span className="text-sm text-slate-400">Status</span>
                                    <span className={`text-sm font-bold ${ultimoAcesso.tipo === 'SUCESSO' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {ultimoAcesso.tipo === 'SUCESSO' ? 'Liberado' : 'Bloqueado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                            <Maximize2 size={48} strokeWidth={1} />
                            <p className="text-sm font-medium text-center">
                                Aproxime o QR Code da câmera<br />para realizar a leitura.
                            </p>
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="mt-auto pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            SCAE. &copy; 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
