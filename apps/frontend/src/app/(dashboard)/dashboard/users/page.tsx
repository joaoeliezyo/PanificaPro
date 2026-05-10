'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import api from '@/lib/api';
import { Plus, Users as UsersIcon, Shield, MapPin } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    pin: '',
    role: 'OPERADOR',
    sectorId: '',
  });

  const fetchData = async () => {
    try {
      const [usersRes, unitsRes] = await Promise.all([
        api.get('/users'),
        api.get('/units'),
      ]);
      setUsers(usersRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users', formData);
      setShowForm(false);
      setFormData({ name: '', email: '', password: '', pin: '', role: 'OPERADOR', sectorId: '' });
      fetchData();
    } catch (err) {
      alert('Erro ao cadastrar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-500">Gerencie a equipe e permissões de acesso.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-xl shadow-md border border-amber-100 animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold mb-6">Cadastrar Novo Usuário</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nome Completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <Input label="Senha" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            <Input label="PIN Operacional (4-6 dígitos)" type="password" maxLength={6} value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value })} required />
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Papel (Role)</label>
              <select 
                className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="OPERADOR">Operador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN_UNIDADE">Admin Unidade</option>
                <option value="ADMIN_GERAL">Admin Geral</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Vincular a Setor</label>
              <select 
                className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.sectorId}
                onChange={(e) => setFormData({ ...formData, sectorId: e.target.value })}
              >
                <option value="">Selecione um setor...</option>
                {units.map(unit => (
                  <optgroup key={unit.id} label={unit.name}>
                    {unit.sectors?.map((sector: any) => (
                      <option key={sector.id} value={sector.id}>{sector.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Usuário'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Papel</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Setor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold">
                    <Shield className="w-3 h-3 mr-1" /> {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-slate-400" /> {user.sector?.name || 'Não vinculado'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2" />
                  <span className="text-sm text-slate-600">Ativo</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
