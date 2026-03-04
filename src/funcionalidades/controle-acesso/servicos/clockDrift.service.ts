/**
 * Serviço de ajuste de Clock Drift para registros offline.
 *
 * É OBRIGATÓRIO tratar os desvios de horário ocorridos durante offline para
 * validade jurídica da porta de entrada e retenção LGPD.
 */
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('ClockDrift');

// Armazena o desvio calculado do servidor Cloudflare em milissegundos
let desvioClockCache: number | null = null;
let descompassoInaceitavel = false;

/**
 * Busca o horário em um servidor confiável e compara com a hora local local (tablet).
 * Se offline de novo, o fetch falha, e usaremos o desvioCache se houver.
 */
export async function corrigirClockDrift(): Promise<void> {
    try {
        const timestampAntigo = Date.now();
        // Fallback para uma rota que retorna o Date.now() ou do cabeçalho de resposta:
        const resposta = await fetch(import.meta.env.VITE_API_URL + '/saude', { method: 'HEAD' });

        const dataServidorStr = resposta.headers.get('date');
        if (!dataServidorStr) return; // Se não houver cabeçalho DATE, pule a checagem

        const timestampServidor = new Date(dataServidorStr).getTime();
        const desvioMs = timestampServidor - timestampAntigo;

        const maxDesvioAceitavelMs = 5 * 60 * 1000; // 5 minutos

        if (Math.abs(desvioMs) <= maxDesvioAceitavelMs) {
            desvioClockCache = desvioMs;
            descompassoInaceitavel = false;
        } else {
            descompassoInaceitavel = true;
            log.error(`Clock Drift > 5 Minutos Detectado: ${desvioMs}ms`);
            // Precisaríamos disparar uma flag global para o aviso na Interface, ou jogar o log num Zustand global 
        }

    } catch (e) {
        log.warn('Falha na correção do clock drift no momento (Offline?)', e);
    }
}

/**
 * Aplica o desvio do relógio a um timestamp local gerado em offlline.
 */
export function ajustarTimestampLocal(timestampTablet: number): number {
    if (desvioClockCache === null || descompassoInaceitavel) {
        return timestampTablet; // não ajusta ou não pode ajustar
    }
    return timestampTablet + desvioClockCache;
}

export function ehDescompassoInaceitavel() {
    return descompassoInaceitavel;
}

