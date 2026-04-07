/**
 * infra/stats.ts
 * Armazena temporariamente as métricas da sessão atual do agente.
 */

export interface EventoRecente {
    nome: string;
    tipo: string;
    matricula: string;
    turma?: string;
    timestamp: string;
}

class StatsManager {
    entradas = 0;
    saidas = 0;
    negados = 0;
    ultimoAcesso: string | null = null;
    ultimosEventos: EventoRecente[] = [];
    horas: number[] = new Array(24).fill(0);

    registrarAcesso(nome: string, matricula: string, tipo: string, turma?: string) {
        if (tipo === 'ENTRADA') this.entradas++;
        else if (tipo === 'SAIDA') this.saidas++;
        else if (tipo === 'NEGADO') this.negados++;

        const agoraStatus = new Date().toISOString();
        const horaLocal = new Date().getHours();
        this.horas[horaLocal]++;

        this.ultimoAcesso = new Date(agoraStatus).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        this.ultimosEventos.unshift({
            nome,
            tipo,
            matricula,
            turma,
            timestamp: agoraStatus
        });

        if (this.ultimosEventos.length > 5) this.ultimosEventos.pop();
    }

    /**
     * Sincroniza métricas com os registros físicos do banco de dados (Últimas 24 Horas)
     * Garante que o histrograma e contadores funcionem mesmo após reboot.
     */
    async sincronizarComBanco() {
        try {
            const { allSql, getSql } = require('./db');
            
            // 1. Totais das últimas 24 horas
            const totais = await getSql(`
                SELECT 
                    SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END) as ent,
                    SUM(CASE WHEN tipo = 'SAIDA' THEN 1 ELSE 0 END) as sai,
                    SUM(CASE WHEN tipo = 'NEGADO' THEN 1 ELSE 0 END) as neg
                FROM registros_acesso 
                WHERE timestamp_acesso >= datetime('now', '-24 hours', 'localtime')
            `);

            if (totais) {
                this.entradas = totais.ent || 0;
                this.saidas = totais.sai || 0;
                this.negados = totais.neg || 0;
            }

            // 2. Distribuição por hora (Últimas 24h)
            const dist: any[] = await allSql(`
                SELECT CAST(strftime('%H', timestamp_acesso) AS INTEGER) as hora, count(*) as total 
                FROM registros_acesso 
                WHERE timestamp_acesso >= datetime('now', '-24 hours', 'localtime') 
                GROUP BY hora
            `);

            this.horas.fill(0);
            dist.forEach((d: any) => {
                if (d.hora >= 0 && d.hora < 24) this.horas[d.hora] = d.total;
            });

            console.log(`[Stats] Métricas sincronizadas (Janela 24h | Total: ${this.entradas + this.saidas + this.negados})`);
        } catch (e) {
            console.error('[Stats] Falha ao sincronizar com banco:', e);
        }
    }

    obterSnapshot() {
        return {
            entradas: this.entradas,
            saidas: this.saidas,
            negados: this.negados,
            ultimoAcesso: this.ultimoAcesso,
            ultimosEventos: this.ultimosEventos,
            horas: this.horas
        };
    }
}

export const stats = new StatsManager();
