import { api } from '@/compartilhado/servicos/api';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { agenteServico } from '@/compartilhado/servicos/agente.servico';

const log = criarRegistrador('DashboardServico');

export const dashboardServico = {
    async obterEstatisticas() {
        try {
            // 🚀 Dimensão 2 Otimizada: Endpoint com Data Aggregation via D1 Batching (Zero N+1)
            return await api.obter<any>('/admin/dashboard');
        } catch (erro) {
            log.error('Erro ao buscar estatísticas do dashboard online', erro);
            throw erro;
        }
    },

    async buscarRegistrosRecentes(desde?: string) {
        try {
            // 🚀 ESTRATÉGIA HÍBRIDA: Tenta Nuvem e Agente Local simultaneamente
            const [nuvem, local] = await Promise.all([
                (async () => {
                    // Limite um pouco menor (30) para maior estabilidade no SQL da nuvem
                    // Sanitização rigorosa: Remove o 'Z' e garante formato compatível
                    let valorDesde = '';
                    if (desde && desde !== 'undefined' && String(desde).length > 10) {
                        try {
                            // Converte para ISO e limpa (remove Z e o que houver após)
                            const dataLimpa = new Date(desde).toISOString().split('.')[0].replace('Z', '');
                            valorDesde = `&desde=${encodeURIComponent(dataLimpa)}`;
                        } catch (e) {
                            valorDesde = '';
                        }
                    }
                    const url = `/acesso/registros?limite=30${valorDesde}`;
                    
                    return await api.obter<any[]>(url).catch((e) => {
                        console.warn('[Radar] Nuvem Offline ou Erro:', e.message);
                        return [];
                    });
                })(),
                (async () => {
                    try {
                        const logs = await agenteServico.obterRegistrosRecentes(desde);
                        return Array.isArray(logs) ? logs : [];
                    } catch (e) {
                        console.warn('[Radar] Agente Local inacessível.');
                        return [];
                    }
                })()
            ]);

            const mapa = new Map<string, any>();
            
            const resolverId = (r: any) => {
                const idOriginal = r.id || r.id_acesso;
                if (idOriginal && String(idOriginal).trim() !== '') return String(idOriginal);
                
                const m = r.aluno_matricula || r.matricula;
                const t = r.timestamp || r.timestamp_acesso;
                if (m && t) return `radar-${m}-${t}`;
                
                return null; // ID inválido
            };

            // Processa Nuvem
            if (Array.isArray(nuvem)) {
                nuvem.forEach(r => {
                    const id = resolverId(r);
                    if (id) mapa.set(id, { ...r, id, fonte: 'nuvem' });
                });
            }
            
            // Processa Local
            if (Array.isArray(local)) {
                local.forEach(r => {
                    const reg = {
                        ...r,
                        aluno_matricula: r.aluno_matricula || r.matricula,
                        aluno_nome: r.aluno_nome || r.nome,
                        tipo_movimentacao: r.tipo_movimentacao || r.tipo,
                        timestamp: r.timestamp || r.timestamp_acesso,
                    };
                    const id = resolverId(reg);
                    if (id) mapa.set(id, { ...reg, id, fonte: 'agente' });
                });
            }

            // Normalização final, Filtro de segurança e Ordenação
            const final = Array.from(mapa.values())
                .filter(r => r.id && String(r.id).trim() !== '') // GARANTIA TOTAL contra chaves vazias
                .map(r => ({
                    ...r,
                    aluno_matricula: r.aluno_matricula || '---',
                    aluno_nome: r.aluno_nome || 'Acesso Identificado',
                    tipo_movimentacao: r.tipo_movimentacao || 'ENTRADA',
                    timestamp: r.timestamp || new Date().toISOString()
                }))
                .sort((a, b) => {
                    const valA = new Date(a.timestamp).getTime() || 0;
                    const valB = new Date(b.timestamp).getTime() || 0;
                    return valB - valA;
                })
                .slice(0, 100);

            return final;

        } catch (erro) {
            console.error('[DashboardServico] Erro crítico na busca híbrida:', erro);
            return [];
        }
    },

    async limparHistorico() {
        try {
            return await api.remover('/acesso/registros');
        } catch (erro) {
            log.error('Erro ao limpar histórico', erro);
            throw erro;
        }
    }
};
