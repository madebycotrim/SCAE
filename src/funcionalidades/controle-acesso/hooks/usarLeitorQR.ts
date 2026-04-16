import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('ControleAcesso:LeitorQR');

/**
 * Hook para gerenciar o ciclo de vida do leitor de QR Code HTML5.
 */
export function usarLeitorQR(
    idElemento: string,
    aoDecodificar: (texto: string, parar: () => void, retomar: () => void) => void
) {
    const leitorRef = useRef<Html5Qrcode | null>(null);
    const [statusLeitor, setStatusLeitor] = useState<'INICIALIZANDO' | 'PERMISSAO_NEGADA' | 'SEM_CAMERA' | 'ATIVO' | 'ERRO'>('INICIALIZANDO');

    useEffect(() => {
        let mounted = true;

        const inicializarCamera = async () => {
            try {
                // 1. Tenta listar as câmeras (isso já dispara o pedido de permissão no navegador)
                const devices = await Html5Qrcode.getCameras();
                
                if (!mounted) return;

                if (!devices || devices.length === 0) {
                    setStatusLeitor('SEM_CAMERA');
                    log.error('Nenhuma câmera encontrada no dispositivo.');
                    return;
                }

                const leitor = new Html5Qrcode(idElemento, {
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    verbose: false
                });

                leitorRef.current = leitor;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                const parar = () => leitor.pause();
                const retomar = () => leitor.resume();

                // 2. Inicia o leitor. Tenta facingMode 'user' primeiro, mas se falhar tenta qualquer uma
                try {
                    await leitor.start(
                        { facingMode: "user" },
                        config,
                        (texto) => {
                            if (mounted) aoDecodificar(texto, parar, retomar);
                        },
                        undefined
                    );
                } catch (e) {
                    if (!mounted) return;
                    log.warn('Falha ao iniciar com facingMode user, tentando fallback...', (e as any).message);
                    // Fallback: usa a primeira câmera disponível
                    await leitor.start(
                        devices[0].id,
                        config,
                        (texto) => {
                            if (mounted) aoDecodificar(texto, parar, retomar);
                        },
                        undefined
                    );
                }

                if (mounted) setStatusLeitor('ATIVO');

            } catch (err: any) {
                log.error('Falha crítica ao acessar câmera', err);
                if (mounted) {
                    if (err?.name === 'NotAllowedError' || err === 'Permission denied') {
                        setStatusLeitor('PERMISSAO_NEGADA');
                    } else if (err?.name === 'NotFoundError') {
                        setStatusLeitor('SEM_CAMERA');
                    } else {
                        setStatusLeitor('ERRO');
                    }
                }
            }
        };

        inicializarCamera();

        return () => {
            mounted = false;
            if (leitorRef.current?.isScanning) {
                leitorRef.current.stop().catch(e => log.warn('Erro ao interromper leitor', e));
            }
        };
    }, [idElemento, aoDecodificar]);

    return { statusLeitor };
}

