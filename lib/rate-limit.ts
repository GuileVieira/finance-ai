/**
 * Rate Limiting Helper
 * Protege rotas contra abuso e ataques de força bruta
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  interval: number;  // em ms
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;  // ms até reset
}

// Cache em memória para rate limiting
const rateLimitCache = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now >= entry.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}, 60000); // Limpa a cada minuto

/**
 * Cria um rate limiter com as opções especificadas
 */
export function createRateLimiter(options: RateLimitOptions) {
  return {
    /**
     * Verifica se o token (geralmente IP) pode fazer a requisição
     * @param token - Identificador único (IP, userId, etc)
     * @returns Resultado indicando se a requisição é permitida
     */
    check(token: string): RateLimitResult {
      const now = Date.now();
      const key = `${options.interval}:${token}`;

      const entry = rateLimitCache.get(key);

      // Se não existe entrada ou expirou, criar nova
      if (!entry || now >= entry.resetTime) {
        rateLimitCache.set(key, {
          count: 1,
          resetTime: now + options.interval
        });
        return {
          success: true,
          remaining: options.maxRequests - 1,
          resetIn: options.interval
        };
      }

      // Se ainda está dentro do limite
      if (entry.count < options.maxRequests) {
        entry.count++;
        return {
          success: true,
          remaining: options.maxRequests - entry.count,
          resetIn: entry.resetTime - now
        };
      }

      // Rate limit excedido
      return {
        success: false,
        remaining: 0,
        resetIn: entry.resetTime - now
      };
    },

    /**
     * Reseta o contador para um token específico
     */
    reset(token: string): void {
      const key = `${options.interval}:${token}`;
      rateLimitCache.delete(key);
    }
  };
}

// Rate limiters pré-configurados para rotas comuns
export const loginRateLimiter = createRateLimiter({
  interval: 60 * 1000,  // 1 minuto
  maxRequests: 5        // 5 tentativas por minuto
});

export const signupRateLimiter = createRateLimiter({
  interval: 60 * 60 * 1000,  // 1 hora
  maxRequests: 3              // 3 cadastros por hora
});

export const apiRateLimiter = createRateLimiter({
  interval: 60 * 1000,  // 1 minuto
  maxRequests: 100      // 100 requisições por minuto
});

/**
 * Extrai o IP do cliente da requisição
 */
export function getClientIP(request: Request): string {
  // Headers comuns de proxy reverso
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback para identificador genérico
  return 'unknown';
}
