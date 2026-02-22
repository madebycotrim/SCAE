import { openDB } from 'idb';

const NOME_BANCO = 'SCAE_DB';
const VERSAO_BANCO = 10; // v10: Index Sincronizado Logs

export const iniciarBanco = async () => {
    return openDB(NOME_BANCO, VERSAO_BANCO, {
        upgrade(banco, oldVersion, newVersion, transaction) {

            // --- 1. Turmas ---
            if (!banco.objectStoreNames.contains('turmas')) {
                const store = banco.createObjectStore('turmas', { keyPath: 'id' });
                store.createIndex('ano_letivo', 'ano_letivo');
                store.createIndex('serie', 'serie');
                store.createIndex('turno', 'turno');
                store.createIndex('sala', 'sala');
            } else {
                const store = transaction.objectStore('turmas');
                if (!store.indexNames.contains('ano_letivo')) store.createIndex('ano_letivo', 'ano_letivo');
                if (!store.indexNames.contains('serie')) store.createIndex('serie', 'serie');
                if (!store.indexNames.contains('turno')) store.createIndex('turno', 'turno');
                if (!store.indexNames.contains('sala')) store.createIndex('sala', 'sala');
            }

            // --- 2. Alunos ---
            if (!banco.objectStoreNames.contains('alunos')) {
                const store = banco.createObjectStore('alunos', { keyPath: 'matricula' });
                store.createIndex('turma_id', 'turma_id');
                store.createIndex('status', 'status');
                store.createIndex('sincronizado', 'sincronizado');
            } else {
                const store = transaction.objectStore('alunos');
                if (!store.indexNames.contains('turma_id')) store.createIndex('turma_id', 'turma_id');
                if (!store.indexNames.contains('status')) store.createIndex('status', 'status');
                if (!store.indexNames.contains('sincronizado')) store.createIndex('sincronizado', 'sincronizado');
            }

            // --- 3. Registros de Acesso ---
            if (!banco.objectStoreNames.contains('registros_acesso')) {
                const store = banco.createObjectStore('registros_acesso', { keyPath: 'id' });
                store.createIndex('aluno_matricula', 'aluno_matricula');
                store.createIndex('tipo_movimentacao', 'tipo_movimentacao');
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('sincronizado', 'sincronizado');
            } else {
                const store = transaction.objectStore('registros_acesso');
                if (!store.indexNames.contains('aluno_matricula')) store.createIndex('aluno_matricula', 'aluno_matricula');
                if (!store.indexNames.contains('tipo_movimentacao')) store.createIndex('tipo_movimentacao', 'tipo_movimentacao');
                if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
                if (!store.indexNames.contains('sincronizado')) store.createIndex('sincronizado', 'sincronizado');
            }

            // --- 4. Fila de Pendências ---
            if (!banco.objectStoreNames.contains('fila_pendencias')) {
                const store = banco.createObjectStore('fila_pendencias', { keyPath: 'id' });
                store.createIndex('colecao', 'colecao');
                store.createIndex('timestamp', 'timestamp');
            } else {
                const store = transaction.objectStore('fila_pendencias');
                if (!store.indexNames.contains('colecao')) store.createIndex('colecao', 'colecao');
                if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
            }

            // --- 5. Logs de Auditoria ---
            if (!banco.objectStoreNames.contains('logs_auditoria')) {
                const store = banco.createObjectStore('logs_auditoria', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('usuario_email', 'usuario_email');
                store.createIndex('acao', 'acao');
                store.createIndex('entidade_tipo', 'entidade_tipo');
                store.createIndex('entidade_id', 'entidade_id');
                store.createIndex('sincronizado', 'sincronizado');
            } else {
                const store = transaction.objectStore('logs_auditoria');
                if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
                if (!store.indexNames.contains('usuario_email')) store.createIndex('usuario_email', 'usuario_email');
                if (!store.indexNames.contains('acao')) store.createIndex('acao', 'acao');
                if (!store.indexNames.contains('entidade_tipo')) store.createIndex('entidade_tipo', 'entidade_tipo');
                if (!store.indexNames.contains('entidade_id')) store.createIndex('entidade_id', 'entidade_id');
                if (!store.indexNames.contains('sincronizado')) store.createIndex('sincronizado', 'sincronizado');
            }

            // --- 6. Usuários ---
            if (!banco.objectStoreNames.contains('usuarios')) {
                const store = banco.createObjectStore('usuarios', { keyPath: 'email' });
                store.createIndex('papel', 'papel');
                store.createIndex('ativo', 'ativo');
            } else {
                const store = transaction.objectStore('usuarios');
                if (!store.indexNames.contains('papel')) store.createIndex('papel', 'papel');
                if (!store.indexNames.contains('ativo')) store.createIndex('ativo', 'ativo');
            }
        },
    });
};

export const bancoLocal = {
    iniciarBanco,

    // --- Fila de Pendências (Offline Support) ---
    adicionarPendencia: async (acao, colecao, dadoId, dadosExtras = null) => {
        const banco = await iniciarBanco();
        await banco.put('fila_pendencias', {
            id: crypto.randomUUID(),
            acao, // 'DELETE', 'UPDATE', 'CREATE'
            colecao, // 'alunos', 'turmas'
            dado_id: dadoId,
            dados_extras: dadosExtras,
            timestamp: new Date().toISOString()
        });
    },

    listarPendencias: async () => {
        const banco = await iniciarBanco();
        return await banco.getAllFromIndex('fila_pendencias', 'timestamp');
    },

    removerPendencia: async (id) => {
        const banco = await iniciarBanco();
        await banco.delete('fila_pendencias', id);
    },

    // --- Alunos ---
    salvarAlunos: async (alunos, sincronizado = 1) => {
        const banco = await iniciarBanco();
        const transacao = banco.transaction('alunos', 'readwrite');

        // Se sincronizado=1 (vindo da API), substituir tudo (Server Truth)
        // MAS preservar quem tem sincronizado=0 (criado offline)
        if (sincronizado === 1) {
            const locais = await transacao.store.getAll();
            const pendentes = locais.filter(a => a.sincronizado === 0);

            await transacao.store.clear();

            // Re-inserir pendentes
            for (const p of pendentes) {
                await transacao.store.put(p);
            }
        }

        // Inserir novos/atualizados
        for (const aluno of alunos) {
            await transacao.store.put({ ...aluno, sincronizado }); // 1 ou 0
        }

        await transacao.done;
    },

    // Salvar um único aluno (uso local/offline)
    salvarAluno: async (aluno) => {
        const banco = await iniciarBanco();
        await banco.put('alunos', { ...aluno, sincronizado: 0 }); // Marca como pendente
    },

    deletarAluno: async (matricula) => {
        const banco = await iniciarBanco();
        await banco.delete('alunos', matricula);
    },

    // --- Turmas ---
    salvarTurmas: async (turmas, sincronizado = 1) => {
        const banco = await iniciarBanco();
        const transacao = banco.transaction('turmas', 'readwrite');

        if (sincronizado === 1) {
            const locais = await transacao.store.getAll();
            const pendentes = locais.filter(t => t.sincronizado === 0);

            await transacao.store.clear();

            for (const p of pendentes) {
                await transacao.store.put(p);
            }
        }

        for (const t of turmas) {
            await transacao.store.put({ ...t, sincronizado });
        }
        await transacao.done;
    },

    importarAlunos: async (novosAlunos) => {
        const banco = await iniciarBanco();
        const transacao = banco.transaction('alunos', 'readwrite');
        await Promise.all([
            ...novosAlunos.map(aluno => transacao.store.put({ ...aluno, sincronizado: 0 }))
        ]);
        await transacao.done;
    },

    buscarAluno: async (matricula) => {
        const banco = await iniciarBanco();
        return await banco.get('alunos', matricula);
    },

    buscarAlunosPorNome: async (termo) => {
        const banco = await iniciarBanco();
        const todosAlunos = await banco.getAll('alunos');

        // Busca case-insensitive
        const termoLower = termo.toLowerCase().trim();

        if (!termoLower) return [];

        // Filtrar alunos que contenham o termo no nome
        const resultados = todosAlunos.filter(aluno =>
            aluno.nome_completo.toLowerCase().includes(termoLower)
        );

        // Ordenar por relevância (nome começa com o termo primeiro)
        resultados.sort((a, b) => {
            const aNomeStart = a.nome_completo.toLowerCase().startsWith(termoLower);
            const bNomeStart = b.nome_completo.toLowerCase().startsWith(termoLower);

            if (aNomeStart && !bNomeStart) return -1;
            if (!aNomeStart && bNomeStart) return 1;
            return a.nome_completo.localeCompare(b.nome_completo);
        });

        // Limitar a 10 resultados
        return resultados.slice(0, 10);
    },

    contarAlunos: async () => {
        const banco = await iniciarBanco();
        return await banco.count('alunos');
    },

    contarAlunosPorTurma: async (turmaId) => {
        const banco = await iniciarBanco();
        // countFromIndex é muito mais rápido que getAll + filter
        return await banco.countFromIndex('alunos', 'turma_id', turmaId);
    },

    // Registros
    salvarRegistro: async (registro) => {
        const banco = await iniciarBanco();
        // Usar 0 para false, 1 para true para indexação robusta
        await banco.put('registros_acesso', { ...registro, sincronizado: 0 });
    },

    listarRegistrosPendentes: async () => {
        const banco = await iniciarBanco();
        // 0 = false
        return await banco.getAllFromIndex('registros_acesso', 'sincronizado', 0);
    },

    marcarComoSincronizado: async (ids) => {
        const banco = await iniciarBanco();
        const transacao = banco.transaction('registros_acesso', 'readwrite');
        for (const id of ids) {
            const registro = await transacao.store.get(id);
            if (registro) {
                registro.sincronizado = 1;
                await transacao.store.put(registro);
            }
        }
        await transacao.done;
    },

    // v2.5 - Evacuação e Painel (OTIMIZADO)
    listarAlunosPresentes: async () => {
        const banco = await iniciarBanco();

        // Otimização: Buscar apenas registros de "hoje" usando índice
        // Isso evita ler todo o histórico de acessos (milhares de registros)
        const inicioDoDia = new Date();
        inicioDoDia.setHours(0, 0, 0, 0);
        const range = IDBKeyRange.lowerBound(inicioDoDia.toISOString());

        const registrosHoje = await banco.getAllFromIndex('registros_acesso', 'timestamp', range);

        // Se não houver registros hoje, retorna vazio rápido
        if (registrosHoje.length === 0) return [];

        const alunos = await banco.getAll('alunos');
        const mapaAlunos = new Map(alunos.map(a => [a.matricula, a]));

        // Agrupar registros por matrícula para encontrar o último movimento
        const ultimosMovimentos = {};

        registrosHoje.forEach(registro => {
            const matricula = registro.aluno_matricula;
            if (!ultimosMovimentos[matricula] || new Date(registro.timestamp) > new Date(ultimosMovimentos[matricula].timestamp)) {
                ultimosMovimentos[matricula] = registro;
            }
        });

        // Filtrar apenas quem teve ENTRADA como último movimento
        return Object.values(ultimosMovimentos)
            .filter(r => r.tipo_movimentacao === 'ENTRADA')
            .map(r => {
                const infoAluno = mapaAlunos.get(r.aluno_matricula) || { nome_completo: 'Desconhecido', turma_id: '?' };
                return {
                    ...r,
                    nome_completo: infoAluno.nome_completo,
                    turma_id: infoAluno.turma_id,
                    matricula: r.aluno_matricula
                };
            });
    },

    // --- Usuários e Permissões ---
    listarUsuarios: async () => {
        const banco = await iniciarBanco();
        return await banco.getAll('usuarios');
    },

    salvarUsuario: async (usuario) => {
        const banco = await iniciarBanco();
        await banco.put('usuarios', {
            ...usuario,
            atualizado_em: new Date().toISOString()
        });
    },

    deletarUsuario: async (email) => {
        const banco = await iniciarBanco();
        await banco.delete('usuarios', email);
    },

    // --- Logs ---
    listarLogs: async () => {
        const banco = await iniciarBanco();
        // Verifica se a store existe antes de tentar acessar para evitar crash
        if (banco.objectStoreNames.contains('logs_auditoria')) {
            return await banco.getAll('logs_auditoria');
        }
        return [];
    },

    listarLogsPendentes: async () => {
        const banco = await iniciarBanco();
        if (banco.objectStoreNames.contains('logs_auditoria')) {
            return await banco.getAllFromIndex('logs_auditoria', 'sincronizado', 0);
        }
        return [];
    },

    marcarLogsComoSincronizados: async (ids) => {
        const banco = await iniciarBanco();
        const transacao = banco.transaction('logs_auditoria', 'readwrite');
        for (const id of ids) {
            const log = await transacao.store.get(id);
            if (log) {
                log.sincronizado = 1;
                await transacao.store.put(log);
            }
        }
        await transacao.done;
    },

    // --- Dashboard & Analytics (Optimized) ---
    obterRegistrosPeriodo: async (dataInicio, dataFim) => {
        const banco = await iniciarBanco();
        // Garante que as datas estao em formato ISO string para comparacao correta no IDB
        const range = IDBKeyRange.bound(dataInicio.toISOString(), dataFim.toISOString());
        return await banco.getAllFromIndex('registros_acesso', 'timestamp', range);
    },

    obterDadosDashboard: async () => {
        const banco = await iniciarBanco();
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1); // 1o dia do mes atual

        // Se precisar de mais histórico para gráficos (ex: ultimos 30 dias corridos)
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        const range = IDBKeyRange.lowerBound(trintaDiasAtras.toISOString());

        const [alunos, turmas, registrosRecentes, logs] = await Promise.all([
            banco.getAll('alunos'),
            banco.getAll('turmas'),
            banco.getAllFromIndex('registros_acesso', 'timestamp', range),
            banco.getAll('logs_auditoria') // Logs geralmente sao poucos, mas ideal seria paginar
        ]);

        return {
            alunos,
            turmas,
            registros: registrosRecentes,
            logs
        };
    }
};
