import React from 'react';
import { 
    MessageSquare, Zap, User, X, Brush, 
    MonitorPlay, Type, Image as ImageIcon, Settings, 
    Upload, Info, RefreshCw 
} from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/UI';
import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import toast from 'react-hot-toast';

interface ModalComunicacaoVisualProps {
    aberto: boolean;
    aoFechar: () => void;
    enviarComandoRemoto: (acao: string, params?: any) => void;
}

/**
 * Modal centralizado para controle do visor da catraca e banners de standby.
 * Permite gerar imagens a partir de texto ou fazer upload de fotos.
 */
export const ModalComunicacaoVisual: React.FC<ModalComunicacaoVisualProps> = ({ 
    aberto, 
    aoFechar, 
    enviarComandoRemoto 
}) => {
    const [abaAtiva, setAbaAtiva] = React.useState<'TEXTO' | 'IMAGEM'>('TEXTO');
    const [textoPrevia, setTextoPrevia] = React.useState('');
    const [imagemPrevia, setImagemPrevia] = React.useState<string | null>(null);

    const resetarTudo = () => {
        if(confirm('Isso removerá qualquer personalização (texto ou imagem) e voltará ao padrão do hardware. Confirmar?')) {
            enviarComandoRemoto('SET_HARDWARE_BANNER', { base64: "" }); 
            setTextoPrevia('');
            setImagemPrevia(null);
            const el = document.getElementById('input-modal-banner') as HTMLInputElement;
            if(el) el.value = '';
            toast.success('Hardware restaurado para o padrão.');
        }
    };

    return (
        <ModalUniversal aberto={aberto} aoFechar={aoFechar} titulo="Visual do Hardware" tamanho="md" cor="violet" icone={MonitorPlay}>
            <div className="space-y-6">
                
                {/* 🖥️ PREVIA SIMULADA */}
                <div className="relative aspect-[16/9] w-full bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-inner flex items-center justify-center p-4">
                    <div className="absolute top-2 left-2 flex gap-1">
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                    </div>
                    
                    {abaAtiva === 'TEXTO' ? (
                        <div className="text-center">
                            <p className="text-white font-black text-2xl uppercase tracking-tight break-words max-w-[200px]">
                                {textoPrevia || 'SUA MENSAGEM AQUI'}
                            </p>
                        </div>
                    ) : (
                        imagemPrevia ? (
                            <img 
                                src={imagemPrevia} 
                                className="w-full h-full object-contain transition-all duration-500" 
                                style={{ transform: 'scale(0.8)' }}
                                alt="Previa" 
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                <ImageIcon size={32} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sem Imagem</span>
                            </div>
                        )
                    )}

                    <div className="absolute bottom-2 right-4 text-[8px] font-black text-white/20 uppercase tracking-widest italic">
                        Visualização iDFlex
                    </div>
                </div>

                {/* 🔄 SELETOR DE MODO (TABS) */}
                <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                    <button 
                        onClick={() => setAbaAtiva('TEXTO')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'TEXTO' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Type size={14} /> Gerar Texto
                    </button>
                    <button 
                        onClick={() => setAbaAtiva('IMAGEM')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'IMAGEM' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ImageIcon size={14} /> Upload Foto
                    </button>
                </div>

                {/* 🧱 CONTEÚDO DA ABA */}
                <div className="min-h-[140px]">
                    {abaAtiva === 'TEXTO' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <input 
                                type="text" 
                                placeholder="DIGITE O TEXTO DO PAINEL..." 
                                className="w-full px-6 h-16 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg text-slate-800 outline-none focus:border-violet-500 transition-all placeholder:text-slate-300"
                                id="input-modal-banner"
                                value={textoPrevia}
                                onChange={(e) => setTextoPrevia(e.target.value.toUpperCase())}
                            />
                            <Botao variante="primario" fullWidth aoClicar={() => {
                                if(!textoPrevia) return;

                                const canvas = document.createElement('canvas');
                                canvas.width = 480;
                                canvas.height = 272;
                                const ctx = canvas.getContext('2d');
                                if(ctx) {
                                    ctx.clearRect(0, 0, 480, 272);
                                    ctx.fillStyle = '#ffffff';
                                    ctx.textAlign = 'center';
                                    ctx.font = '900 54px Arial';
                                    const texto = textoPrevia;
                                    const palavras = texto.split(' ');
                                    const linhas: string[] = [];
                                    let linhaAtual = '';
                                    for (let n = 0; n < palavras.length; n++) {
                                        const teste = linhaAtual + palavras[n] + ' ';
                                        if (ctx.measureText(teste).width > 440 && n > 0) {
                                            linhas.push(linhaAtual);
                                            linhaAtual = palavras[n] + ' ';
                                        } else { linhaAtual = teste; }
                                    }
                                    linhas.push(linhaAtual);
                                    let yStart = (272 - (linhas.length * 62)) / 2 + 45;
                                    for (const l of linhas) {
                                        ctx.fillText(l.trim(), 240, yStart);
                                        yStart += 62;
                                    }
                                    const b64 = canvas.toDataURL('image/png').split(',')[1];
                                    enviarComandoRemoto('SET_HARDWARE_BANNER', { base64: b64 });
                                    toast.success('Imagem gerada e enviada!');
                                }
                            }}>Aplicar Personalização</Botao>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <label className="flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const img = new Image();
                                                img.onload = () => {
                                                    const canvas = document.createElement('canvas');
                                                    canvas.width = 480;
                                                    canvas.height = 272;
                                                    const ctx = canvas.getContext('2d');
                                                    if(ctx) {
                                                        ctx.clearRect(0, 0, 480, 272);

                                                        // Escala total para o Hardware (100% da área útil)
                                                        const scale = Math.min(480 / img.width, 272 / img.height);
                                                        
                                                        const x = (480 - img.width * scale) / 2;
                                                        const y = (272 - img.height * scale) / 2;
                                                        
                                                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                                                        
                                                        const b64Final = canvas.toDataURL('image/png');
                                                        setImagemPrevia(b64Final);
                                                        enviarComandoRemoto('SET_HARDWARE_BANNER', { base64: b64Final.split(',')[1] });
                                                        toast.success('Imagem enviada (Tamanho Real)');
                                                    }
                                                };
                                                img.src = event.target?.result as string;
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <Upload size={24} className="text-slate-300 group-hover:text-emerald-500" />
                                <div className="text-center">
                                    <span className="block text-[10px] font-black text-slate-400 group-hover:text-emerald-500 uppercase tracking-widest">Escolher Foto</span>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">480x272px • PNG/JPG</span>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* 🏁 RODAPÉ: AÇÃO GLOBAL */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-help">
                        <Info size={14} className="text-slate-300 group-hover:text-violet-500 transition-all" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Interface de Gestão Visual</span>
                    </div>
                    <Botao variante="ghost" tamanho="sm" icone={RefreshCw} aoClicar={resetarTudo} className="text-rose-500 hover:text-rose-600">
                        Resetar p/ Padrão
                    </Botao>
                </div>

            </div>
        </ModalUniversal>
    );
};
