/**
 * registrarLocal.ts - Utilitário de log padronizado para o sistema.
 * Segue as regras do Agents.md e PrintLog para mascaramento de PII.
 * Agora com interceptador global para permitir logs EXCLUSIVAMENTE para a conta do desenvolvedor.
 */

import { autenticacao } from '@funcionalidades/autenticacao/servicos/firebase.config';

type NivelLog = 'info' | 'warn' | 'error' | 'trace';

const EMAIL_DEV_PERMITIDO = 'madebycotrim@gmail.com';

/**
 * Função global que verifica instantaneamente via Firebase se o usuário logado é o autor autorizado a debugar.
 */
function usuarioDevAutorizado(): boolean {
    return autenticacao.currentUser?.email === EMAIL_DEV_PERMITIDO;
}

// === INTERCEPTADOR GLOBAL DE CONSOLE (APLICA-SE PARA TUDO NO BROWSER) ===
const originais = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
};

const criarOverride = (metodo: keyof typeof originais) => {
    return (...args: unknown[]) => {
        // Bloqueia silenciosamente a emissão do console se não for o e-mail exato do dev.
        if (usuarioDevAutorizado()) {
            originais[metodo](...args);
        }
    };
};

// Sobrescreve as funções nativas do Console para que qualquer lib terceirizada também seja barrada
console.log = criarOverride('log');
console.warn = criarOverride('warn');
console.error = criarOverride('error');
console.info = criarOverride('info');
console.debug = criarOverride('debug');
console.trace = criarOverride('trace');
// =========================================================================

function mascararDadoPessoal(valor: string, tipo: 'cpf' | 'email' | 'cartao' | 'token'): string {
    if (!valor) return '';
    if (tipo === 'cpf') return valor.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/g, '$1.***.***-$2');
    if (tipo === 'email') return valor.replace(/(.{2}).*(@.*)/, '$1***$2');
    if (tipo === 'token') return `tok_****${valor.slice(-4)}`;
    return '***';
}

export function criarRegistrador(modulo: string) {
    const formatarMensagem = (nivel: NivelLog, msg: string, contexto?: unknown) => {
        // Barragem robusta dupla, impedindo impressões customizadas tbm.
        if (!usuarioDevAutorizado()) return;

        const timestamp = new Date().toISOString();
        const prefixo = `[${timestamp}] [${nivel.toUpperCase()}] [${modulo}]`;
        if (contexto) {
            originais[nivel === 'trace' ? 'debug' : nivel](prefixo, msg, contexto);
        } else {
            originais[nivel === 'trace' ? 'debug' : nivel](prefixo, msg);
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
