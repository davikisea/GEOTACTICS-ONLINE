/**
 * ==============================================================================
 * MODAL DE OFERTA FLASH DE EMERGENCIA POR TILT ($0.99 EN 180s)
 * ==============================================================================
 * Skill: Retro-futurism (Atompunk soviético/occidental, esquinas asimétricas,
 * biseles de acero, tipografía militar monoespaciada, paleta #46521F, #7B8A4A,
 * #C46A3A, #F2E8D5, #2B2C24, sombras duras de 8px y sellos Pop-Art).
 * 
 * Regla Canónica:
 * - Se dispara tras 2 derrotas consecutivas o turnos precipitados (PTE < 10s).
 * - Urgencia: 180 segundos con cronómetro en tiempo real.
 * - Contenido: 100 cartas de la tropa derrotada + 30 Vigas de Acero por $0.99 (85% OFF).
 * - Cooldown estricto: Máximo 1 oferta cada 48 horas.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Zap,
  Flame,
  Shield,
  Layers,
  Award,
  CreditCard,
  X,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { TiltEmergencyOffer } from '../../engine/asymmetricLadderEngine';
import { audioManager } from '../../engine/audioManager';

interface TiltEmergencyOfferModalProps {
  offer: TiltEmergencyOffer;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: (rewardBlueprints: number, rewardSteel: number) => void;
}

export const TiltEmergencyOfferModal: React.FC<TiltEmergencyOfferModalProps> = ({
  offer,
  isOpen,
  onClose,
  onPurchaseSuccess,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(180);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Inicializar y actualizar cronómetro de 180 segundos
  useEffect(() => {
    if (!isOpen) return;

    const remaining = Math.max(0, Math.floor((offer.expiresAt - Date.now()) / 1000));
    setSecondsLeft(remaining > 0 ? remaining : 180);

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, offer.expiresAt, onClose]);

  // Manejo de atajo ESC para cierre rápido
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        audioManager.playSFX('button_click');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = hours > 0 
    ? `${hours}h ${minutes.toString().padStart(2, '0')}m` 
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = secondsLeft <= 300;

  const handleSimulatedStripeCheckout = () => {
    setIsProcessing(true);
    audioManager.playSFX('button_click');

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      audioManager.playSFX('victory');

      setTimeout(() => {
        onPurchaseSuccess(offer.rewardBlueprints, offer.rewardSteel);
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          audioManager.playSFX('button_click');
          onClose();
        }
      }}
    >
      <div className="bg-[#2B2C24] border-4 border-amber-500/70 rounded-[28px_8px_28px_8px] p-6 max-w-lg w-full shadow-[12px_12px_0px_#0A0B08] text-[#F2E8D5] relative overflow-hidden">
        {/* Sello de Descuento Pop-Art */}
        <div className="absolute top-4 right-12 transform rotate-12 z-20 pointer-events-none">
          <div className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08]">
            ¡CONVOY PRIORITARIO!
          </div>
        </div>

        {/* Botón de Cierre */}
        <button
          onClick={() => {
            audioManager.playSFX('button_click');
            onClose();
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className="absolute top-4 right-4 text-[#F2E8D5]/70 hover:text-white p-1.5 rounded-[6px_2px_6px_2px] bg-[#181914] border border-[#7B8A4A]/40 hover:bg-[#34352C] transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
          title="Cerrar (ESC)"
        >
          <span className="text-[9px] text-amber-400/80 hidden sm:inline">[ESC]</span>
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera del Alto Mando */}
        <div className="flex items-center gap-3 mb-4 border-b border-[#7B8A4A]/40 pb-3">
          <div className="w-12 h-12 rounded-[12px_2px_12px_2px] bg-amber-500 border-2 border-[#F2E8D5] flex items-center justify-center text-2xl font-black shadow-[3px_3px_0px_#0A0B08]">
            📦
          </div>
          <div>
            <span className="text-[10px] text-amber-300 font-black uppercase tracking-wider block">
              LOGÍSTICA DE OPERACIONES ESPECIALES
            </span>
            <h3 className="text-base font-black uppercase tracking-wide text-[#F2E8D5]">
              CARGAMENTO DE CONTRAATAQUE DEL ALTO MANDO
            </h3>
          </div>
        </div>

        {/* Ventana de Reserva Estratégica (12h) */}
        <div className="p-3.5 rounded-[16px_4px_16px_4px] border-2 mb-4 text-center bg-[#181914] border-[#7B8A4A] text-amber-300 shadow-[4px_4px_0px_#0A0B08]">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            <span>Reserva Asegurada en Almacén Logístico Durante:</span>
          </div>
          <div className="text-2xl md:text-3xl font-black tracking-wider mt-1 text-white font-mono tabular-nums">
            {formattedTime}
          </div>
        </div>

        {/* Viñeta de Comandante Afectado */}
        <div className="bg-[#181914] border border-[#7B8A4A]/50 rounded-[14px_4px_14px_4px] p-3 mb-4 text-xs">
          <p className="text-[#F2E8D5]/90 leading-relaxed">
            <strong className="text-amber-400">ESTADO MAYOR CONJUNTO:</strong> "Comandante, tus batallas en este sector
            han abierto una oportunidad táctica de contraofensiva. El Alto Mando ha reservado un envío logístico especial
            de <strong className="text-white">{offer.targetUnitName}</strong> para fortalecer tu vanguardia."
          </p>
        </div>

        {/* Contenido del Paquete */}
        <div className="bg-[#181914] p-4 rounded-[16px_4px_16px_4px] border-2 border-[#7B8A4A]/60 mb-5 space-y-3">
          <div className="text-[11px] font-black uppercase text-[#7B8A4A] tracking-wider">
            Suministros Estratégicos Asignados:
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#2B2C24] border border-[#7B8A4A]/30">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs font-bold text-[#F2E8D5]">Planos de {offer.targetUnitName}</span>
                <span className="text-[10px] text-[#7B8A4A] block">Para acelerar subida de nivel</span>
              </div>
            </div>
            <span className="text-sm font-black text-amber-400">+{offer.rewardBlueprints} Planos</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#2B2C24] border border-[#7B8A4A]/30">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#7B8A4A]" />
              <div>
                <span className="text-xs font-bold text-[#F2E8D5]">Vigas de Acero Militar</span>
                <span className="text-[10px] text-[#7B8A4A] block">Materia prima de blindaje</span>
              </div>
            </div>
            <span className="text-sm font-black text-slate-200">+{offer.rewardSteel} Acero</span>
          </div>
        </div>

        {/* Botón de Compra con Stripe */}
        {isCompleted ? (
          <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-[12px_2px_12px_2px] text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>¡Suministros Recibidos y Asignados a tu Hangar Militar!</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-[12px_2px_12px_2px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
            >
              Mantener en Reserva
            </button>

            <button
              onClick={handleSimulatedStripeCheckout}
              disabled={isProcessing}
              className="w-full flex-1 py-3 px-4 rounded-[12px_2px_12px_2px] bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_#181914] cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>
                {isProcessing
                  ? 'Verificando con Stripe...'
                  : `RECLAMAR SUMINISTROS • $${offer.offerPriceUsd.toFixed(2)} USD`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
