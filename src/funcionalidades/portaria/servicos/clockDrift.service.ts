/**
 * ServiÃ§o de ajuste de Clock Drift para registros offline.
 *
 * Ã‰ OBRIGATÃ“RIO tratar os desvios de horÃ¡rio ocorridos durante offline para
 * validade jurÃ­dica da porta de entrada e retenÃ§Ã£o LGPD.
 */
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('ClockDrift');

// Armazena o desvio calculado do servidor Cloudflare em milissegundos
let desvioClockCache: number | null = null;
let descompassoInaceitavel = false;

/**
 * Busca o horÃ¡rio em um servidor confiÃ¡vel e compara com a hora local local (tablet).
 * Se offline de novo, o fetch falha, e usaremos o desvioCache se houver.
 */
export async function corrigirClockDrift(): Promise<void> {
    try {
        const timestampAntigo = Date.now();
        // Fallback para uma rota que retorna o Date.now() ou do cabeÃ§alho de resposta:
        const resposta = await fetch(import.meta.env.VITE_API_URL + '/saude', { method: 'HEAD' });

        const dataServidorStr = resposta.headers.get('date');
        if (!dataServidorStr) return; // Se nÃ£o houver cabeÃ§alho DATE, pule a checagem

        const timestampServidor = new Date(dataServidorStr).getTime();
        const desvioMs = timestampServidor - timestampAntigo;

        const maxDesvioAceitavelMs = 5 * 60 * 1000; // 5 minutos

        if (Math.abs(desvioMs) <= maxDesvioAceitavelMs) {
            desvioClockCache = desvioMs;
            descompassoInaceitavel = false;
        } else {
            descompassoInaceitavel = true;
            log.error(`Clock Drift > 5 Minutos Detectado: ${desvioMs}ms`);
            // PrecisarÃ­amos disparar uma flag global para o aviso na Interface, ou jogar o log num Zustand global 
        }

    } catch (e) {
        log.warn('Falha na correÃ§Ã£o do clock drift no momento (Offline?)', e);
    }
}

/**
 * Aplica o desvio do relÃ³gio a um timestamp local gerado em offlline.
 */
export function ajustarTimestampLocal(timestampTablet: number): number {
    if (desvioClockCache === null || descompassoInaceitavel) {
        return timestampTablet; // nÃ£o ajusta ou nÃ£o pode ajustar
    }
    return timestampTablet + desvioClockCache;
}

export function ehDescompassoInaceitavel() {
    return descompassoInaceitavel;
}

