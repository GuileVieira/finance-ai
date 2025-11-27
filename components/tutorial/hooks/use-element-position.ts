'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para observar a posição de um elemento no DOM
 * Atualiza automaticamente em resize, scroll e mutações do DOM
 */
export function useElementPosition(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      const domRect = element.getBoundingClientRect();
      setRect(domRect);
    } else {
      setRect(null);
    }
  }, [selector]);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    // Atualizar posição inicial
    updatePosition();

    // Tentar novamente após um pequeno delay (para elementos que ainda não renderizaram)
    const initialTimeout = setTimeout(updatePosition, 100);

    // Observer para mudanças no DOM
    const mutationObserver = new MutationObserver(() => {
      updatePosition();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    });

    // ResizeObserver para mudanças de tamanho
    let resizeObserver: ResizeObserver | null = null;
    const element = document.querySelector(selector);
    if (element) {
      resizeObserver = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserver.observe(element);
    }

    // Event listeners para resize e scroll
    const handleResize = () => {
      updatePosition();
    };

    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [selector, updatePosition]);

  return rect;
}

/**
 * Hook para fazer scroll até um elemento
 */
export function useScrollToElement() {
  const scrollToElement = useCallback((selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, []);

  return scrollToElement;
}
