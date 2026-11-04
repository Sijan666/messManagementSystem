import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { 
  TrendingUp, 
  DollarSign, 
  UtensilsCrossed, 
  AlertCircle,
  Users,
  Download
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/finance/summary');
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch financial summary data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get('/finance/export-pdf', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mess_Report.pdf'); 
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading the PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 text-red-400 border bg-red-500/10 border-red-500/20 rounded-xl">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const { summary, individualBalances, userSummary } = data || {};
  const isManager = user?.role === 'Manager';

  return (
    <div className="mx-auto space-y-8 max-w-7xl">
      {/* Top Banner / Welcome with Download Button */}
      <div className="flex flex-col justify-between gap-4 pb-4 border-b md:flex-row md:items-center border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isManager ? 'Manager Overview' : 'Member Overview'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Current financial status, meal consumption, and active member balances.
          </p>
        </div>
        
        {/* PDF Download Button */}
        <button 
          onClick={handleDownloadPDF} 
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-colors bg-indigo-600 border border-indigo-500 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-600/50"
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
          ) : (
            <Download size={18} />
          )}
          {isDownloading ? 'Generating...' : 'Export PDF'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2 text-slate-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Total Deposit</span>
            <WalletIcon className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ৳{isManager ? summary?.totalDeposit?.toFixed(2) : userSummary?.totalDeposit?.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isManager ? 'Combined mess deposits' : 'Your total deposits'}
          </p>
        </div>

        <div className="p-5 border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2 text-slate-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Total Cost</span>
            <DollarSign className="text-amber-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-white">
            ৳{isManager ? summary?.totalCost?.toFixed(2) : userSummary?.totalCost?.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isManager ? 'Shared mess expenses' : 'Your calculated cost share'}
          </p>
        </div>

        <div className="p-5 border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2 text-slate-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Meals Recorded</span>
            <UtensilsCrossed className="text-emerald-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-white">
            {isManager ? summary?.totalMeals : userSummary?.totalMeals}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isManager ? 'Overall meals consumed' : 'Your consumed meals'}
          </p>
        </div>

        <div className="p-5 border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2 text-slate-400">
            <span className="text-xs font-semibold tracking-wider uppercase">
              {isManager ? 'Current Meal Rate' : 'Current Balance'}
            </span>
            <TrendingUp className="text-cyan-400" size={20} />
          </div>
          <p className={`text-2xl font-bold ${
            isManager 
              ? 'text-white' 
              : (userSummary?.balance >= 0 ? 'text-emerald-400' : 'text-red-400')
          }`}>
            ৳{isManager ? summary?.currentMealRate?.toFixed(2) : userSummary?.balance?.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isManager ? 'Cost per consumed meal' : (userSummary?.balance >= 0 ? 'Credit remaining' : 'Due payment')}
          </p>
        </div>
      </div>

      {/* Breakdown Cards for Expenses */}
      {isManager && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="p-4 border bg-slate-900/60 border-slate-800 rounded-xl">
            <span className="text-xs font-medium text-slate-400">Bazaar Expense</span>
            <p className="mt-1 text-lg font-semibold text-slate-200">৳{summary?.totalBazaarExpense?.toFixed(2)}</p>
          </div>
          <div className="p-4 border bg-slate-900/60 border-slate-800 rounded-xl">
            <span className="text-xs font-medium text-slate-400">Utilities Expense</span>
            <p className="mt-1 text-lg font-semibold text-slate-200">৳{summary?.totalUtilityExpense?.toFixed(2)}</p>
          </div>
          <div className="p-4 border bg-slate-900/60 border-slate-800 rounded-xl">
            <span className="text-xs font-medium text-slate-400">House Rent</span>
            <p className="mt-1 text-lg font-semibold text-slate-200">৳{summary?.totalHouseRentExpense?.toFixed(2)}</p>
          </div>
          <div className="p-4 border bg-slate-900/60 border-slate-800 rounded-xl">
            <span className="text-xs font-medium text-slate-400">Personal Expense</span>
            <p className="mt-1 text-lg font-semibold text-slate-200">৳{summary?.totalPersonalExpense?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      )}

      {/* Member Balances Table */}
      <div className="overflow-hidden border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Users size={18} className="text-indigo-400" />
            Member Account Ledger
          </h3>
          <span className="text-xs text-slate-400">
            Active Members: {summary?.totalActiveMembers || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase border-b bg-slate-950/60 text-slate-400 border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold text-right">Meals</th>
                <th className="px-4 py-3 font-semibold text-right">Deposited</th>
                <th className="px-4 py-3 font-semibold text-right">Meal Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Shared Bills</th>
                <th className="px-4 py-3 font-semibold text-right">Personal Bills</th>
                <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {individualBalances?.map((item) => {
                const isCurrentUser = item.userId === user?.id;
                return (
                  <tr key={item.userId} className={isCurrentUser ? 'bg-indigo-950/20' : 'hover:bg-slate-800/30'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <span>{item.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-normal">You</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{item.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-right text-slate-200">{item.totalMeals}</td>
                    <td className="px-4 py-3 font-medium text-right text-slate-200">৳{item.totalDeposit?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">৳{item.mealCost?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">৳{item.utilityAndRentShare?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">৳{item.personalExtraCost?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-right text-slate-300">৳{item.totalCost?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block font-semibold px-2.5 py-1 rounded-md text-xs ${
                        item.balance >= 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {item.balance >= 0 ? `+৳${item.balance?.toFixed(2)}` : `-৳${Math.abs(item.balance)?.toFixed(2)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WalletIcon(props) {
  return (
    <svg
      {...props}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}