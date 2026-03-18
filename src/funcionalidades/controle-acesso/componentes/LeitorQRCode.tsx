/**
 * LeitorQRCode — Hook filho do quiosque para leitura de QR Code.
 *
 * Responsabilidades:
 * - Gerenciar a camera com html5-qrcode
 * - Validar assinatura ECDSA do QR
 * - Chamar aoIdentificar(matricula) quando validado
 *
 * NAO gerencia: registro de acesso, TTS, feedback visual, UI shell
 */
import { useCallback, useEffect } from 'react';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarLeitorQR } from '../hooks/usarLeitorQR';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { obterChavePublica, verificarAssinaturaECDSA } from '../utils/validarQR';
import { alunoEstaRevogado } from '../servicos/cacheMemoria';

const log = criarRegistrador('Quiosque:LeitorQR');

interface OpcoesLeitorQR {
    elementoId: string;
    aoIdentificar: (matricula: string) => void;
    aoErro: (mensagem: string) => void;
}

export function usarLeitorQRCode({ elementoId, aoIdentificar, aoErro }: OpcoesLeitorQR) {
    const escola = usarEscola();

    // Carregar chave publica ECDSA na inicializacao
    useEffect(() => {
        if (!escola.id) return;
        obterChavePublica(escola.id).catch(e =>
            log.error('Falha ao obter chave publica', (e as Error).message)
        );
    }, [escola.id]);

    const processarDecodificacao = useCallback(async (
        textoDecodificado: string,
        pararCamera: () => void,
        retomarCamera: () => void
    ) => {
        pararCamera();

        try {
            const partesQR = textoDecodificado.split('|');
            if (partesQR.length !== 3) {
                aoErro('QR Code Incompativel.');
                retomarCamera();
                return;
            }

            const [matricula, timestampEmissao, assinatura] = partesQR;
            const payloadAssinado = `${matricula}|${timestampEmissao}`;

            // Validacao Temporal
            const agora = ajustarTimestampLocal(Date.now());
            const emissaoMs = parseInt(timestampEmissao) * 1000;
            const idadeSegundos = Math.floor((agora - emissaoMs) / 1000);

            if (escola.qrDinamico && idadeSegundos > 25) {
                aoErro('QR Expirado. Use o app original.');
                retomarCamera();
                return;
            }

            const pk = await obterChavePublica(escola.id);
            const chaveValida = await verificarAssinaturaECDSA(payloadAssinado, assinatura, pk);

            if (!chaveValida) {
                aoErro('Cracha nao autenticado.');
                retomarCamera();
                return;
            }

            if (alunoEstaRevogado(matricula)) {
                aoErro('Acesso Revogado.');
                retomarCamera();
                return;
            }

            aoIdentificar(matricula);
            retomarCamera();

        } catch (e) {
            log.error('Erro na leitura do QR', (e as Error).message);
            aoErro('Falha tecnica no nucleo.');
            retomarCamera();
        }
    }, [escola.id, escola.qrDinamico, aoIdentificar, aoErro]);

    const { statusLeitor } = usarLeitorQR(elementoId, processarDecodificacao);

    return { statusCamera: statusLeitor };
}
