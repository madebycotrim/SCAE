import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import { QrCode, Printer, Download, User } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/UI';
import { QRCodeCanvas } from 'qrcode.react';
import { Aluno } from '../tipos/academico';
import { usarEscola } from '@/escola/ProvedorEscola';

interface CredencialModalProps {
    aluno: Aluno;
    aoFechar: () => void;
}

export default function CredencialModal({ aluno, aoFechar }: CredencialModalProps) {
    const escola = usarEscola();

    // Payload básico para o QR Code (compatível com o portal do aluno)
    // Usamos o formato simplificado se não houver assinatura disponível no front
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
                titulo="Credencial de Acesso"
                subtitulo="Identidade digital para validação institucional"
                icone={QrCode}
                aoFechar={aoFechar}
                tamanho="sm"
            >
                <div className="flex flex-col items-center space-y-8 py-2">
                    {/* Visual da Credencial - Otimizado para visualização e impressão */}
                    <div id="area-impressao-credencial" className="relative group p-6 bg-white border border-slate-200 rounded-2xl shadow-suave flex flex-col items-center w-full max-w-[300px]">
                        
                        {/* Cabeçalho da Escola no Cartão */}
                        <div className="w-full flex justify-center items-center mb-6">
                            <div className="flex items-center gap-3">
                                {escola.logoUrl ? (
                                    <img 
                                        src={escola.logoUrl} 
                                        alt="Logo Escola" 
                                        className="w-8 h-8 object-contain"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-800 border border-slate-200">
                                        {escola.nomeEscola.substring(0, 1)}
                                    </div>
                                )}
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                    {escola.nomeEscola}
                                </span>
                            </div>
                        </div>

                        <div className="w-48 h-48 flex items-center justify-center overflow-hidden relative">
                            <QRCodeCanvas 
                                value={qrPayload} 
                                size={180}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        <div className="mt-6 text-center w-full">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1 truncate px-2">
                                {aluno.nome_completo}
                            </h3>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                    MAT: {aluno.matricula}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Turma: {aluno.turma_id || 'NÃO ENTURMADO'}
                                </span>
                            </div>
                        </div>

                        {/* Rodapé do cartão simplificado */}
                        <div className="mt-4 w-full"></div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3">
                        <Botao
                            variante="secundario"
                            tamanho="lg"
                            icone={Printer}
                            onClick={handleImprimir}
                        >
                            Imprimir
                        </Botao>
                        <Botao
                            variante="primario"
                            tamanho="lg"
                            onClick={aoFechar}
                        >
                            Fechar
                        </Botao>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed italic">
                        "Para alunos sem acesso à internet, imprima esta credencial e entregue ao responsável."
                    </p>
                </div>
            </ModalUniversal>

            {/* Estilos para impressão exclusiva do cartão */}
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #area-impressao-credencial, #area-impressao-credencial * {
                        visibility: visible;
                    }
                    #area-impressao-credencial {
                        position: absolute;
                        left: 50%;
                        top: 20%;
                        transform: translateX(-50%);
                        border: 1px solid #e2e8f0 !important;
                        box-shadow: none !important;
                        width: 8.5cm;
                        height: 12cm;
                    }
                }
                `}
            </style>
        </>
    );
}
