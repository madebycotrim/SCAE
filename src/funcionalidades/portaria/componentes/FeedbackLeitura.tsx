/**
 * FeedbackLeitura â€” Overlay visual pÃ³s-leitura de QR Code.
 * Exibe feedback verde (acesso liberado) ou vermelho (acesso negado)
 * com animaÃ§Ã£o e informaÃ§Ãµes do aluno.
 */
import { ShieldCheck, UserX, Clock } from 'lucide-react';

/**
 * @param {Object} props
 * @param {Object} props.registro - Dados da Ãºltima leitura
 * @param {string} props.registro.tipo - 'SUCESSO' | 'ERRO'
 * @param {Object} [props.registro.aluno] - Dados do aluno se encontrado
 * @param {string} props.registro.mensagem - Mensagem de feedback
 * @param {string} props.registro.hora - HorÃ¡rio da leitura (HH:mm:ss)
 */
export interface RegistroLeitura {
    tipo: 'SUCESSO' | 'ERRO';
    aluno?: import('@compartilhado/types/bancoLocal.tipos').AlunoLocal | null;
    mensagem: string;
    hora: string;
}

export function FeedbackLeitura({ registro }: { registro: RegistroLeitura | null }) {
    if (!registro) return null;

    const ehSucesso = registro.tipo === 'SUCESSO';

    return (
        <div className={`
            fixed inset-0 z-50 flex items-center justify-center
            backdrop-blur-sm transition-all duration-300
            ${ehSucesso ? 'bg-emerald-900/80' : 'bg-rose-900/80'}
        `}>
            <div className="text-center animate-[scale-in_0.3s_ease-out]">
                {/* Ãcone principal */}
                <div className="p-8 rounded-full bg-white/10 backdrop-blur-sm mb-6 inline-block">
                    {ehSucesso ? (
                        <ShieldCheck size={64} className="text-emerald-300" />
                    ) : (
                        <UserX size={64} className="text-rose-300" />
                    )}
                </div>

                {/* Status */}
                <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-3">
                    {ehSucesso ? 'ACESSO PERMITIDO' : 'ACESSO NEGADO'}
                </h2>

                {/* Dados do aluno */}
                {registro.aluno && (
                    <div className="mb-4">
                        <p className="text-2xl font-bold text-white/90 mb-1">
                            {registro.aluno.nome_completo}
                        </p>
                        <p className="text-white/60 font-mono text-sm">
                            {registro.aluno.matricula} â€¢ Turma {registro.aluno.turma_id}
                        </p>
                    </div>
                )}

                {/* Mensagem */}
                <p className="text-white/70 text-lg mb-4">{registro.mensagem}</p>

                {/* HorÃ¡rio */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-mono">
                    <Clock size={14} />
                    {registro.hora}
                </div>
            </div>
        </div>
    );
}
