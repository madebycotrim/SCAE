import os from 'os';

/**
 * Retorna o primeiro IP IPv4 (não-localhost) encontrado na máquina do agente.
 * Usado para configurar o Monitor/Push no hardware.
 */
export function buscarIpLocal(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Pula IPv6 e endereços internos/localhost
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}
