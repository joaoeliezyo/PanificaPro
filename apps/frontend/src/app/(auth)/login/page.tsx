'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantDomain, setTenantDomain] = useState('padaria-modelo'); // Default para teste
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Primeiro precisamos do Tenant ID (em um fluxo real o subdomínio resolveria isso)
      // Para o MVP, vamos simular que sabemos o tenantId ou buscamos pelo domain
      const tenantRes = await api.get(`/tenants/domain/${tenantDomain}`, { headers: { 'x-tenant-id': 'public' } });
      const tenantId = tenantRes.data.id;

      // 2. Realizar Login
      const res = await api.post('/auth/login', { email, password }, {
        headers: { 'x-tenant-id': tenantId }
      });

      const { user, access_token } = res.data;
      setAuth(user, access_token, tenantId);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-600">PanificaPro</h1>
          <p className="text-slate-500 mt-2">Gerenciamento inteligente para sua padaria</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label="Domínio da Padaria"
            type="text"
            placeholder="padaria-modelo"
            value={tenantDomain}
            onChange={(e) => setTenantDomain(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-400">
          © 2026 PanificaPro. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
