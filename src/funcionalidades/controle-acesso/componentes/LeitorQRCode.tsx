import { useCallback, useEffect } from 'react';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarLeitorQR } from '../hooks/usarLeitorQR';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { obterChavePublica, verificarAssinaturaECDSA } from '../utils/validarQR';
import { alunoEstaRevogado } from '../servicos/cacheMemoria';

const log = criarRegistrador('Quiosque:LeitorQR');

/**
 * Propriedades de configuração do leitor de QR Code.
 */
interface OpcoesLeitorQR {
    /** ID do elemento HTML para renderizar a câmera */
    elementoId: string;
    /** Callback chamado ao identificar uma matrícula válida */
    aoIdentificar: (matricula: string) => void;
    /** Callback chamado em caso de erro na leitura ou validação */
    aoErro: (mensagem: string) => void;
}

/**
 * Gancho encarregado da lógica de hardware e validação criptográfica (ECDSA) de QR Codes.
 * Garante que apenas crachás autênticos e dentro do prazo de validade sejam processados.
 */
export function usarLeitorQRCode({ elementoId, aoIdentificar, aoErro }: OpcoesLeitorQR) {
    const escola = usarEscola();

    // Carregar chave pública ECDSA na inicialização
    useEffect(() => {
        if (!escola.id) return;
        obterChavePublica(escola.id).catch((erro: any) =>
            log.error('Falha ao obter chave pública', erro.message)
        );
    }, [escola.id]);

    /**
     * Processa o texto decodificado da câmera, validando formato, tempo e assinatura.
     */
    const processarDecodificacao = useCallback(async (
        textoDecodificado: string,
        pararCamera: () => void,
        retomarCamera: () => void
    ) => {
        pararCamera();

        try {
            const partesQR = textoDecodificado.split('|');
            if (partesQR.length !== 3) {
                aoErro('QR Code Incompatível.');
                retomarCamera();
                return;
            }

            const [matricula, timestampEmissao, assinatura] = partesQR;
            const payloadAssinado = `${matricula}|${timestampEmissao}`;

            // Validação Temporal (Anti-Replay)
            const momentoAtual = ajustarTimestampLocal(Date.now());
            const emissaoEmMs = parseInt(timestampEmissao) * 1000;
            const idadeEmSegundos = Math.floor((momentoAtual - emissaoEmMs) / 1000);

            if (escola.qrDinamico && idadeEmSegundos > 25) {
                aoErro('QR Expirado. Use o app original.');
                retomarCamera();
                return;
            }

            const chavePublica = await obterChavePublica(escola.id);
            const assinaturaValida = await verificarAssinaturaECDSA(payloadAssinado, assinatura, chavePublica);

            if (!assinaturaValida) {
                aoErro('Crachá não autenticado.');
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

        } catch (erro: any) {
            log.error('Erro na leitura do QR', erro.message);
            aoErro('Falha técnica no núcleo.');
            retomarCamera();
        }
    }, [escola.id, escola.qrDinamico, aoIdentificar, aoErro]);

    const { statusLeitor } = usarLeitorQR(elementoId, processarDecodificacao);

    return { statusCamera: statusLeitor };
}
