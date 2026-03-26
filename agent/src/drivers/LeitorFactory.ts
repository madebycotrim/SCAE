/**
 * drivers/LeitorFactory.ts
 * Fábrica dinâmica para criar instâncias de leitores a partir da configuração.
 */

import { TipoLeitor, LeitorConfig, LeitorTcpConfig, ILeitor } from './ILeitor';
import { IdflexLeitor } from './IdflexLeitor';
import { AnvizLeitor } from './AnvizLeitor';
import { UsbLeitor } from './UsbLeitor';

export const LeitorFactory = {
  /** Cria um leitor robusto a partir do objeto de configuração */
  criarLeitor(cfg: LeitorConfig): ILeitor {
    switch (cfg.tipo) {
      case TipoLeitor.ID_FLEX:
        return new IdflexLeitor(cfg as LeitorTcpConfig);
      
      case TipoLeitor.ANVIZ:
        return new AnvizLeitor(cfg as LeitorTcpConfig);

      case TipoLeitor.USB_HID:
        return new UsbLeitor(cfg);

      default:
        throw new Error(`Tipo de leitor desconhecido: ${cfg.tipo}`);
    }
  }
};
