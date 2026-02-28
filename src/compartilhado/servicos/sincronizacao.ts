import { api } from './api';
import { bancoLocal } from './bancoLocal';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import type { AlunoLocal, RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';

const log = criarRegistrador('Sync');

export const servicoSincronizacao = {
    // 1. Processar Fila de PendÃªncias (DELETE/UPDATE Offline)
    processarPendencias: async () => {
        try {
            const pendencias = await bancoLocal.listarPendencias();
            if (pendencias.length === 0) return { sucesso: true, processados: 0 };

            log.info(`Processando ${pendencias.length} pendÃªncias...`);
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
                    // Outras aÃ§Ãµes (UPDATE, CREATE) podem ser adicionadas aqui
                } catch (erroItem) {
                    log.error(`Falha ao processar pendÃªncia ${p.id}`, erroItem);
                    // NÃ£o remove da fila para tentar novamente depois
                }
            }
            return { sucesso: true, processados };
        } catch (erro) {
            log.error('Erro na fila de pendÃªncias', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarAlunos: async (forcar: boolean = false, alteracoesDetectadas: boolean = true) => {
        try {
            // 1. Processar pendÃªncias antes de puxar
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
                    log.error('Erro ao enviar aluno offline', e);
                }
            }

            // 3. Pull: Smart Check
            if (!forcar && !alteracoesDetectadas) {
                log.info('[Smart Sync] Alunos: Nenhuma alteraÃ§Ã£o remota. Pull ignorado.');
                return { sucesso: true, status: 'sem_alteracoes' };
            }

            // Baixar versÃ£o oficial do servidor
            const alunosServidor = await api.obter<AlunoLocal[]>('/alunos');

            // 4. Merge Inteligente (bancoLocal.salvarAlunos jÃ¡ preserva locais nÃ£o-sincronizados)
            await bancoLocal.salvarAlunos(alunosServidor, 1);

            log.info('Alunos sincronizados (Smart Sync):', { quantidade: alunosServidor.length });
            return { sucesso: true, quantidade: alunosServidor.length };
        } catch (erro) {
            log.error('Erro na sincronizaÃ§Ã£o de alunos', erro);
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
                const resposta = await api.enviar<Array<{ id: string; status: string }>>('/acessos', naoSincronizados);
                const idsSincronizados = resposta
                    .filter(r => r.status === 'sincronizado')
                    .map(r => r.id);

                await bancoLocal.marcarComoSincronizado(idsSincronizados);
                enviadosCount = idsSincronizados.length;
            }

            // 2. Pull (Baixar do Servidor - OTIMIZADO)
            // Baixa apenas registros de hoje para manter o banco local atualizado com eventos recentes
            // O histÃ³rico completo sÃ³ Ã© baixado na primeira instalaÃ§Ã£o ou demanda especÃ­fica
            try {
                const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const registrosServidor = await api.obter<RegistroAcessoLocal[]>(`/acessos?data=${hoje}&limite=5000`);

                const banco = await bancoLocal.iniciarBanco();
                const tx = banco.transaction('registros_acesso', 'readwrite');

                for (const r of registrosServidor) {
                    // SÃ³ salva se nÃ£o existir
                    const existente = await tx.store.get(r.id);
                    if (!existente) {
                        await tx.store.put({ ...r, sincronizado: 1 });
                    }
                }
                await tx.done;
                log.info('Registros baixados do servidor (Hoje)', { quantidade: registrosServidor.length });
            } catch (erroPull) {
                log.warn('Erro ao baixar registros (Pull)', erroPull);
                // NÃ£o falha o sync inteiro se o pull falhar, pois o push pode ter funcionado
            }

            return { sucesso: true, enviados: enviadosCount };
        } catch (erro) {
            log.error('Erro na sincronizaÃ§Ã£o de registros', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarTurmas: async (forcar: boolean = false, alteracoesDetectadas: boolean = true) => {
        try {
            const banco = await bancoLocal.iniciarBanco();

            // 1. Push: Enviar turmas criadas offline (sincronizado=0)
            const turmasLocais = await banco.getAll('turmas');
            const novas = turmasLocais.filter(t => t.sincronizado === 0);

            if (navigator.onLine && novas.length > 0) {
                log.info(`Enviando ${novas.length} turmas offline...`);
                for (const nova of novas) {
                    try {
                        const { sincronizado, ...dadosEnvio } = nova;
                        await api.enviar('/turmas', dadosEnvio);
                        await banco.put('turmas', { ...nova, sincronizado: 1 });
                    } catch (e) {
                        log.error('Erro ao enviar turma offline', e);
                    }
                }
            }

            // 2. Pull: Smart Check
            if (!forcar && !alteracoesDetectadas) {
                log.info('[Smart Sync] Turmas: Nenhuma alteraÃ§Ã£o remota. Pull ignorado.');
                return { sucesso: true, status: 'sem_alteracoes' };
            }

            const turmas = await api.obter('/turmas');
            if (Array.isArray(turmas)) {
                await bancoLocal.salvarTurmas(turmas, 1);
                log.info('Turmas sincronizadas', { quantidade: turmas.length });
                return { sucesso: true, quantidade: turmas.length };
            }
        } catch (erro) {
            log.error('Erro na sincronizaÃ§Ã£o de turmas', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarUsuarios: async () => {
        try {
            // 1. Push: Enviar usuÃ¡rios locais para o servidor
            const banco = await bancoLocal.iniciarBanco();
            const usuariosLocais = await banco.getAll('usuarios');

            if (navigator.onLine && usuariosLocais.length > 0) {
                log.info(`Enviando ${usuariosLocais.length} usuÃ¡rios locais...`);
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
                        log.warn(`Erro ao enviar usuÃ¡rio`, { email: u.email, erro: e });
                    }
                }
            }

            // 2. Pull: Baixar usuÃ¡rios do servidor
            const usuariosServidor = await api.obter('/usuarios');

            if (Array.isArray(usuariosServidor)) {
                const tx = banco.transaction('usuarios', 'readwrite');

                for (const u of usuariosServidor) {
                    await tx.store.put(u);
                }
                await tx.done;

                log.info('UsuÃ¡rios sincronizados (RBAC)', { quantidade: usuariosServidor.length });
                return { sucesso: true, quantidade: usuariosServidor.length };
            }
            return { sucesso: true, quantidade: 0 };
        } catch (erro) {
            log.error('Erro na sincronizaÃ§Ã£o de usuÃ¡rios', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    sincronizarLogsAuditoria: async () => {
        try {
            // 1. Push: Enviar logs locais
            const banco = await bancoLocal.iniciarBanco();
            const logs = await banco.getAll('logs_auditoria');

            if (navigator.onLine && logs.length > 0) {
                // Logs que ainda nÃ£o foram enviados (se houver campo sincronizado/controle)
                // Assumindo que logs locais sÃ£o sempre "novos" atÃ© serem limpos

                // Envia em batch
                try {
                    await api.enviar('/auditoria', logs);
                    // Limpar logs locais apÃ³s envio com sucesso para economizar espaÃ§o?
                    // Ou marcar como enviados.
                    // Por simplicidade, vamos limpar os que foram enviados (dado que auditoria Ã© histÃ³rico)
                    // Mas cuidado para nÃ£o perder dados se o server falhar parcialmente.

                    // EstratÃ©gia segura: Manter Ãºltimos X dias ou limpar.
                    // Aqui vamos apenas enviar.
                } catch (e) {
                    log.error('Erro ao enviar logs de auditoria', e);
                }
            }
            return { sucesso: true, quantidade: logs.length };
        } catch (erro) {
            log.error('Erro sync auditoria', erro);
            return { sucesso: false, erro: erro.message };
        }
    },

    verificarAlteracoesServidor: async () => {
        try {
            const ultimaSync = localStorage.getItem('ultima_sincronizacao');
            // Se nunca sincronizou, precisa de tudo
            if (!ultimaSync) return { alunos: true, turmas: true };

            // OtimizaÃ§Ã£o: Se faz muito pouco tempo (< 10s) desde o Ãºltimo sync, ignorar
            const diff = new Date().getTime() - new Date(ultimaSync).getTime();
            if (diff < 10000) return { alunos: false, turmas: false };

            log.debug(`Verificando logs desde ${ultimaSync}`);

            // Tenta obter logs de auditoria do servidor desde a Ãºltima sync
            // Endpoint suposto: /auditoria?desde=ISOSTRING
            // Se o backend nÃ£o suportar filtro, retornarÃ¡ array vazio ou erro, tratamos no catch
            const logs = await api.obter(`/auditoria?desde=${ultimaSync}`);

            if (!Array.isArray(logs)) {
                // Se nÃ£o retornou array, assume que nÃ£o dÃ¡ pra saber, entÃ£o forÃ§a sync
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
            log.warn('Falha ao verificar alteraÃ§Ãµes (fallback para sync total)', erro);
            return { alunos: true, turmas: true };
        }
    },

    // --- Controle de Estado Interno ---
    _sincronizando: false,

    iniciarSincronizacaoAutomatica: () => {
        // 1. Ouvinte Online/Offline
        window.addEventListener('online', () => {
            log.info('Online detectado. Iniciando sincronizaÃ§Ã£o...');
            servicoSincronizacao.sincronizarTudo();
        });

        // 2. Intervalo PeriÃ³dico (cada 5 minutos)
        // Mais frequente que isso pode sobrecarregar se houver muitos dados
        setInterval(() => {
            if (navigator.onLine) {
                log.info('Sync periÃ³dico iniciado...');
                servicoSincronizacao.sincronizarTudo();
            }
        }, 5 * 60 * 1000);

        // 3. Sync Inicial (se jÃ¡ estiver online ao carregar)
        if (navigator.onLine) {
            setTimeout(() => servicoSincronizacao.sincronizarTudo(), 5000); // Delay pequeno para nÃ£o travar boot
        }
    },

    sincronizarTudo: async (forcar: boolean = false) => {
        if (!navigator.onLine) return { sucesso: false, erro: 'Offline' };
        if (servicoSincronizacao._sincronizando) {
            log.info('Sync jÃ¡ em andamento. Ignorando solicitaÃ§Ã£o.');
            return { sucesso: false, status: 'em_andamento' };
        }

        try {
            servicoSincronizacao._sincronizando = true;
            log.info('Iniciando Smart Sync...');

            // 0. Verificar alteraÃ§Ãµes no servidor (Smart Sync)
            let alteracoes = { alunos: true, turmas: true };
            if (!forcar) {
                alteracoes = await servicoSincronizacao.verificarAlteracoesServidor();
                log.debug('DiagnÃ³stico Smart Sync', alteracoes);
            } else {
                log.info('Modo ForÃ§ado (Ignorando verificaÃ§Ã£o inteligente)');
            }

            // 1. Processar PendÃªncias CrÃ­ticas (Deletes)
            await servicoSincronizacao.processarPendencias();

            // 2. Executar Syncs em Paralelo com TolerÃ¢ncia a Falhas
            // Passamos as flags de alteraÃ§Ã£o para cada serviÃ§o
            const resultados = await Promise.allSettled([
                servicoSincronizacao.sincronizarAlunos(forcar, alteracoes.alunos),
                servicoSincronizacao.sincronizarTurmas(forcar, alteracoes.turmas),
                servicoSincronizacao.sincronizarRegistros(), // Registros tem lÃ³gica prÃ³pria de data
                servicoSincronizacao.sincronizarUsuarios(),
                servicoSincronizacao.sincronizarLogsAuditoria()
            ]);

            // Atualiza timestamp da Ãºltima sincronizaÃ§Ã£o com sucesso
            localStorage.setItem('ultima_sincronizacao', new Date().toISOString());

            // Logar resultados
            resultados.forEach((res, index) => {
                const labels = ['Alunos', 'Turmas', 'Registros', 'UsuÃ¡rios', 'Auditoria'];
                if (res.status === 'rejected') {
                    log.error(`Falha em ${labels[index]}`, res.reason);
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
            log.error('Erro crÃ­tico no Sync', erroGeral);
            return { sucesso: false, erro: erroGeral.message };
        } finally {
            servicoSincronizacao._sincronizando = false;
        }
    }
};
