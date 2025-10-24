'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações básicas
    if (!email || !password) {
      setError('Preencha todos os campos');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Digite um email válido');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      setLoading(false);
      return;
    }

    // Mock login - aceita qualquer email válido + 8+ caracteres
    setTimeout(() => {
      if (email && password) {
        // Simula login bem-sucedido
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', email.split('@')[0]);
        router.push('/');
      } else {
        setError('Por favor, preencha todos os campos');
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo e Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-700 mb-2">
            FinanceAI
          </h1>
          <p className="text-gray-600 text-sm">
            Gestão Financeira Inteligente
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Bem-vindo!
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Faça login na sua conta
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  📧 Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  🔒 Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  disabled={loading}
                  required
                  minLength={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loading}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  Manter conectado
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </div>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="text-center space-y-2 text-sm">
                <div>
                  <Link
                    href="/forgot-password"
                    className="text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="text-gray-600">
                  Não tem conta?{" "}
                  <Link
                    href="/register"
                    className="text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Cadastre-se
                  </Link>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Credentials Info */}
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-primary font-medium mb-2">
            📋 Modo Demo - Credenciais de Teste:
          </p>
          <p className="text-xs text-blue-700 mb-1">
            Email: demo@financeai.com
          </p>
          <p className="text-xs text-blue-700 mb-1">
            Senha: FinanceAI123
          </p>
          <p className="text-xs text-primary/80 mt-2">
            Ou use qualquer email válido + 8+ caracteres de senha
          </p>
        </div>
      </div>
    </div>
  );
}