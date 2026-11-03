import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Utensils, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';

export default function MealEntry() {
  const { user } = useAuthStore();
  const [meals, setMeals] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState(user?.id || '');
  const [breakfast, setBreakfast] = useState(0);
  const [lunch, setLunch] = useState(1);
  const [dinner, setDinner] = useState(1);
  const [guestMeals, setGuestMeals] = useState(0);

  const isManager = user?.role === 'Manager';

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/meals');
      setMeals(res.data.data.meals);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load meal logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (isManager) {
      try {
        const res = await api.get('/auth/members');
        setMembers(res.data.data.members || res.data.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchMembers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        date,
        breakfast: Number(breakfast),
        lunch: Number(lunch),
        dinner: Number(dinner),
        guestMeals: Number(guestMeals)
      };

      if (isManager && selectedUserId) {
        payload.userId = selectedUserId;
      }

      await api.post('/meals', payload);
      setSuccess('Meal entry successfully saved.');
      fetchMeals();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save meal entry.');
    }
  };

  // Delete handlers
  const handleDeleteMemberMeals = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to delete all meal records for ${memberName}?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/meals/member/${userId}`);
      setSuccess(`Meals for ${memberName} deleted successfully.`);
      fetchMeals();
    } catch (err) {
      setError('Failed to delete member meals.');
    }
  };

  const handleDeleteAllMeals = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL meal records for everyone?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete('/meals/all');
      setSuccess('All meal records cleared successfully.');
      fetchMeals();
    } catch (err) {
      setError('Failed to clear meals.');
    }
  };

  // Aggregated Monthly Meals
  const aggregatedMeals = Object.values(
    meals.reduce((acc, meal) => {
      const uId = meal.userId?._id || user?.id; 
      const name = meal.userId?.name || user?.name || 'Self';

      if (!acc[uId]) {
        acc[uId] = {
          id: uId,
          name: name,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          guest: 0,
          total: 0
        };
      }

      acc[uId].breakfast += (meal.breakfast || 0);
      acc[uId].lunch += (meal.lunch || 0);
      acc[uId].dinner += (meal.dinner || 0);
      acc[uId].guest += (meal.guestMeals || 0);
      acc[uId].total += ((meal.breakfast || 0) + (meal.lunch || 0) + (meal.dinner || 0) + (meal.guestMeals || 0));

      return acc;
    }, {})
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Daily Meal Entry</h2>
        <p className="mt-1 text-sm text-slate-400">
          Plan or record individual breakfast, lunch, dinner, and guest meal portions. Note: Members cannot modify past meals or same-day meals after 8:00 PM.
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
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Entry Form */}
      <div className="p-6 border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
        <h3 className="flex items-center gap-2 mb-4 text-base font-semibold text-white">
          <Plus size={18} className="text-indigo-400" />
          Add / Update Meal Log
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Breakfast Count</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={breakfast}
              onChange={(e) => setBreakfast(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Lunch Count</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={lunch}
              onChange={(e) => setLunch(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Dinner Count</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={dinner}
              onChange={(e) => setDinner(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Guest Meals</label>
            <input
              type="number"
              min="0"
              step="1"
              value={guestMeals}
              onChange={(e) => setGuestMeals(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-end md:col-span-2 lg:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Save Meal Details
            </button>
          </div>
        </form>
      </div>

      {/* Meals Summary Table (Aggregated) */}
      <div className="overflow-hidden border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Utensils size={18} className="text-indigo-400" />
            Member Meal Summary
          </h3>
          
          {/* Clear All Meals Button for Manager */}
          {isManager && aggregatedMeals.length > 0 && (
            <button
              onClick={handleDeleteAllMeals}
              className="px-3 py-1.5 bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              Clear All Meals
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase border-b bg-slate-950/60 text-slate-400 border-slate-800">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-center">Breakfast</th>
                <th className="px-4 py-3 text-center">Lunch</th>
                <th className="px-4 py-3 text-center">Dinner</th>
                <th className="px-4 py-3 text-center">Guest</th>
                <th className="px-4 py-3 text-right">Total Meals</th>
                {isManager && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {aggregatedMeals.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="py-6 text-center text-slate-500">
                    No meal records logged yet.
                  </td>
                </tr>
              ) : (
                aggregatedMeals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-300">{item.name}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{item.breakfast}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{item.lunch}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{item.dinner}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{item.guest}</td>
                    <td className="px-4 py-3 font-semibold text-right text-indigo-400">{item.total}</td>
                    {isManager && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteMemberMeals(item.id, item.name)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete member meals"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}