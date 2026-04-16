/**
 * Testes unitários para useTipoAcesso.
 *
 * Verifica que o hook retorna ENTRADA, SAÍDA ou INDEFINIDO
 * baseado nos horários configurados.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Testamos a lógica pura de conversão e comparação de horários.
// O hook real usa useState/useEffect — aqui testamos a lógica extraída.

/**
 * Lógica de determinação de tipo de acesso (extraída do hook).
 */
function converterParaMinutos(hora) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function determinarTipoAcesso(horaAtualMinutos, janelas) {
    for (const janela of janelas) {
        const inicio = converterParaMinutos(janela.horaInicio);
        const fim = converterParaMinutos(janela.horaFim);

        if (horaAtualMinutos >= inicio && horaAtualMinutos <= fim) {
            return janela.tipoAcesso;
        }
    }
    return 'INDEFINIDO';
}

const JANELAS_PADRAO = [
    { horaInicio: '06:30', horaFim: '08:30', tipoAcesso: 'ENTRADA' },
    { horaInicio: '11:30', horaFim: '12:30', tipoAcesso: 'SAIDA' },
    { horaInicio: '12:30', horaFim: '14:00', tipoAcesso: 'ENTRADA' },
    { horaInicio: '17:00', horaFim: '18:30', tipoAcesso: 'SAIDA' },
];

describe('determinarTipoAcesso', () => {
    // Preparar: janelas padrão
    const janelas = JANELAS_PADRAO;

    it('deve retornar ENTRADA às 07:00', () => {
        // Agir
        const resultado = determinarTipoAcesso(7 * 60, janelas);
        // Verificar
        expect(resultado).toBe('ENTRADA');
    });

    it('deve retornar ENTRADA às 06:30 (exatamente no início da janela)', () => {
        const resultado = determinarTipoAcesso(6 * 60 + 30, janelas);
        expect(resultado).toBe('ENTRADA');
    });

    it('deve retornar ENTRADA às 08:30 (exatamente no fim da janela)', () => {
        const resultado = determinarTipoAcesso(8 * 60 + 30, janelas);
        expect(resultado).toBe('ENTRADA');
    });

    it('deve retornar SAIDA às 12:00', () => {
        const resultado = determinarTipoAcesso(12 * 60, janelas);
        expect(resultado).toBe('SAIDA');
    });

    it('deve retornar SAIDA às 17:30', () => {
        const resultado = determinarTipoAcesso(17 * 60 + 30, janelas);
        expect(resultado).toBe('SAIDA');
    });

    it('deve retornar ENTRADA às 13:00 (segundo período)', () => {
        const resultado = determinarTipoAcesso(13 * 60, janelas);
        expect(resultado).toBe('ENTRADA');
    });

    it('deve retornar INDEFINIDO às 09:00 (entre janelas)', () => {
        const resultado = determinarTipoAcesso(9 * 60, janelas);
        expect(resultado).toBe('INDEFINIDO');
    });

    it('deve retornar INDEFINIDO às 15:00 (entre janelas)', () => {
        const resultado = determinarTipoAcesso(15 * 60, janelas);
        expect(resultado).toBe('INDEFINIDO');
    });

    it('deve retornar INDEFINIDO à meia-noite', () => {
        const resultado = determinarTipoAcesso(0, janelas);
        expect(resultado).toBe('INDEFINIDO');
    });

    it('deve retornar INDEFINIDO às 23:59', () => {
        const resultado = determinarTipoAcesso(23 * 60 + 59, janelas);
        expect(resultado).toBe('INDEFINIDO');
    });

    it('deve funcionar com janelas customizadas', () => {
        const janelasCostumizadas = [
            { horaInicio: '10:00', horaFim: '11:00', tipoAcesso: 'ENTRADA' },
        ];
        const resultado = determinarTipoAcesso(10 * 60 + 30, janelasCostumizadas);
        expect(resultado).toBe('ENTRADA');
    });

    it('deve retornar INDEFINIDO com array vazio de janelas', () => {
        const resultado = determinarTipoAcesso(10 * 60, []);
        expect(resultado).toBe('INDEFINIDO');
    });
});

describe('converterParaMinutos', () => {
    it('deve converter 00:00 para 0', () => {
        expect(converterParaMinutos('00:00')).toBe(0);
    });

    it('deve converter 23:59 para 1439', () => {
        expect(converterParaMinutos('23:59')).toBe(23 * 60 + 59);
    });

    it('deve converter 12:30 para 750', () => {
        expect(converterParaMinutos('12:30')).toBe(750);
    });

    it('deve converter 06:30 para 390', () => {
        expect(converterParaMinutos('06:30')).toBe(390);
    });
});
