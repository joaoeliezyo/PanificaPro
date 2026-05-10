'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { X, Lock } from 'lucide-react';
import api from '@/lib/api';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinModal({ isOpen, onClose, onSuccess, title = 'Confirmar Operação', description = 'Digite seu PIN de segurança para continuar.' }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/pin/validate', { pin });
      setPin('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'PIN incorreto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-500">{description}</p>
          </div>

          <Input
            type="password"
            placeholder="Digite o PIN de 4-6 dígitos"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="text-center text-2xl tracking-[1em] font-bold"
            maxLength={6}
            autoFocus
            required
          />

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-xs font-medium text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Validando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
