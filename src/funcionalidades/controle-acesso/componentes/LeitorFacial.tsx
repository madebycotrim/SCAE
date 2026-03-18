/**
 * LeitorFacial — Hook filho do quiosque para reconhecimento facial.
 *
 * Responsabilidades:
 * - Gerenciar a camera e o face-api.js
 * - Carregar descritores da escola
 * - Reconhecer rostos em tempo real
 * - Chamar aoIdentificar(matricula) quando reconhecido
 *
 * NAO gerencia: registro de acesso, TTS, feedback visual, UI shell
 */
import { usarReconhecimentoFacial } from '../hooks/usarReconhecimentoFacial';

interface OpcoesLeitorFacial {
    elementoId: string;
    escolaId: string;
    cooldownMs: number;
    aoIdentificar: (matricula: string) => void;
}

export function usarLeitorFacial({ elementoId, escolaId, cooldownMs, aoIdentificar }: OpcoesLeitorFacial) {
    const {
        statusReconhecimento,
        totalCadastrados,
        pausar,
        retomar
    } = usarReconhecimentoFacial(elementoId, {
        escolaId,
        cooldownMs,
        aoReconhecer: (matricula, _distancia) => {
            aoIdentificar(matricula);
        }
    });

    return {
        statusCamera: statusReconhecimento,
        totalCadastrados,
        pausar,
        retomar
    };
}
