import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import { QrCode, Printer, Download, User, Fingerprint, ShieldCheck, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/UI';
import { QRCodeCanvas } from 'qrcode.react';
import { Aluno } from '../tipos/academico';
import { usarEscola } from '@/escola/ProvedorEscola';
import { api } from '@/compartilhado/servicos/api';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface CredencialModalProps {
    aluno: Aluno;
    aoFechar: () => void;
}

export default function CredencialModal({ aluno, aoFechar }: CredencialModalProps) {
    const escola = usarEscola();
    const modoDigital = escola.metodosAcesso.includes('DIGITAL');
    
    // Estados para Biometria
    const [statusBio, setStatusBio] = useState<'VERIFICANDO' | 'CADASTRADO' | 'PENDENTE' | 'ERRO_AGENTE' | 'HARDWARE_OFFLINE'>('VERIFICANDO');
    const [carregandoBio, setCarregandoBio] = useState(false);

    const verificarBiometria = async () => {
        if (!modoDigital) return;
        
        try {
            setStatusBio('VERIFICANDO');
            const res = await fetch(`http://127.0.0.1:1912/biometria/status?matricula=${aluno.matricula}`);

            if (res.ok) {
                const dados = await res.json();
                if (dados.ok) {
                    if (dados.leitoresAtivos === 0) {
                        setStatusBio('HARDWARE_OFFLINE');
                    } else {
                        setStatusBio(dados.cadastrado ? 'CADASTRADO' : 'PENDENTE');
                    }
                } else {
                    throw new Error();
                }
            } else {
                throw new Error();
            }
        } catch (e) {
            setStatusBio('ERRO_AGENTE');
        }
    };

    const iniciarCadastro = async () => {
        const toastId = toast.loading(`Aguardando digital de ${aluno.nome_completo.split(' ')[0]} no leitor...`);
        try {
            setCarregandoBio(true);
            const res = await fetch(`http://127.0.0.1:1912/enroll`, { 
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ aluno_id: aluno.matricula })
            });
            
            const data = await res.json();
            
            if (data.ok) {
                // Notifica a Nuvem para marcar o aluno como cadastrado
                try {
                    await api.enviar('/agente/confirmar-biometria', { matricula: aluno.matricula });
                    toast.success('Digital vinculada e salva na nuvem!', { id: toastId });
                    setStatusBio('CADASTRADO');
                    // Pequeno delay para atualizar a UI
                    setTimeout(verificarBiometria, 1000);
                } catch (errCloud: any) {
                    toast.error(`Capturada, mas erro na nuvem: ${errCloud.message}`, { id: toastId });
                }
            } else {
                // Tradução amigável vinda do Agente
                const msg = data.erro || 'Falha na captura física.';
                
                if (msg.toLowerCase().includes('cadastrada') || msg.toLowerCase().includes('already')) {
                    toast.error(msg, { id: toastId, duration: 5000 });
                } else {
                    toast.error(msg, { id: toastId });
                }

                // Se for um erro crítico de hardware ou conexão, atualiza o status visual
                if (msg.includes('não detectado') || msg.includes('conexão')) {
                    setStatusBio('ERRO_AGENTE');
                }
            }
        } catch (e) {
            toast.error('Erro de conexão com o Agente local.', { id: toastId });
        } finally {
            setCarregandoBio(false);
        }
    };

    useEffect(() => {
        verificarBiometria();
    }, [aluno.matricula]);

    // Payload básico para o QR Code
    const qrPayload = JSON.stringify({
        m: aluno.matricula,
        e: escola.id,
        v: 1
    });

    const handleImprimir = () => {
        window.print();
    };

    return (
        <>
            <ModalUniversal
                titulo={modoDigital ? "Gerenciar Biometria" : "Credencial de Acesso"}
                subtitulo={modoDigital ? "Sincronização com hardware institucional" : "Identidade digital para validação institucional"}
                icone={modoDigital ? Fingerprint : QrCode}
                aoFechar={aoFechar}
                tamanho="sm"
            >
                <div className="flex flex-col items-center space-y-8 py-2">
                    
                    {!modoDigital ? (
                        /* MODO QR CODE (PADRÃO) */
                        <div id="area-impressao-credencial" className="relative group p-6 bg-white border border-slate-200 rounded-2xl shadow-suave flex flex-col items-center w-full max-w-[300px]">
                            {/* Cabeçalho da Escola */}
                            <div className="w-full flex justify-center items-center mb-6">
                                <div className="flex items-center gap-3">
                                    {escola.logoUrl ? (
                                        <img src={escola.logoUrl} alt="Logo Escola" className="w-8 h-8 object-contain" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-800 border border-slate-200">
                                            {escola.nomeEscola.substring(0, 1)}
                                        </div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{escola.nomeEscola}</span>
                                </div>
                            </div>

                            <div className="w-48 h-48 flex items-center justify-center overflow-hidden relative">
                                <QRCodeCanvas value={qrPayload} size={180} level="H" includeMargin={false} />
                            </div>

                            <div className="mt-6 text-center w-full">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1 truncate px-2">{aluno.nome_completo}</h3>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">MAT: {aluno.matricula}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Turma: {aluno.turma_id || 'NÃO ENTURMADO'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* MODO BIOMETRIA (DIGITAL) */
                        <div className="w-full space-y-6">
                            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 shadow-sm transition-all ${
                                    statusBio === 'CADASTRADO' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 
                                    statusBio === 'HARDWARE_OFFLINE' ? 'bg-orange-50 border-orange-400 text-orange-500' :
                                    statusBio === 'ERRO_AGENTE' ? 'bg-rose-50 border-rose-300 text-rose-500' :
                                    'bg-slate-100 border-slate-200 text-slate-400'
                                }`}>
                                    {statusBio === 'VERIFICANDO' ? <Loader2 size={32} className="animate-spin" /> : 
                                     statusBio === 'CADASTRADO' ? <CheckCircle2 size={32} /> :
                                     statusBio === 'ERRO_AGENTE' ? <ShieldAlert size={32} /> :
                                     <Fingerprint size={32} />}
                                </div>
                                
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                    {statusBio === 'VERIFICANDO' ? 'Consultando Hardware...' :
                                     statusBio === 'CADASTRADO' ? 'Digital Identificada' :
                                     statusBio === 'PENDENTE' ? 'Aguardando Cadastro' :
                                     statusBio === 'HARDWARE_OFFLINE' ? 'Hardware não Detectado' :
                                     'Agente não detectado'}
                                </h3>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-2 max-w-[200px]">
                                    {statusBio === 'CADASTRADO' ? 'O aluno está pronto para acessar a unidade via biometria.' :
                                     statusBio === 'PENDENTE' ? 'Inicie o processo de captura para registrar este aluno.' :
                                     statusBio === 'HARDWARE_OFFLINE' ? 'O Agente está rodando, mas não encontrou leitores USB/IP.' :
                                     statusBio === 'ERRO_AGENTE' ? 'O Agente Catraki precisa estar rodando neste computador.' :
                                     'Consultando leitores locais...'}
                                </p>
                            </div>

                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-center">
                                <div className="w-10 h-10 bg-white rounded-xl border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                    <User size={18} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-indigo-900 uppercase truncate">{aluno.nome_completo}</span>
                                    <span className="text-[9px] font-bold text-indigo-600/60 uppercase">Matrícula: {aluno.matricula}</span>
                                </div>
                            </div>
                            
                        </div>
                    )}

                    <div className="w-full grid grid-cols-2 gap-3">
                        {modoDigital ? (
                            <>
                                <Botao variante="secundario" tamanho="lg" onClick={aoFechar}>
                                    Fechar
                                </Botao>
                                {(statusBio === 'PENDENTE' || statusBio === 'CADASTRADO') && (
                                    <Botao
                                        variante={statusBio === 'CADASTRADO' ? 'secundario' : 'primario'}
                                        tamanho="lg"
                                        icone={Fingerprint}
                                        onClick={iniciarCadastro}
                                        loading={carregandoBio}
                                    >
                                        {statusBio === 'CADASTRADO' ? 'Recadastrar' : 'Capturar'}
                                    </Botao>
                                )}
                                {statusBio === 'ERRO_AGENTE' && (
                                    <Botao variante="primario" tamanho="lg" onClick={verificarBiometria}>
                                        Reconectar
                                    </Botao>
                                )}
                            </>
                        ) : (
                            <>
                                <Botao variante="secundario" tamanho="lg" onClick={aoFechar}>
                                    Fechar
                                </Botao>
                                <Botao variante="primario" tamanho="lg" icone={Printer} onClick={handleImprimir}>
                                    Imprimir
                                </Botao>
                            </>
                        )}
                    </div>

                    {!modoDigital && (
                        <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed italic">
                            "Para alunos sem acesso à internet, imprima esta credencial e entregue ao responsável."
                        </p>
                    )}
                </div>
            </ModalUniversal>

            {/* Estilos para impressão exclusiva (modo QR) */}
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #area-impressao-credencial, #area-impressao-credencial * { visibility: visible; }
                    #area-impressao-credencial {
                        position: absolute; left: 50%; top: 20%; transform: translateX(-50%);
                        border: 1px solid #e2e8f0 !important; width: 8.5cm; height: 12cm;
                    }
                }
                `}
            </style>
        </>
    );
}
