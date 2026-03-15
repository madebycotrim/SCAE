/**
 * Utilitário de Cache (Cloudflare KV) para o SCAE.
 * Centraliza as operações de leitura e escrita no KV_SCAE.
 */

import type { AmbienteSCAE } from '../../tipos/ambiente';

export class ServicoCache {
    private static PREFIXO_SLUG = 'slug:';
    private static PREFIXO_CONFIG = 'config:';
    private static PREFIXO_PUBKEY = 'pubkey:';
    private static PREFIXO_COR_DIA = 'cor_dia:';
    private static PREFIXO_FEATURES = 'features:';
    private static PREFIXO_DOMINIOS = 'dominios:';

    /**
     * 1. Roteamento de Escolas (Slug -> ID)
     */
    static async buscarIdPorSlug(slug: string, env: AmbienteSCAE): Promise<string | null> {
        const chave = `${this.PREFIXO_SLUG}${slug}`;
        
        let idEscola = await env.KV_SCAE.get(chave);
        if (idEscola) return idEscola;

        const escola = await env.DB_SCAE.prepare(
            "SELECT id FROM escolas WHERE slug = ?"
        ).bind(slug).first<{ id: string }>();

        if (escola) {
            await env.KV_SCAE.put(chave, escola.id, { expirationTtl: 86400 });
            return escola.id;
        }

        return null;
    }

    /**
     * 2. Branding e Identidade Visual (UI Instantânea)
     */
    static async buscarConfiguracoes(escolaId: string, env: AmbienteSCAE): Promise<any | null> {
        const chave = `${this.PREFIXO_CONFIG}${escolaId}`;
        
        const configs = await env.KV_SCAE.get(chave, 'json');
        if (configs) return configs;

        const escola = await env.DB_SCAE.prepare(
            "SELECT nome_escola, cor_primaria, logo_url, tts_ativado FROM escolas WHERE id = ?"
        ).bind(escolaId).first<{ nome_escola: string, cor_primaria: string, logo_url: string, tts_ativado: number }>();

        if (escola) {
            const dadosCache = {
                cor_primaria: escola.cor_primaria,
                logo_url: escola.logo_url,
                nome_fantasia: escola.nome_escola,
                tts_ativado: escola.tts_ativado
            };
            await env.KV_SCAE.put(chave, JSON.stringify(dadosCache), { expirationTtl: 86400 });
            return dadosCache;
        }

        return null;
    }

    /**
     * 3. Validação de QR Codes (Chave Pública)
     */
    static async buscarPubKey(escolaId: string, env: AmbienteSCAE): Promise<string | null> {
        const chave = `${this.PREFIXO_PUBKEY}${escolaId}`;
        
        const cached = await env.KV_SCAE.get(chave);
        if (cached) return cached;

        const escola = await env.DB_SCAE.prepare(
            "SELECT chave_publica_ecdsa FROM escolas WHERE id = ?"
        ).bind(escolaId).first<{ chave_publica_ecdsa: string }>();

        if (escola?.chave_publica_ecdsa) {
            await env.KV_SCAE.put(chave, escola.chave_publica_ecdsa); // Sem expiração (muda raramente)
            return escola.chave_publica_ecdsa;
        }

        return null;
    }

    /**
     * 4. Sincronização da "Cor do Dia"
     */
    static async obterCorSincronizada(escolaId: string, env: AmbienteSCAE): Promise<string> {
        const hoje = new Date().toISOString().split('T')[0];
        const chave = `${this.PREFIXO_COR_DIA}${escolaId}:${hoje}`;
        
        const corCache = await env.KV_SCAE.get(chave);
        if (corCache) return corCache;

        const seed = `${escolaId}-${hoje}`;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const paleta = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#a855f7', '#f97316'];
        const corGerada = paleta[Math.abs(hash) % paleta.length];

        await env.KV_SCAE.put(chave, corGerada, { expirationTtl: 86400 });
        return corGerada;
    }

    /**
     * 5. Controle de Funcionalidades (Feature Flags)
     */
    static async buscarFeatureFlags(escolaId: string, env: AmbienteSCAE): Promise<any> {
        const chave = `${this.PREFIXO_FEATURES}${escolaId}`;
        
        const flags = await env.KV_SCAE.get(chave, 'json');
        if (flags) return flags;

        // Fallback: Default flags se não estiver no KV
        const defaultFlags = { evasao_ativa: true, manutencao_portaria: false };
        await env.KV_SCAE.put(chave, JSON.stringify(defaultFlags), { expirationTtl: 3600 });
        return defaultFlags;
    }

    /**
     * 6. Whitelist de Domínios de Email
     */
    static async buscarDominios(escolaId: string, env: AmbienteSCAE): Promise<string[]> {
        const chave = `${this.PREFIXO_DOMINIOS}${escolaId}`;
        
        const dominios = await env.KV_SCAE.get(chave, 'json') as string[];
        if (dominios) return dominios;

        const escola = await env.DB_SCAE.prepare(
            "SELECT dominio_email FROM escolas WHERE id = ?"
        ).bind(escolaId).first<{ dominio_email: string }>();

        const lista = escola?.dominio_email ? [escola.dominio_email] : [];
        if (escola?.dominio_email === 'se.df.gov.br') {
            lista.push('edu.se.df.gov.br');
        }

        await env.KV_SCAE.put(chave, JSON.stringify(lista), { expirationTtl: 86400 });
        return lista;
    }
}
