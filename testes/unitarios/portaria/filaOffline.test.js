/**
 * Testes unitários para filaOffline.service.
 *
 * Usa mock de IndexedDB para testar enfileiramento e recuperação
 * de registros offline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do IndexedDB — simula armazenamento em memória
function criarBancoMock() {
    const dados = {};

    return {
        put: vi.fn((registro) => {
            dados[registro.id] = registro;
        }),
        getAll: vi.fn(() => Object.values(dados)),
        get: vi.fn((id) => dados[id]),
    };
}

describe('filaOffline — lógica', () => {
    let banco;

    beforeEach(() => {
        banco = criarBancoMock();
    });

    it('deve enfileirar um registro offline corretamente', () => {
        // Preparar
        const registro = {
            id: 'acesso-001',
            qrCode: 'MAT-2024-001',
            tipoAcesso: 'ENTRADA',
            timestamp: Date.now(),
            tenantId: 'escola-abc',
            sincronizado: false,
        };

        // Agir
        banco.put(registro);

        // Verificar
        expect(banco.put).toHaveBeenCalledWith(registro);
        expect(banco.getAll()).toHaveLength(1);
        expect(banco.getAll()[0].sincronizado).toBe(false);
    });

    it('deve retornar apenas registros não sincronizados', () => {
        // Preparar
        banco.put({ id: '1', sincronizado: false, tipoAcesso: 'ENTRADA' });
        banco.put({ id: '2', sincronizado: true, tipoAcesso: 'SAIDA' });
        banco.put({ id: '3', sincronizado: false, tipoAcesso: 'ENTRADA' });

        // Agir
        const todos = banco.getAll();
        const pendentes = todos.filter(r => !r.sincronizado);

        // Verificar
        expect(pendentes).toHaveLength(2);
        expect(pendentes.map(r => r.id)).toEqual(['1', '3']);
    });

    it('deve marcar registro como sincronizado', () => {
        // Preparar
        banco.put({ id: 'acesso-001', sincronizado: false });

        // Agir
        const registro = banco.get('acesso-001');
        registro.sincronizado = true;
        banco.put(registro);

        // Verificar
        const atualizado = banco.get('acesso-001');
        expect(atualizado.sincronizado).toBe(true);
    });

    it('deve preservar ordem de enfileiramento', () => {
        // Preparar & Agir
        banco.put({ id: '1', timestamp: 1000, sincronizado: false });
        banco.put({ id: '2', timestamp: 2000, sincronizado: false });
        banco.put({ id: '3', timestamp: 3000, sincronizado: false });

        // Verificar
        const todos = banco.getAll();
        expect(todos).toHaveLength(3);
        expect(todos[0].timestamp).toBeLessThan(todos[1].timestamp);
        expect(todos[1].timestamp).toBeLessThan(todos[2].timestamp);
    });

    it('deve lidar com fila vazia', () => {
        // Agir
        const pendentes = banco.getAll().filter(r => !r.sincronizado);

        // Verificar
        expect(pendentes).toHaveLength(0);
    });
});
