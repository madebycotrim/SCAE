/**
 * drivers/LeitorFactory.ts
 * Fábrica estrita para criar instâncias do iDFlex.
 */

import { TipoLeitor, LeitorConfig, LeitorTcpConfig, ILeitor } from './ILeitor';
import { IdflexLeitor } from './IdflexLeitor';

export const LeitorFactory = {
  /** Cria um leitor a partir do objeto de configuração */
  criarLeitor(cfg: LeitorConfig): ILeitor {
    switch (cfg.tipo) {
      case TipoLeitor.ID_FLEX:
      case TipoLeitor.ID_NANO:
        return new IdflexLeitor(cfg as LeitorTcpConfig);
      
      default:
        throw new Error(`Tipo de leitor desconhecido ou não suportado: ${cfg.tipo}`);
    }
  }
};

