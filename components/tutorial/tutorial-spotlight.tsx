'use client';

import { useMemo } from 'react';
import type { TutorialSpotlightProps } from '@/lib/types/tutorial';

/**
 * Componente que cria o efeito de spotlight/destaque
 * Usa SVG com mask para criar um "buraco" transparente no overlay escuro
 */
export function TutorialSpotlight({ targetRect, padding = 8 }: TutorialSpotlightProps) {
  // Calcular dimensões do spotlight
  const spotlightDimensions = useMemo(() => {
    if (!targetRect) return null;

    return {
      x: targetRect.left - padding,
      y: targetRect.top - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    };
  }, [targetRect, padding]);

  if (!spotlightDimensions) {
    // Sem elemento alvo, mostrar overlay completo
    return (
      <div className="fixed inset-0 bg-black/70 z-[9998] transition-opacity duration-300" />
    );
  }

  return (
    <>
      {/* SVG com mask para criar o buraco */}
      <svg
        className="fixed inset-0 w-full h-full z-[9998] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tutorial-spotlight-mask">
            {/* Fundo branco (área visível do overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Buraco preto (área transparente) */}
            <rect
              x={spotlightDimensions.x}
              y={spotlightDimensions.y}
              width={spotlightDimensions.width}
              height={spotlightDimensions.height}
              rx="8"
              ry="8"
              fill="black"
            />
          </mask>
        </defs>

        {/* Overlay aplicando a mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#tutorial-spotlight-mask)"
          className="pointer-events-auto"
        />
      </svg>

      {/* Borda animada ao redor do elemento destacado */}
      <div
        className="fixed z-[9999] pointer-events-none rounded-lg border-2 border-primary tutorial-spotlight-border"
        style={{
          left: spotlightDimensions.x,
          top: spotlightDimensions.y,
          width: spotlightDimensions.width,
          height: spotlightDimensions.height,
        }}
      />
    </>
  );
}
