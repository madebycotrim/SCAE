import { api } from './api';
import { bancoLocal } from './bancoLocal';

export const servicoSincronizacao = {
    // 1. Processar Fila de Pendências (DELETE/UPDATE Offline)
    processarPendencias: async () => {
        try {
            const pendencias = await bancoLocal.listarPendencias();
            if (pendencias.length === 0) return { sucesso: true, processados: 0 };

            console.log(`Sync: Processando ${pendencias.length} pendências...`);
            let processados = 0;

            for (const p of pendencias) {
                try {
                    if (p.acao === 'DELETE' && p.colecao === 'alunos') {
                        await api.remover(`/alunos?matricula=${p.dado_id}`);
                        await bancoLocal.removerPendencia(p.id);
                        processados++;
                    }
                    else if (p.acao === 'DELETE' && p.colecao === 'turmas') {
                        await api.remover(`/turmas?id=${p.dado_id}`);
                        await bancoLocal.removerPendencia(p.id);
                        processados++;
                    }
                    // Outras ações (UPDATE, CREATE) podem ser adicionadas aqui
                } catch (erroItem) {
                    console.error(`Falha ao processar pendência ${p.id}:`, erroItem);
                    // Não remove da fila para tentar novamente depois
                }
            }
            return { sucesso: true, processados };
        } catch (erro) {
            console.error('Erro na fila de pendências:', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarAlunos: async (forcar = false, alteracoesDetectadas = true) => {
        try {
            // 1. Processar pendências antes de puxar
            await servicoSincronizacao.processarPendencias();

            // 2. Push: Enviar alunos criados offline (sincronizado=0)
            const banco = await bancoLocal.iniciarBanco();
            const alunosLocais = await banco.getAll('alunos');
            const novos = alunosLocais.filter(a => a.sincronizado === 0);

            for (const novo of novos) {
                try {
                    // Remover campo local antes de enviar
                    const { sincronizado, ...dadosEnvio } = novo;
                    await api.enviar('/alunos', dadosEnvio);
                    // Atualizar localmente para sincronizado=1
                    await banco.put('alunos', { ...novo, sincronizado: 1 });
                } catch (e) {
                    console.error('Erro ao enviar aluno offline:', e);
                }
            }

            // 3. Pull: Smart Check
            if (!forcar && !alteracoesDetectadas) {
                console.log('[Smart Sync] Alunos: Nenhuma alteração remota. Pull ignorado.');
                return { sucesso: true, status: 'sem_alteracoes' };
            }

            // Baixar versão oficial do servidor
            const alunosServidor = await api.obter('/alunos');

            // 4. Merge Inteligente (bancoLocal.salvarAlunos já preserva locais não-sincronizados)
            await bancoLocal.salvarAlunos(alunosServidor, 1);

            console.log('Alunos sincronizados (Smart Sync):', alunosServidor.length);
            return { sucesso: true, quantidade: alunosServidor.length };
        } catch (erro) {
            console.error('Erro na sincronização de alunos:', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarRegistros: async () => {
        try {
            // 1. Push (Enviar Locais)
            const pendentes = await bancoLocal.listarRegistrosPendentes();
            const naoSincronizados = pendentes.filter(r => !r.sincronizado); // double check

            let enviadosCount = 0;
            if (naoSincronizados.length > 0) {
                const resposta = await api.enviar('/acessos', naoSincronizados);
                const idsSincronizados = resposta
                    .filter(r => r.status === 'sincronizado')
                    .map(r => r.id);

                await bancoLocal.marcarComoSincronizado(idsSincronizados);
                enviadosCount = idsSincronizados.length;
            }

            // 2. Pull (Baixar do Servidor - OTIMIZADO)
            // Baixa apenas registros de hoje para manter o banco local atualizado com eventos recentes
            // O histórico completo só é baixado na primeira instalação ou demanda específica
            try {
                const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const registrosServidor = await api.obter(`/acessos?data=${hoje}&limite=5000`);

                const banco = await bancoLocal.iniciarBanco();
                const tx = banco.transaction('registros_acesso', 'readwrite');

                for (const r of registrosServidor) {
                    // Só salva se não existir
                    const existente = await tx.store.get(r.id);
                    if (!existente) {
                        await tx.store.put({ ...r, sincronizado: 1 });
                    }
                }
                await tx.done;
                console.log('Registros baixados do servidor (Hoje):', registrosServidor.length);
            } catch (erroPull) {
                console.warn('Erro ao baixar registros (Pull):', erroPull);
                // Não falha o sync inteiro se o pull falhar, pois o push pode ter funcionado
            }

            return { sucesso: true, enviados: enviadosCount };
        } catch (erro) {
            console.error('Erro na sincronização de registros:', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarTurmas: async (forcar = false, alteracoesDetectadas = true) => {
        try {
            const banco = await bancoLocal.iniciarBanco();

            // 1. Push: Enviar turmas criadas offline (sincronizado=0)
            const turmasLocais = await banco.getAll('turmas');
            const novas = turmasLocais.filter(t => t.sincronizado === 0);

            if (navigator.onLine && novas.length > 0) {
                console.log(`[Sync] Enviando ${novas.length} turmas offline...`);
                for (const nova of novas) {
                    try {
                        const { sincronizado, ...dadosEnvio } = nova;
                        await api.enviar('/turmas', dadosEnvio);
                        await banco.put('turmas', { ...nova, sincronizado: 1 });
                    } catch (e) {
                        console.error('Erro ao enviar turma offline:', e);
                    }
                }
            }

            // 2. Pull: Smart Check
            if (!forcar && !alteracoesDetectadas) {
                console.log('[Smart Sync] Turmas: Nenhuma alteração remota. Pull ignorado.');
                return { sucesso: true, status: 'sem_alteracoes' };
            }

            const turmas = await api.obter('/turmas');
            if (Array.isArray(turmas)) {
                await bancoLocal.salvarTurmas(turmas, 1);
                console.log('Turmas sincronizadas:', turmas.length);
                return { sucesso: true, quantidade: turmas.length };
            }
        } catch (erro) {
            console.error('Erro na sincronização de turmas:', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarUsuarios: async () => {
        try {
            // 1. Push: Enviar usuários locais para o servidor
            const banco = await bancoLocal.iniciarBanco();
            const usuariosLocais = await banco.getAll('usuarios');

            if (navigator.onLine && usuariosLocais.length > 0) {
                console.log(`[Sync] Enviando ${usuariosLocais.length} usuários locais...`);
                for (const u of usuariosLocais) {
                    try {
                        // Garantir compatibilidade com schema (papel vs role)
                        // Whitelist de campos permitidos
                        const payload = {
                            email: u.email,
                            nome_completo: u.nome_completo,
                            papel: u.papel || u.role || 'VISUALIZACAO',
                            ativo: u.ativo,
                            criado_por: u.criado_por,
                            criado_em: u.criado_em,
                            atualizado_em: u.atualizado_em
                        };
                        await api.enviar('/usuarios', payload);
                    } catch (e) {
                        console.warn(`[Sync] Erro ao enviar usuário ${u.email}:`, e);
                    }
                }
            }

            // 2. Pull: Baixar usuários do servidor
            const usuariosServidor = await api.obter('/usuarios');

            if (Array.isArray(usuariosServidor)) {
                const tx = banco.transaction('usuarios', 'readwrite');

                for (const u of usuariosServidor) {
                    await tx.store.put(u);
                }
                await tx.done;

                console.log('Usuários sincronizados (RBAC):', usuariosServidor.length);
                return { sucesso: true, quantidade: usuariosServidor.length };
            }
            return { sucesso: true, quantidade: 0 };
        } catch (erro) {
            console.error('Erro na sincronização de usuários:', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarLogsAuditoria: async () => {
        try {
            // 1. Push: Enviar logs locais
            const banco = await bancoLocal.iniciarBanco();
            const logs = await banco.getAll('logs_auditoria');

            if (navigator.onLine && logs.length > 0) {
                // Logs que ainda não foram enviados (se houver campo sincronizado/controle)
                // Assumindo que logs locais são sempre "novos" até serem limpos

                // Envia em batch
                try {
                    await api.enviar('/auditoria', logs);
                    // Limpar logs locais após envio com sucesso para economizar espaço?
                    // Ou marcar como enviados.
                    // Por simplicidade, vamos limpar os que foram enviados (dado que auditoria é histórico)
                    // Mas cuidado para não perder dados se o server falhar parcialmente.

                    // Estratégia segura: Manter últimos X dias ou limpar.
                    // Aqui vamos apenas enviar.
                } catch (e) {
                    console.error('Erro ao enviar logs de auditoria:', e);
                }
            }
            return { sucesso: true, quantidade: logs.length };
        } catch (erro) {
            console.error('Erro sync auditoria:', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    verificarAlteracoesServidor: async () => {
        try {
            const ultimaSync = localStorage.getItem('ultima_sincronizacao');
            // Se nunca sincronizou, precisa de tudo
            if (!ultimaSync) return { alunos: true, turmas: true };

            // Otimização: Se faz muito pouco tempo (< 10s) desde o último sync, ignorar
            // Evita loops de sync em componentes que montam/desmontam rápido
            const diff = new Date() - new Date(ultimaSync);
            if (diff < 10000) return { alunos: false, turmas: false };

            console.log(`[Smart Sync] Verificando logs desde ${ultimaSync}`);

            // Tenta obter logs de auditoria do servidor desde a última sync
            // Endpoint suposto: /auditoria?desde=ISOSTRING
            // Se o backend não suportar filtro, retornará array vazio ou erro, tratamos no catch
            const logs = await api.obter(`/auditoria?desde=${ultimaSync}`);

            if (!Array.isArray(logs)) {
                // Se não retornou array, assume que não dá pra saber, então força sync
                return { alunos: true, turmas: true };
            }

            if (logs.length === 0) {
                return { alunos: false, turmas: false };
            }

            // Analisa logs para identificar entidades afetadas
            const alterouAlunos = logs.some(l =>
                l.entidade_tipo === 'aluno' ||
                l.colecao === 'alunos' ||
                (l.acao && l.acao.includes('ALUNO'))
            );

            const alterouTurmas = logs.some(l =>
                l.entidade_tipo === 'turma' ||
                l.colecao === 'turmas' ||
                (l.acao && l.acao.includes('TURMA'))
            );

            return {
                alunos: alterouAlunos,
                turmas: alterouTurmas,
                raw_logs: logs.length
            };

        } catch (erro) {
            console.warn('[Smart Sync] Falha ao verificar alterações (fallback para sync total):', erro);
            return { alunos: true, turmas: true };
        }
    },

    // --- Controle de Estado Interno ---
    _sincronizando: false,

    iniciarSincronizacaoAutomatica: () => {
        // 1. Ouvinte Online/Offline
        window.addEventListener('online', () => {
            console.log('Online detectado. Iniciando sincronização...');
            servicoSincronizacao.sincronizarTudo();
        });

        // 2. Intervalo Periódico (cada 5 minutos)
        // Mais frequente que isso pode sobrecarregar se houver muitos dados
        setInterval(() => {
            if (navigator.onLine) {
                console.log('Sync periódico iniciado...');
                servicoSincronizacao.sincronizarTudo();
            }
        }, 5 * 60 * 1000);

        // 3. Sync Inicial (se já estiver online ao carregar)
        if (navigator.onLine) {
            setTimeout(() => servicoSincronizacao.sincronizarTudo(), 5000); // Delay pequeno para não travar boot
        }
    },

    sincronizarTudo: async (forcar = false) => {
        if (!navigator.onLine) return { sucesso: false, erro: 'Offline' };
        if (servicoSincronizacao._sincronizando) {
            console.log('Sync já em andamento. Ignorando solicitação.');
            return { sucesso: false, status: 'em_andamento' };
        }

        try {
            servicoSincronizacao._sincronizando = true;
            console.log('Iniciando Smart Sync...');

            // 0. Verificar alterações no servidor (Smart Sync)
            let alteracoes = { alunos: true, turmas: true };
            if (!forcar) {
                alteracoes = await servicoSincronizacao.verificarAlteracoesServidor();
                console.log('[Smart Sync] Diagnóstico:', alteracoes);
            } else {
                console.log('[Smart Sync] Modo Forçado (Ignorando verificação inteligente)');
            }

            // 1. Processar Pendências Críticas (Deletes)
            await servicoSincronizacao.processarPendencias();

            // 2. Executar Syncs em Paralelo com Tolerância a Falhas
            // Passamos as flags de alteração para cada serviço
            const resultados = await Promise.allSettled([
                servicoSincronizacao.sincronizarAlunos(forcar, alteracoes.alunos),
                servicoSincronizacao.sincronizarTurmas(forcar, alteracoes.turmas),
                servicoSincronizacao.sincronizarRegistros(), // Registros tem lógica própria de data
                servicoSincronizacao.sincronizarUsuarios(),
                servicoSincronizacao.sincronizarLogsAuditoria()
            ]);

            // Atualiza timestamp da última sincronização com sucesso
            localStorage.setItem('ultima_sincronizacao', new Date().toISOString());

            // Logar resultados
            resultados.forEach((res, index) => {
                const labels = ['Alunos', 'Turmas', 'Registros', 'Usuários', 'Auditoria'];
                if (res.status === 'rejected') {
                    console.error(`Falha em ${labels[index]}:`, res.reason);
                }
            });

            return {
                alunos: resultados[0].status === 'fulfilled' ? resultados[0].value : { sucesso: false },
                turmas: resultados[1].status === 'fulfilled' ? resultados[1].value : { sucesso: false },
                registros: resultados[2].status === 'fulfilled' ? resultados[2].value : { sucesso: false },
                usuarios: resultados[3].status === 'fulfilled' ? resultados[3].value : { sucesso: false },
                auditoria: resultados[4].status === 'fulfilled' ? resultados[4].value : { sucesso: false }
            };

        } catch (erroGeral) {
            console.error('Erro crítico no Sync:', erroGeral);
            return { sucesso: false, erro: erroGeral.message };
        } finally {
            servicoSincronizacao._sincronizando = false;
        }
    }
};
