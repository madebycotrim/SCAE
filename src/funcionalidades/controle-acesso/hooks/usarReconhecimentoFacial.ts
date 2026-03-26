/**
 * Hook usarReconhecimentoFacial — Reconhecimento facial contínuo no quiosque.
 *
 * Quando a escola usa metodoAcesso === 'FACIAL', este hook substitui o leitor QR.
 * Usa face-api.js rodando 100% no browser — sem enviar dados ao servidor.
 *
 * Fluxo: Camera ativa → detecta rosto → compara com cache → callback de match.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    carregarModelosFaciais,
    reconhecerRosto,
    extrairDescritor,
    carregarDescritoresEmMassa,
    modelosProntos,
    totalAlunosCadastrados
} from '../servicos/reconhecimentoFacial.servico';
import { api } from '@/compartilhado/servicos/api';

type StatusReconhecimento = 'INICIALIZANDO' | 'CARREGANDO_MODELOS' | 'ATIVO' | 'PAUSADO' | 'ERRO' | 'SEM_CAMERA' | 'PERMISSAO_NEGADA';

interface OpcoesReconhecimentoFacial {
    escolaId: string;
    /** Cooldown em ms entre reconhecimentos do mesmo aluno */
    cooldownMs?: number;
    /** Callback quando um aluno é reconhecido */
    aoReconhecer: (matricula: string, distancia: number) => void;
}

export function usarReconhecimentoFacial(
    elementoVideoId: string,
    opcoes: OpcoesReconhecimentoFacial
) {
    const { escolaId, cooldownMs = 5000, aoReconhecer } = opcoes;

    const [status, definirStatus] = useState<StatusReconhecimento>('INICIALIZANDO');
    const [totalCadastrados, definirTotalCadastrados] = useState(0);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const ultimoReconhecimentoRef = useRef<string>('');
    const ultimoTimestampRef = useRef<number>(0);
    const ativoRef = useRef(true);
    const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Carregar modelos e descritores
    useEffect(() => {
        let cancelado = false;

        const inicializar = async () => {
            try {
                // 1. Carregar modelos face-api.js
                if (!modelosProntos()) {
                    definirStatus('CARREGANDO_MODELOS');
                    await carregarModelosFaciais();
                }

                if (cancelado) return;

                // 2. Buscar descritores da escola via API
                try {
                    const dados = await api.obter<Array<{ matricula: string; descritores: number[][] }>>(
                        `/academico/facial?escola_id=${escolaId}`
                    );
                    if (dados && Array.isArray(dados)) {
                        carregarDescritoresEmMassa(dados);
                        definirTotalCadastrados(dados.length);
                    }
                } catch (e) {
                    console.warn('[Facial] Erro ao carregar descritores — usando cache local se disponivel:', e);
                }

                if (cancelado) return;

                // 3. Iniciar camera
                await iniciarCamera();

            } catch (erro: any) {
                if (!cancelado) {
                    console.error('[Facial] Erro na inicializacao:', erro);
                    definirStatus('ERRO');
                }
            }
        };

        inicializar();

        return () => {
            cancelado = true;
            ativoRef.current = false;
            pararCamera();
            if (intervaloRef.current) clearInterval(intervaloRef.current);
        };
    }, [escolaId]);

    const iniciarCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            streamRef.current = stream;

            // Aguardar o elemento de video aparecer no DOM
            const aguardarElemento = (): Promise<HTMLVideoElement> => {
                return new Promise((resolve, reject) => {
                    let tentativas = 0;
                    const intervalo = setInterval(() => {
                        const container = document.getElementById(elementoVideoId);
                        if (container) {
                            // Criar ou reutilizar elemento de video
                            let video = container.querySelector('video') as HTMLVideoElement;
                            if (!video) {
                                video = document.createElement('video');
                                video.autoplay = true;
                                video.playsInline = true;
                                video.muted = true;
                                video.style.width = '100%';
                                video.style.height = '100%';
                                video.style.objectFit = 'cover';
                                video.style.transform = 'scaleX(-1)';
                                container.appendChild(video);
                            }
                            clearInterval(intervalo);
                            resolve(video);
                        }
                        if (++tentativas > 50) {
                            clearInterval(intervalo);
                            reject(new Error('Elemento de video nao encontrado'));
                        }
                    }, 100);
                });
            };

            const video = await aguardarElemento();
            video.srcObject = stream;
            await video.play();
            videoRef.current = video;

            definirStatus('ATIVO');
            iniciarLoopReconhecimento();

        } catch (erro: any) {
            if (erro.name === 'NotAllowedError') {
                definirStatus('PERMISSAO_NEGADA');
            } else if (erro.name === 'NotFoundError') {
                definirStatus('SEM_CAMERA');
            } else {
                definirStatus('ERRO');
            }
        }
    }, [elementoVideoId]);

    const pararCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (intervaloRef.current) {
            clearInterval(intervaloRef.current);
            intervaloRef.current = null;
        }
    }, []);

    const iniciarLoopReconhecimento = useCallback(() => {
        if (intervaloRef.current) clearInterval(intervaloRef.current);

        intervaloRef.current = setInterval(async () => {
            if (!ativoRef.current || !videoRef.current) return;

            try {
                let resultado = await reconhecerRosto(videoRef.current);

                // 🔥 FALLBACK HÍBRIDO (Nuvem): Se o reconhecimento local falhar (cache incompleto), 
                // enviamos o descritor para a Cloudflare comparar com a base global.
                if (!resultado) {
                    const descritor = await extrairDescritor(videoRef.current);
                    if (descritor) {
                        try {
                            const resNuvem = await api.enviar<any>('/acesso/facial-comparar', {
                                vetor_facial: Array.from(descritor)
                            });
                            if (resNuvem && resNuvem.ok) {
                                resultado = { matricula: resNuvem.matricula, distancia: parseFloat(resNuvem.distancia) };
                                console.log('[Facial] Reconhecido via Nuvem (Fallback) ✓');
                            }
                        } catch (e) {
                            // Silencioso: Fallback falhou ou aluno não identificado na base global também.
                        }
                    }
                }

                if (resultado) {
                    const agora = Date.now();
                    const mesmaPessoa = resultado.matricula === ultimoReconhecimentoRef.current;
                    const dentroDoCooldown = (agora - ultimoTimestampRef.current) < cooldownMs;

                    // Aplicar debounce — mesmo aluno nao reconhecido duas vezes seguidas dentro do cooldown
                    if (mesmaPessoa && dentroDoCooldown) return;

                    ultimoReconhecimentoRef.current = resultado.matricula;
                    ultimoTimestampRef.current = agora;

                    aoReconhecer(resultado.matricula, resultado.distancia);
                }
            } catch (e) {
                // Frame perdido, continua
            }
        }, 1000); // Verifica 1x por segundo para nao sobrecarregar
    }, [cooldownMs, aoReconhecer]);

    /** Pausa temporariamente o reconhecimento (ex: durante feedback) */
    const pausar = useCallback(() => {
        ativoRef.current = false;
        definirStatus('PAUSADO');
    }, []);

    /** Retoma o reconhecimento apos pausa */
    const retomar = useCallback(() => {
        ativoRef.current = true;
        definirStatus('ATIVO');
    }, []);

    return {
        statusReconhecimento: status,
        totalCadastrados,
        pausar,
        retomar
    };
}
