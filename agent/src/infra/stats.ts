/**
 * infra/stats.ts
 * Armazena temporariamente as métricas da sessão atual do agente.
 */

export interface EventoRecente {
    nome: string;
    tipo: string;
    matricula: string;
    timestamp: string;
}

class StatsManager {
    entradas = 0;
    saidas = 0;
    negados = 0;
    ultimoAcesso: string | null = null;
    ultimosEventos: EventoRecente[] = [];

    registrarAcesso(nome: string, matricula: string, tipo: string) {
        if (tipo === 'ENTRADA') this.entradas++;
        else if (tipo === 'SAIDA') this.saidas++;
        else if (tipo === 'NEGADO') this.negados++;

        const agora = new Date().toISOString();
        this.ultimoAcesso = new Date(agora).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        
        this.ultimosEventos.unshift({
            nome,
            tipo,
            matricula,
            timestamp: agora
        });

        // Mantém apenas os últimos 5
        if (this.ultimosEventos.length > 5) {
            this.ultimosEventos.pop();
        }
    }

    obterSnapshot() {
        return {
            entradas: this.entradas,
            saidas: this.saidas,
            negados: this.negados,
            ultimoAcesso: this.ultimoAcesso,
            ultimosEventos: this.ultimosEventos
        };
    }
}

export const stats = new StatsManager();
