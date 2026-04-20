/**
 * registrarLocal.ts - Utilitário de log padronizado para o sistema.
 * Segue as regras do Agents.md e PrintLog para mascaramento de PII.
 * Agora com interceptador global para permitir logs EXCLUSIVAMENTE para a conta do desenvolvedor.
 */

import { autenticacao } from '@/compartilhado/servicos/firebase.config';

type NivelLog = 'info' | 'warn' | 'error' | 'trace';

const EMAIL_DEV_PERMITIDO = 'madebycotrim@gmail.com';

/**
 * Função global que verifica instantaneamente via Firebase se o usuário logado é o autor autorizado a debugar.
 */
function usuarioDevAutorizado(): boolean {
    const email = autenticacao.currentUser?.email?.toLowerCase();
    return email === EMAIL_DEV_PERMITIDO.toLowerCase();
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
        // Sempre permite erros e avisos para facilitar a depuração reportada por usuários.
        // Bloqueia silenciosamente a emissão do console para outros métodos se não for o dev.
        if (metodo === 'error' || metodo === 'warn' || usuarioDevAutorizado()) {
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

export function mascararDadoPessoal(valor: string, tipo: 'email' | 'cartao' | 'token'): string {
    if (!valor) return '';

    if (tipo === 'email') return valor.replace(/(.{2}).*(@.*)/, '$1***$2');
    if (tipo === 'token') return `tok_****${valor.slice(-4)}`;
    return '***';
}

export function criarRegistrador(modulo: string) {
    const formatarMensagem = (nivel: NivelLog, msg: string, contexto?: unknown) => {
        // Barragem robusta dupla
        if (!usuarioDevAutorizado()) return;

        // Silencia logs informativos a menos que exista uma flag de debug no localStorage
        const debugAtivo = localStorage.getItem('SCAE_DEBUG') === 'true';
        if ((nivel === 'info' || nivel === 'trace') && !debugAtivo) return;

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

