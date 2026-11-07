import React from 'react';
import { TutorialStepDefinition } from '../core/tutorialEngine';
import { Radio, ChevronRight, AlertTriangle, ShieldCheck, Volume2 } from 'lucide-react';
import { triggerHaptic } from '@domains/game-feel';

export interface TutorialOverlayProps {
  currentStep: TutorialStepDefinition;
  onSkip?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ currentStep, onSkip }) => {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-full max-w-xl z-30 px-3 pointer-events-none select-none font-mono">
      <div className="bg-[#181914]/95 border-2 border-[#C46A3A] rounded-[8px_2px_8px_2px] shadow-[6px_6px_0px_#090d16] p-3 text-[#F2E8D5] pointer-events-auto backdrop-blur-md animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]/30 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#C46A3A]/20 border border-[#C46A3A] text-[#C46A3A]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase text-[#C46A3A] tracking-wider leading-none">
                ENLACE TÁCTICO DE ALTO MANDO
              </span>
              <span className="text-[9px] text-[#7B8A4A] mt-0.5">
                {currentStep.instructorName} • Doctrina Básica
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#2B2C24] text-[10px] text-amber-400 font-bold border border-amber-500/40">
              PASO {currentStep.stepNumber} / {currentStep.totalSteps}
            </span>
            {onSkip && (
              <button
                onClick={() => {
                  triggerHaptic('error');
                  onSkip();
                }}
                className="text-[9px] text-slate-400 hover:text-red-400 uppercase tracking-tight underline cursor-pointer"
              >
                Omitir
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded overflow-hidden border border-[#7B8A4A] shrink-0 bg-[#2B2C24]">
            <img
              src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150"
              alt="Stella"
              className="w-full h-full object-cover pixelated"
            />
          </div>

          <div className="flex-1">
            <p className="text-xs text-[#F2E8D5] font-bold leading-relaxed tracking-wide">
              "{currentStep.dialogueText}"
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#7B8A4A]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                Celda Objetivo: <b className="text-white">[{currentStep.authorizedCoord.x}, {currentStep.authorizedCoord.y}]</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
