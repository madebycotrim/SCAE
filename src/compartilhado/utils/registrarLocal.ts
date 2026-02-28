/**
 * registrarLocal.ts - Utilitário de log padronizado para o sistema.
 * Segue as regras do Agents.md e PrintLog para mascaramento de PII.
 */

type NivelLog = 'info' | 'warn' | 'error' | 'trace';

function mascararDadoPessoal(valor: string, tipo: 'cpf' | 'email' | 'cartao' | 'token'): string {
    if (!valor) return '';
    if (tipo === 'cpf') return valor.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/g, '$1.***.***-$2');
    if (tipo === 'email') return valor.replace(/(.{2}).*(@.*)/, '$1***$2');
    if (tipo === 'token') return `tok_****${valor.slice(-4)}`;
    return '***';
}

export function criarRegistrador(modulo: string) {
    const formatarMensagem = (nivel: NivelLog, msg: string, contexto?: unknown) => {
        const timestamp = new Date().toISOString();
        const prefixo = `[${timestamp}] [${nivel.toUpperCase()}] [${modulo}]`;
        if (contexto) {
            console[nivel === 'trace' ? 'debug' : nivel](prefixo, msg, contexto);
        } else {
            console[nivel === 'trace' ? 'debug' : nivel](prefixo, msg);
        }
    };

    return {
        info: (msg: string, contexto?: unknown) => formatarMensagem('info', msg, contexto),
        warn: (msg: string, contexto?: unknown) => formatarMensagem('warn', msg, contexto),
        error: (msg: string, contexto?: unknown) => formatarMensagem('error', msg, contexto),
        trace: (msg: string, contexto?: unknown) => formatarMensagem('trace', msg, contexto),
        debug: (msg: string, contexto?: unknown) => formatarMensagem('trace', msg, contexto),

        // Utilitário de mascaramento exportado junto
        mascarar: mascararDadoPessoal
    };
}
