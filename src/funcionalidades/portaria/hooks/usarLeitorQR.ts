import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Portaria:LeitorQR');

/**
 * Hook para gerenciar o ciclo de vida do leitor de QR Code HTML5.
 */
export function usarLeitorQR(
    idElemento: string,
    aoDecodificar: (texto: string, parar: () => void, retomar: () => void) => void
) {
    const leitorRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
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

        leitor.start(
            { facingMode: "user" }, // Câmera traseira é ideal, mas para quiosque depende
            config,
            (texto) => aoDecodificar(texto, parar, retomar),
            undefined // Ignorar erros de scan contínuo
        ).catch(e => {
            log.error('Falha ao iniciar câmera', e);
        });

        return () => {
            if (leitor.isScanning) {
                leitor.stop().catch(e => log.warn('Erro ao parar leitor', e));
            }
        };
    }, [idElemento, aoDecodificar]);
}
