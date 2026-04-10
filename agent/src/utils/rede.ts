import os from 'os';

/**
 * Retorna o primeiro IP IPv4 (não-localhost) encontrado na máquina do agente.
 * Usado para configurar o Monitor/Push no hardware.
 */
export function buscarIpLocal(): string | null {
  const nets = os.networkInterfaces();
  const candidatos: string[] = [];

  for (const name of Object.keys(nets)) {
    // Ignora interfaces conhecidas por serem virtuais ou irrelevantes
    const lowerName = name.toLowerCase();
    if (lowerName.includes('docker') || lowerName.includes('vbox') || lowerName.includes('virtual') || lowerName.includes('wsl')) {
      continue;
    }

    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        candidatos.push(net.address);
      }
    }
  }

  if (candidatos.length === 0) return null;

  // 🥇 PRIORIDADE 1: Redes 192.168.x.x (Padrão Home/Office)
  const lan192 = candidatos.find(ip => ip.startsWith('192.168.'));
  if (lan192) return lan192;

  // 🥈 PRIORIDADE 2: Redes 10.x.x.x (Padrão Escolar/Enterprise)
  const lan10 = candidatos.find(ip => ip.startsWith('10.'));
  if (lan10) return lan10;

  // 🥉 ÚLTIMO CASO: Qualquer outro IP (172.x.x.x etc)
  return candidatos[0];
}
