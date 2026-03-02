import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
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
import { usarTipoAcesso } from '../hooks/usarTipoAcesso';
import { usarPortariaWorker } from '../hooks/usarPortariaWorker';
import { TIPO_ACESSO } from '../types/portaria.tipos';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Portaria');

export default function LeitorPortaria() {
    const navigate = useNavigate();
    const { usuarioAtual } = usarAutenticacao();
    const scannerRef = useRef(null);
    const tipoAcessoAtual = usarTipoAcesso();
    const { acionarWorker, statusWorker } = usarPortariaWorker();

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

    const processarCodigo = useCallback(async (codigo: string) => {
        if (pausado) return;
        definirPausado(true);

        try {
            const banco = await bancoLocal.iniciarBanco();
            const aluno = await banco.get('alunos', codigo);

            if (aluno) {
                // Verificar se o aluno está ativo
                if (aluno.ativo === false) {
                    definirUltimoAcesso({
                        tipo: 'ERRO',
                        mensagem: 'Acesso Negado: Aluno Inativo',
                        matricula: codigo,
                        hora: format(new Date(), 'HH:mm:ss'),
                        aluno: aluno
                    });
                    definirStatusLeitura('ERRO');
                    audioErro.current.play().catch(() => { });
                    return;
                }

                // Registrar Acesso
                const novoRegistro = {
                    aluno_matricula: aluno.matricula,
                    aluno_nome: aluno.nome_completo,
                    aluno_turma: aluno.turma_id,
                    timestamp: new Date().toISOString(),
                    tipo_movimentacao: tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO ? 'ENTRADA' : tipoAcessoAtual,
                    sincronizado: false
                };

                await banco.add('registros_acesso', novoRegistro);

                // Tenta sync imediato com worker em thread separada
                acionarWorker();

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
            log.error('Erro no processamento QR', erro);
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
            scanner.clear().catch((e) => log.warn('Erro ao limpar scanner', e));
        };
    }, [processarCodigo]);

    const fechar = () => navigate('/painel');

    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden text-slate-900 font-sans">
            {/* Header / Top Bar */}
            <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={fechar}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 text-slate-500 hover:text-slate-800"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <ShieldCheck className="text-indigo-600" size={18} />
                            Portaria SCAE
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Leitura de Acesso</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold uppercase ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : tipoAcessoAtual === TIPO_ACESSO.SAIDA
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        {tipoAcessoAtual === TIPO_ACESSO.ENTRADA && 'Entrada'}
                        {tipoAcessoAtual === TIPO_ACESSO.SAIDA && 'Saída'}
                        {tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO && 'Indefinido'}
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold ${online ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {online ? 'Online' : 'Offline'}
                    </div>

                    <div className="text-right hidden sm:block border-l border-slate-200 pl-4">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{usuarioAtual?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {statusWorker.pendentes > 0
                                ? <span className="text-amber-600">Sincronizando: {statusWorker.pendentes}</span>
                                : 'Operador Local'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-7xl mx-auto w-full">

                {/* Scanner Section */}
                <div className="flex-[2] bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-6 shadow-sm relative overflow-hidden">

                    <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <Maximize2 size={20} className="text-indigo-600" /> Câmera de Leitura
                    </h2>

                    {/* Scanner Container */}
                    <div className="relative w-full max-w-md aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-inner ring-1 ring-slate-900/10">
                        {/* Scanner Lib Div */}
                        <div id="reader" className="w-full h-full bg-black scale-[1.02]"></div>

                        {/* Overlay Clean */}
                        <div className="absolute inset-0 pointer-events-none z-10">
                            {/* Scanning Indicator (Subtle line) */}
                            {!pausado && (
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[varredura_2.5s_infinite]"></div>
                            )}

                            {/* Status Overlay Clean */}
                            {statusLeitura !== 'AGUARDANDO' && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300 z-20">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-bounce ${statusLeitura === 'SUCESSO' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {statusLeitura === 'SUCESSO' ? <ShieldCheck size={48} /> : <UserX size={48} />}
                                    </div>
                                    <h2 className={`text-3xl font-bold mb-2 ${statusLeitura === 'SUCESSO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {statusLeitura === 'SUCESSO' ? 'Acesso Liberado' : 'Acesso Negado'}
                                    </h2>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-6 text-center max-w-sm">
                        Posicione o QR Code do cartão de identificação do aluno em frente à câmera.
                    </p>
                </div>

                {/* Info Panel Utility Style */}
                <div className="flex-1 lg:max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
                        <Zap size={18} className="text-amber-500" /> Último Registro
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {ultimoAcesso ? (
                            <div className="space-y-6 animate-fade-in">
                                {/* Student Card Clean */}
                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center relative overflow-hidden">
                                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                                        {ultimoAcesso.aluno?.foto ? (
                                            <img src={ultimoAcesso.aluno.foto} alt="Foto Aluno" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-bold text-slate-400">
                                                {ultimoAcesso.aluno?.nome_completo?.[0] || '?'}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-lg font-bold text-slate-900 mb-1 leading-tight">
                                        {ultimoAcesso.aluno?.nome_completo || 'Não Identificado'}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 mb-4">
                                        Matrícula: {ultimoAcesso.aluno?.matricula || ultimoAcesso.matricula}
                                    </p>

                                    {ultimoAcesso.aluno && (
                                        <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-xs font-semibold border border-indigo-100">
                                            <ShieldCheck size={14} /> Turma {ultimoAcesso.aluno.turma_id}
                                        </div>
                                    )}
                                </div>

                                {/* Details List */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-xs font-medium text-slate-500 uppercase">Horário</span>
                                        <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                            <Clock size={14} className="text-slate-400" />
                                            {ultimoAcesso.hora}
                                        </span>
                                    </div>
                                    <div className={`flex items-center justify-between p-3 rounded-lg border ${ultimoAcesso.tipo === 'SUCESSO'
                                        ? 'bg-emerald-50 border-emerald-100'
                                        : 'bg-rose-50 border-rose-100'
                                        }`}>
                                        <span className="text-xs font-medium text-slate-500 uppercase">Status</span>
                                        <span className={`text-sm font-bold flex items-center gap-1.5 ${ultimoAcesso.tipo === 'SUCESSO' ? 'text-emerald-700' : 'text-rose-700'
                                            }`}>
                                            {ultimoAcesso.tipo === 'SUCESSO' ? <ShieldCheck size={16} /> : <UserX size={16} />}
                                            {ultimoAcesso.mensagem}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                                <Maximize2 size={32} />
                                <p className="text-sm font-medium text-center max-w-[200px]">
                                    Aguardando leitura do próximo aluno...
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-semibold text-slate-500">Sistema Ativo</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            SCAE CORE
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

