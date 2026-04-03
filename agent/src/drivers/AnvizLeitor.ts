/**
 * drivers/AnvizLeitor.ts
 * Implementação do protocolo Anviz via TCP/IP.
 */

import net from 'net';
import {
  ILeitor, EventoAcesso, DadosAluno, ResultadoCadastro,
  StatusLeitor, LeitorTcpConfig, TipoLeitor,
} from './ILeitor';

// Comandos do protocolo Anviz (CrossChex v2)
const CMD = {
  GET_INFO: 0x30,
  GET_RECORDS: 0x40,
  ADD_USER: 0x50,
  DELETE_USER: 0x54,
} as const;

export class AnvizLeitor implements ILeitor {
  readonly tipo = TipoLeitor.ANVIZ;
  private ultimoErroLogado?: string;

  constructor(private cfg: LeitorTcpConfig) {}

  get id() { return this.cfg.id; }
  get nome() { return this.cfg.nome; }

  private async enviarComando(cmd: number, payload: Buffer = Buffer.alloc(0)): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Timeout na comunicação com o leitor Anviz ${this.cfg.ip}`));
      }, 5000);

      socket.connect(this.cfg.porta, this.cfg.ip, () => {
        const deviceId = Buffer.alloc(4, 0); // Default: 0
        const len = Buffer.alloc(2);
        len.writeUInt16BE(payload.length, 0);

        const packet = Buffer.concat([
          Buffer.from([0x40]),  // STX
          deviceId,
          Buffer.from([cmd]),
          len,
          payload,
          Buffer.from([0x0D]), // ETX
        ]);
        socket.write(packet);
      });

      const chunks: Buffer[] = [];
      socket.on('data', (chunk: Buffer | string) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
        if (buf[buf.length - 1] === 0x0D) {
          clearTimeout(timeout);
          socket.destroy();
          this.ultimoErroLogado = undefined; // Sucesso, limpa estado de erro
          resolve(Buffer.concat(chunks));
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.enviarComando(CMD.GET_INFO);
      return true;
    } catch { return false; }
  }

  async status(): Promise<StatusLeitor> {
    try {
      const resp = await this.enviarComando(CMD.GET_INFO);
      return {
        online: true,
        modelo: 'Anviz CrossChex',
        totalUsuarios: resp.length > 9 ? resp.readUInt16BE(8) : undefined,
      };
    } catch {
      return { online: false };
    }
  }

  async buscarEventos(ultimoId = '0'): Promise<EventoAcesso[]> {
    try {
      const payload = Buffer.alloc(4);
      payload.writeUInt32BE(parseInt(ultimoId, 10), 0);
      const resp = await this.enviarComando(CMD.GET_RECORDS, payload);

      const eventos: EventoAcesso[] = [];
      const RECORD_SIZE = 14;
      const dataStart = 8;

      for (let i = dataStart; i + RECORD_SIZE <= resp.length - 1; i += RECORD_SIZE) {
        const userId = resp.readUInt32BE(i).toString();
        const timestamp = this.parsearTimestamp(resp, i + 4);
        const tipoEvento = resp[i + 10]; // 0=Entrada, 1=Saída

        eventos.push({
          id: String(i),
          idUsuario: userId,
          timestamp,
          tipo: tipoEvento === 1 ? 'SAIDA' : 'ENTRADA',
          autorizado: true,
          leitorId: this.id
        });
      }

      return eventos;
    } catch (e: any) {
      const msgErro = (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.message?.includes('Timeout'))
        ? `Equipamento desconectado ou IP ${this.cfg.ip} inacessível.`
        : `Erro no Anviz ${this.cfg.ip}: ${e.message}`;

      if (msgErro !== this.ultimoErroLogado) {
        console.warn(`[Agente][${this.id}] ${msgErro}`);
        this.ultimoErroLogado = msgErro;
      }
      return [];
    }
  }

  async cadastrarAluno(aluno: DadosAluno): Promise<ResultadoCadastro> {
    try {
      const idInterno = aluno.idInterno ?? parseInt(aluno.matricula.replace(/\D/g, '').slice(-8), 10);
      const payload = Buffer.alloc(24, 0);
      payload.writeUInt32BE(idInterno, 0);
      Buffer.from(aluno.nomeCompleto.slice(0, 20), 'utf-8').copy(payload, 4);

      await this.enviarComando(CMD.ADD_USER, payload);
      return { ok: true, idInterno };
    } catch (e: any) {
      return { ok: false, erro: e.message };
    }
  }

  async removerAluno(matricula: string): Promise<boolean> {
    try {
      const idInterno = parseInt(matricula.replace(/\D/g, '').slice(-8), 10);
      const payload = Buffer.alloc(4);
      payload.writeUInt32BE(idInterno, 0);
      await this.enviarComando(CMD.DELETE_USER, payload);
      return true;
    } catch { return false; }
  }

  private parsearTimestamp(buf: Buffer, offset: number): Date {
    const bcd = (byte: number) => (byte >> 4) * 10 + (byte & 0x0F);
    const ano = 2000 + bcd(buf[offset]);
    const mes = bcd(buf[offset + 1]) - 1;
    const dia = bcd(buf[offset + 2]);
    const hora = bcd(buf[offset + 3]);
    const min = bcd(buf[offset + 4]);
    const seg = bcd(buf[offset + 5]);
    return new Date(ano, mes, dia, hora, min, seg);
  }

  async abrirPorta(): Promise<boolean> {
    // Protocolo Anviz varia muito para abertura remota, implementamos falso por padrão
    console.warn(`[Anviz][${this.id}] Abertura remota não suportada neste driver.`);
    return false;
  }
}

