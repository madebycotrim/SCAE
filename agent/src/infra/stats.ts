/**
 * infra/stats.ts
 * Armazena temporariamente as métricas da sessão atual do agente.
 */

export interface EventoRecente {
    nome: string;
    tipo: string;
    timestamp: string;
}

class StatsManager {
    entradas = 0;
    saidas = 0;
    negados = 0;
    ultimoAcesso: string | null = null;
    ultimosEventos: EventoRecente[] = [];

    registrarAcesso(nome: string, tipo: string) {
        if (tipo === 'ENTRADA') this.entradas++;
        else if (tipo === 'SAIDA') this.saidas++;
        else if (tipo === 'NEGADO') this.negados++;

        this.ultimoAcesso = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        this.ultimosEventos.unshift({
            nome,
            tipo,
            timestamp: this.ultimoAcesso
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
