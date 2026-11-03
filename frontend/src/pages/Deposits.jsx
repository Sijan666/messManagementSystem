import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Wallet, Plus, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function Deposits() {
  const { user } = useAuthStore();
  const [deposits, setDeposits] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState(user?.id || '');
  const [note, setNote] = useState('');

  const isManager = user?.role === 'Manager';

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/deposits');
      setDeposits(res.data.data.deposits);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch deposit records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (isManager) {
      try {
        const res = await api.get('/auth/members');
        setMembers(res.data.data.members);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchDeposits();
    fetchMembers();
  }, []);

  const handleCreateDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        amount: Number(amount),
        method,
        date,
        note
      };

      if (isManager && selectedUserId) {
        payload.userId = selectedUserId;
      }

      await api.post('/deposits', payload);
      setSuccess('Deposit logged successfully.');
      setAmount('');
      setNote('');
      fetchDeposits();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log deposit.');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/deposits/${id}/status`, { status });
      fetchDeposits();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update deposit status.');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Deposit Management</h2>
        <p className="text-sm text-slate-400 mt-1">
          {isManager 
            ? 'Record and approve deposits submitted by mess members.'
            : 'Submit your mess deposit records for manager approval.'}
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2.5 text-sm text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2.5 text-sm text-emerald-400">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Deposit Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={18} className="text-indigo-400" />
          Log New Deposit
        </h3>

        <form onSubmit={handleCreateDeposit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isManager && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Member</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value={user?.id}>Self ({user?.name})</option>
                {members.filter(m => m._id !== user?.id).map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount ($)</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="Cash">Cash</option>
              <option value="Mobile Banking">Mobile Banking</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Deposit Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Transaction Reference / Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. bKash TrxID or Handed to Manager"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Submit Deposit
            </button>
          </div>
        </form>
      </div>

      {/* Deposit Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Wallet size={18} className="text-indigo-400" />
            Deposit Records
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Note</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isManager && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="py-6 text-center text-slate-500">
                    No deposit transactions found.
                  </td>
                </tr>
              ) : (
                deposits.map((item) => {
                  const formattedDate = new Date(item.date).toLocaleDateString();
                  return (
                    <tr key={item._id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-medium text-slate-200">{formattedDate}</td>
                      <td className="py-3 px-4 text-slate-300">{item.userId?.name || 'Self'}</td>
                      <td className="py-3 px-4 text-slate-400">{item.method}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{item.note || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-100">${item.amount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {item.status === 'approved' && <CheckCircle2 size={12} />}
                          {item.status === 'rejected' && <XCircle size={12} />}
                          {item.status === 'pending' && <Clock size={12} />}
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </td>
                      {isManager && (
                        <td className="py-3 px-4 text-center">
                          {item.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleStatusUpdate(item._id, 'approved')}
                                className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(item._id, 'rejected')}
                                className="px-2 py-1 text-xs bg-red-600/80 hover:bg-red-500 text-white rounded font-medium"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
