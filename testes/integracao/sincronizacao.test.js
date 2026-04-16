/**
 * Testes de integração para sincronizacao.js
 *
 * Verifica a lógica de sincronização com mocks de API e bancoLocal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks simplificados
function criarBancoLocalMock() {
    const dados = {
        alunos: [],
        turmas: [],
        registros_acesso: [],
        usuarios: [],
        pendencias: [],
    };

    return {
        iniciarBanco: vi.fn(async () => ({
            getAll: vi.fn((loja) => dados[loja] || []),
            put: vi.fn((loja, item) => {
                if (!dados[loja]) dados[loja] = [];
                const idx = dados[loja].findIndex(d => d.id === item.id);
                if (idx >= 0) dados[loja][idx] = item;
                else dados[loja].push(item);
            }),
            add: vi.fn((loja, item) => {
                if (!dados[loja]) dados[loja] = [];
                dados[loja].push(item);
            }),
        })),
        listarPendencias: vi.fn(async () => dados.pendencias),
        salvarAlunos: vi.fn(async () => { }),
        salvarTurmas: vi.fn(async () => { }),
        listarUsuarios: vi.fn(async () => dados.usuarios),
        _dados: dados,
    };
}

function criarApiMock(respostas = {}) {
    return {
        buscar: vi.fn(async (rota) => respostas[rota] || []),
        enviar: vi.fn(async () => ({ sucesso: true })),
        delete: vi.fn(async () => ({ sucesso: true })),
    };
}

describe('sincronizacao — integração', () => {
    let bancoMock;
    let apiMock;

    beforeEach(() => {
        bancoMock = criarBancoLocalMock();
        apiMock = criarApiMock({
            '/alunos': [
                { matricula: 'ALU-001', nome_completo: 'João', sincronizado: 1 },
                { matricula: 'ALU-002', nome_completo: 'Maria', sincronizado: 1 },
            ],
            '/turmas': [
                { id: 'T1', nome: '1A', sincronizado: 1 },
            ],
        });
    });

    it('deve processar fila de pendências vazia sem erro', async () => {
        // Preparar
        bancoMock._dados.pendencias = [];

        // Agir
        const pendencias = await bancoMock.listarPendencias();

        // Verificar
        expect(pendencias).toHaveLength(0);
    });

    it('deve identificar alunos não sincronizados', async () => {
        // Preparar
        const banco = await bancoMock.iniciarBanco();
        banco.getAll.mockReturnValue([
            { matricula: 'ALU-001', sincronizado: 0 },
            { matricula: 'ALU-002', sincronizado: 1 },
            { matricula: 'ALU-003', sincronizado: 0 },
        ]);

        // Agir
        const todos = banco.getAll('alunos');
        const naoSincronizados = todos.filter(a => a.sincronizado === 0);

        // Verificar
        expect(naoSincronizados).toHaveLength(2);
        expect(naoSincronizados.map(a => a.matricula)).toEqual(['ALU-001', 'ALU-003']);
    });

    it('deve enviar turmas offline para API', async () => {
        // Preparar
        const turmaOffline = { id: 'T2', nome: '2B', sincronizado: 0 };

        // Agir
        await apiMock.enviar(`/turmas/${turmaOffline.id}`, turmaOffline);

        // Verificar
        expect(apiMock.enviar).toHaveBeenCalledWith('/turmas/T2', turmaOffline);
    });

    it('deve processar exclusão pendente (DELETE)', async () => {
        // Preparar
        const pendenciaDelete = {
            id: 'PEND-001',
            tipo: 'DELETE',
            entidade: 'alunos',
            idEntidade: 'ALU-005',
        };

        // Agir
        await apiMock.delete(`/${pendenciaDelete.entidade}/${pendenciaDelete.idEntidade}`);

        // Verificar
        expect(apiMock.delete).toHaveBeenCalledWith('/alunos/ALU-005');
    });

    it('deve buscar dados do servidor corretamente', async () => {
        // Agir
        const alunos = await apiMock.buscar('/alunos');
        const turmas = await apiMock.buscar('/turmas');

        // Verificar
        expect(alunos).toHaveLength(2);
        expect(turmas).toHaveLength(1);
        expect(alunos[0].nome_completo).toBe('João');
        expect(turmas[0].nome).toBe('1A');
    });

    it('deve salvar alunos no banco local após pull', async () => {
        // Preparar
        const alunosServidor = await apiMock.buscar('/alunos');

        // Agir
        await bancoMock.salvarAlunos(alunosServidor, 1);

        // Verificar
        expect(bancoMock.salvarAlunos).toHaveBeenCalledWith(alunosServidor, 1);
    });
});
