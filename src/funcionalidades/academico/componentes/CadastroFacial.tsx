/**
 * CadastroFacial — Componente para captura facial do aluno.
 * 
 * Fluxo: Aluno olha para camera -> barra de progresso 3s -> "Cadastrado!"
 * Captura multiplos frames automaticamente e seleciona os melhores.
 * 
 * LGPD Art. 11 — Dado biometrico sensivel.
 * Nenhuma foto e salva. Apenas descritores numericos (vetores 128d).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, Loader2, Eye } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/UI';
import {
    carregarModelosFaciais,
    extrairDescritor,
    cadastrarDescritor,
    serializarDescritores,
    modelosProntos
} from '@/funcionalidades/controle-acesso/servicos/reconhecimentoFacial.servico';

interface CadastroFacialProps {
    matricula: string;
    nomeAluno: string;
    aoFinalizar: (descritores: number[][]) => void;
    aoCancelar: () => void;
}

type StatusCadastro = 'PREPARANDO' | 'CARREGANDO_MODELOS' | 'AGUARDANDO_ROSTO' | 'CAPTURANDO' | 'SUCESSO' | 'ERRO';

const DURACAO_CAPTURA_MS = 3000;
const INTERVALO_FRAMES_MS = 400; // Captura ~7 frames em 3 segundos

export default function CadastroFacial({ matricula, nomeAluno, aoFinalizar, aoCancelar }: CadastroFacialProps) {
    const [status, definirStatus] = useState<StatusCadastro>('PREPARANDO');
    const [progresso, definirProgresso] = useState(0);
    const [mensagemErro, definirMensagemErro] = useState('');
    const [descritoresCapturados, definirDescritoresCapturados] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const capturaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const descritoresRef = useRef<Float32Array[]>([]);

    // Inicializar camera e modelos
    useEffect(() => {
        let cancelado = false;
        
        const inicializar = async () => {
            try {
                // 1. Carregar modelos (se ainda nao carregados)
                if (!modelosProntos()) {
                    definirStatus('CARREGANDO_MODELOS');
                    await carregarModelosFaciais();
                }

                if (cancelado) return;

                // 2. Acessar camera
                definirStatus('PREPARANDO');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });

                if (cancelado) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                definirStatus('AGUARDANDO_ROSTO');
            } catch (erro: any) {
                if (!cancelado) {
                    console.error('[CadastroFacial] Erro na inicializacao:', erro);
                    definirMensagemErro(
                        erro.name === 'NotAllowedError' 
                            ? 'Permissao de camera negada. Autorize nas configuracoes do navegador.'
                            : erro.name === 'NotFoundError'
                            ? 'Nenhuma camera encontrada neste dispositivo.'
                            : 'Erro ao inicializar o sistema facial.'
                    );
                    definirStatus('ERRO');
                }
            }
        };

        inicializar();

        return () => {
            cancelado = true;
            if (capturaIntervalRef.current) clearInterval(capturaIntervalRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    // Iniciar captura automatica quando rosto detectado
    const iniciarCaptura = useCallback(async () => {
        if (status !== 'AGUARDANDO_ROSTO' || !videoRef.current) return;

        // Verifica se ha rosto antes de iniciar
        const teste = await extrairDescritor(videoRef.current);
        if (!teste) return;

        definirStatus('CAPTURANDO');
        descritoresRef.current = [teste];
        definirDescritoresCapturados(1);
        definirProgresso(0);

        const inicio = Date.now();

        capturaIntervalRef.current = setInterval(async () => {
            if (!videoRef.current) return;

            const decorrido = Date.now() - inicio;
            const progressoAtual = Math.min((decorrido / DURACAO_CAPTURA_MS) * 100, 100);
            definirProgresso(progressoAtual);

            // Capturar mais um frame
            try {
                const descritor = await extrairDescritor(videoRef.current);
                if (descritor) {
                    descritoresRef.current.push(descritor);
                    definirDescritoresCapturados(descritoresRef.current.length);
                }
            } catch (e) {
                // Frame perdido, continua tentando
            }

            // Fim da captura
            if (decorrido >= DURACAO_CAPTURA_MS) {
                if (capturaIntervalRef.current) clearInterval(capturaIntervalRef.current);
                definirProgresso(100);
                finalizarCadastro();
            }
        }, INTERVALO_FRAMES_MS);
    }, [status]);

    const finalizarCadastro = useCallback(() => {
        const descritores = descritoresRef.current;

        if (descritores.length < 2) {
            definirMensagemErro('Poucos frames capturados. O rosto precisa estar visivel durante toda a captura.');
            definirStatus('ERRO');
            return;
        }

        // Registrar no cache de memoria
        cadastrarDescritor(matricula, descritores);

        // Serializar para envio ao servidor
        const serializados = serializarDescritores(descritores);

        definirStatus('SUCESSO');

        // Parar camera
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }

        // Notificar o parent apos breve delay visual
        setTimeout(() => {
            aoFinalizar(serializados);
        }, 2000);
    }, [matricula, aoFinalizar]);

    // Loop de deteccao de rosto (antes da captura)
    useEffect(() => {
        if (status !== 'AGUARDANDO_ROSTO') return;

        const intervalo = setInterval(() => {
            iniciarCaptura();
        }, 500);

        return () => clearInterval(intervalo);
    }, [status, iniciarCaptura]);

    const reiniciar = useCallback(async () => {
        descritoresRef.current = [];
        definirDescritoresCapturados(0);
        definirProgresso(0);
        definirMensagemErro('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            definirStatus('AGUARDANDO_ROSTO');
        } catch (e) {
            definirMensagemErro('Erro ao reiniciar camera.');
            definirStatus('ERRO');
        }
    }, []);

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Header */}
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Cadastro Facial
                    </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {nomeAluno}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {matricula}
                </p>
            </div>

            {/* Area da Camera */}
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-lg">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover mirror"
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: 'scaleX(-1)' }}
                />

                {/* Overlay de Carregamento */}
                {(status === 'PREPARANDO' || status === 'CARREGANDO_MODELOS') && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={40} className="text-blue-400 animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {status === 'CARREGANDO_MODELOS' ? 'Carregando modelos IA...' : 'Iniciando camera...'}
                        </p>
                    </div>
                )}

                {/* Overlay Aguardando Rosto */}
                {status === 'AGUARDANDO_ROSTO' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Moldura guia */}
                        <div className="absolute inset-12 border-2 border-dashed border-blue-400/50 rounded-full" />
                        <div className="absolute bottom-4 inset-x-0 text-center">
                            <span className="bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full backdrop-blur-sm">
                                Posicione o rosto no centro
                            </span>
                        </div>
                    </div>
                )}

                {/* Overlay de Captura */}
                {status === 'CAPTURANDO' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Borda animada */}
                        <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl animate-pulse" />
                        
                        {/* Barra de progresso */}
                        <div className="absolute bottom-0 inset-x-0 h-2 bg-black/30">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-300 ease-linear shadow-[0_0_20px_rgba(59,130,246,0.8)]"
                                style={{ width: `${progresso}%` }}
                            />
                        </div>

                        {/* Contador */}
                        <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-black px-3 py-1.5 rounded-full backdrop-blur-sm tabular-nums">
                            {descritoresCapturados} frames
                        </div>

                        <div className="absolute bottom-6 inset-x-0 text-center">
                            <span className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg">
                                Mantenha o rosto parado...
                            </span>
                        </div>
                    </div>
                )}

                {/* Overlay de Sucesso */}
                {status === 'SUCESSO' && (
                    <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-105 duration-500">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                            <CheckCircle size={60} className="text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <h4 className="text-3xl font-black text-white uppercase tracking-tighter">
                            Cadastrado!
                        </h4>
                        <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
                            {descritoresCapturados} pontos faciais registrados
                        </p>
                    </div>
                )}

                {/* Overlay de Erro */}
                {status === 'ERRO' && (
                    <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-4 p-6">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/50">
                            <AlertCircle size={32} className="text-rose-500" />
                        </div>
                        <p className="text-white text-xs font-bold text-center uppercase tracking-wider leading-relaxed max-w-xs">
                            {mensagemErro}
                        </p>
                    </div>
                )}
            </div>

            {/* Status Info */}
            {status === 'CAPTURANDO' && (
                <div className="w-full max-w-sm">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>Progresso</span>
                        <span>{Math.round(progresso)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${progresso}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Botoes */}
            <div className="flex gap-4 w-full max-w-sm">
                {status === 'ERRO' && (
                    <Botao
                        variante="secundario"
                        tamanho="lg"
                        icone={RefreshCw}
                        onClick={reiniciar}
                        className="flex-1"
                    >
                        Tentar Novamente
                    </Botao>
                )}
                <Botao
                    variante="secundario"
                    tamanho="lg"
                    onClick={aoCancelar}
                    className={status === 'ERRO' ? 'flex-1' : 'w-full'}
                >
                    {status === 'SUCESSO' ? 'Fechar' : 'Cancelar'}
                </Botao>
            </div>

            {/* Aviso LGPD */}
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center max-w-sm leading-relaxed">
                Nenhuma foto e armazenada. Apenas descritores numericos anonimos sao salvos conforme LGPD Art. 11.
            </p>
        </div>
    );
}
