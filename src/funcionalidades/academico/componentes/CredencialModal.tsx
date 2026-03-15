import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { QrCode, Printer, Download, User } from 'lucide-react';
import { Botao } from '@compartilhado/componentes/UI';
import { QRCodeCanvas } from 'qrcode.react';
import { Aluno } from '../tipos/academico';
import { usarEscola } from '@escola/ProvedorEscola';

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
                        <div className="w-full flex justify-between items-center mb-6 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                                    {escola.nomeEscola.substring(0, 1)}
                                </div>
                                <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">
                                    {escola.nomeEscola}
                                </span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SCAE ID</span>
                        </div>

                        <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center overflow-hidden relative border border-slate-100 p-2 shadow-inner">
                            <QRCodeCanvas 
                                value={qrPayload} 
                                size={170}
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

                        <div className="mt-6 pt-4 border-t border-slate-100 w-full flex justify-center">
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">Validação via Terminal SCAE</p>
                        </div>
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
