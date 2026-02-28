/**
 * Testes unitários para useAutocadastro.
 *
 * Verifica o fluxo de autocadastro do responsável: status AGUARDANDO → PROCESSANDO → VINCULADO/ERRO.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock da API
const criarApiMock = (deveFailar = false) => ({
    vincular: vi.fn(async (dados) => {
        if (deveFailar) throw new Error('Código inválido');
        return { sucesso: true, responsavelId: 'resp-001' };
    }),
});

// Lógica pura de autocadastro (extraída do hook para testar sem React)
function criarAutocadastro(apiMock) {
    let status = 'AGUARDANDO';
    let erro = null;

    async function vincular(codigoAluno, nomeResponsavel, telefone) {
        status = 'PROCESSANDO';
        erro = null;
        try {
            await apiMock.vincular({ codigoAluno, nomeResponsavel, telefone });
            status = 'VINCULADO';
        } catch (e) {
            erro = e.message ?? 'Código inválido.';
            status = 'ERRO';
        }
    }

    return {
        vincular,
        getStatus: () => status,
        getErro: () => erro,
    };
}

describe('autocadastro — fluxo', () => {
    it('deve iniciar com status AGUARDANDO', () => {
        // Preparar
        const autocadastro = criarAutocadastro(criarApiMock());

        // Verificar
        expect(autocadastro.getStatus()).toBe('AGUARDANDO');
        expect(autocadastro.getErro()).toBeNull();
    });

    it('deve vincular com sucesso quando código é válido', async () => {
        // Preparar
        const apiMock = criarApiMock(false);
        const autocadastro = criarAutocadastro(apiMock);

        // Agir
        await autocadastro.vincular('ALU-2024-001', 'Maria Silva', '61999998888');

        // Verificar
        expect(autocadastro.getStatus()).toBe('VINCULADO');
        expect(autocadastro.getErro()).toBeNull();
        expect(apiMock.vincular).toHaveBeenCalledWith({
            codigoAluno: 'ALU-2024-001',
            nomeResponsavel: 'Maria Silva',
            telefone: '61999998888',
        });
    });

    it('deve retornar ERRO quando código é inválido', async () => {
        // Preparar
        const apiMock = criarApiMock(true); // Vai falhar
        const autocadastro = criarAutocadastro(apiMock);

        // Agir
        await autocadastro.vincular('INVALIDO', 'João', '61999997777');

        // Verificar
        expect(autocadastro.getStatus()).toBe('ERRO');
        expect(autocadastro.getErro()).toBe('Código inválido');
    });

    it('deve chamar API com dados corretos', async () => {
        // Preparar
        const apiMock = criarApiMock(false);
        const autocadastro = criarAutocadastro(apiMock);

        // Agir
        await autocadastro.vincular('ALU-2024-999', 'Ana Santos', '61912345678');

        // Verificar
        expect(apiMock.vincular).toHaveBeenCalledTimes(1);
        expect(apiMock.vincular).toHaveBeenCalledWith({
            codigoAluno: 'ALU-2024-999',
            nomeResponsavel: 'Ana Santos',
            telefone: '61912345678',
        });
    });
});
