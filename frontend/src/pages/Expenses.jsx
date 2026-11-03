import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Receipt, Plus, Trash2, FileText, AlertCircle, CheckCircle2, User, Users, Download } from 'lucide-react';

export default function Expenses() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Form State
  const [category, setCategory] = useState('Bazaar');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [exemptedUsers, setExemptedUsers] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);

  const isManager = user?.role === 'Manager';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expenseRes, memberRes] = await Promise.all([
        api.get('/expenses'),
        isManager ? api.get('/auth/members') : Promise.resolve({ data: { data: [] } })
      ]);
      setExpenses(expenseRes.data.data.expenses);
      if (isManager) setMembers(memberRes.data.data.members || memberRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckboxChange = (memberId) => {
    setExemptedUsers((prev) => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!isManager) return;
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('amount', amount);
      formData.append('date', date);
      formData.append('description', description);
      
      if (category === 'Personal' && assignedTo) {
        formData.append('assignedTo', assignedTo);
      }
      
      if (category !== 'Personal' && exemptedUsers.length > 0) {
        exemptedUsers.forEach(id => formData.append('exemptedUsers', id));
      }

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await api.post('/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Expense logged successfully.');
      
      setCategory('Bazaar');
      setAmount('');
      setDescription('');
      setAssignedTo('');
      setExemptedUsers([]);
      setReceiptFile(null);
      
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense.');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  // Handler for Bazaar & Expense PDF Download
  const handleDownloadBazaarPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get('/expenses/export-expense-pdf', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Bazaar_Shopping_List.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col justify-between gap-4 pb-4 border-b md:flex-row md:items-center border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Expense Records</h2>
          <p className="mt-1 text-sm text-slate-400">
            Track shared mess costs across Bazaar, Utility, House Rent, and Personal bills.
          </p>
        </div>

        {/* Download PDF Button for Manager */}
        {isManager && (
          <button
            onClick={handleDownloadBazaarPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors border rounded-lg bg-emerald-600 border-emerald-500 hover:bg-emerald-700 disabled:bg-emerald-600/50"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            ) : (
              <Download size={18} />
            )}
            {isDownloading ? 'Generating...' : 'Download Bazaar & Expense PDF'}
          </button>
        )}
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

      {/* Expense Form for Manager */}
      {isManager && (
        <div className="p-6 border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
          <h3 className="flex items-center gap-2 mb-4 text-base font-semibold text-white">
            <Plus size={18} className="text-indigo-400" />
            Record Mess Expense
          </h3>

          <form onSubmit={handleCreateExpense} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Bazaar">Bazaar (Grocery)</option>
                <option value="Utility">Utility (Electricity/Gas/Water/Internet)</option>
                <option value="House Rent">House Rent</option>
                <option value="Personal">Personal (e.g. Parking)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (৳)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

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

            {/* Dynamic Fields based on Category */}
            {category === 'Personal' && (
              <div className="p-4 border rounded-lg lg:col-span-3 border-indigo-500/30 bg-indigo-500/5">
                <label className="block mb-2 text-sm font-medium text-indigo-300">Assign To (Who will pay this?)</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full max-w-md p-2.5 text-sm text-white bg-slate-950 border border-indigo-500/50 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                >
                  <option value="">Select a member...</option>
                  {members.map(member => (
                    <option key={member._id} value={member._id}>{member.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(category === 'Utility' || category === 'House Rent') && (
              <div className="p-4 border rounded-lg lg:col-span-3 border-slate-700 bg-slate-950/50">
                <label className="block mb-3 text-sm font-medium text-slate-300">
                  Exempt Users (Who will NOT pay this bill?)
                </label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {members.map(member => (
                    <label key={member._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exemptedUsers.includes(member._id)}
                        onChange={() => handleCheckboxChange(member._id)}
                        className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description / Item Details</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. WiFi bill or Bike parking"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Receipt Document (Optional)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            <div className="flex justify-end mt-2 lg:col-span-3">
              <button
                type="submit"
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Save Expense Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense List */}
      <div className="overflow-hidden border shadow-sm bg-slate-900 border-slate-800 rounded-xl">
        <div className="p-5 border-b border-slate-800">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Receipt size={18} className="text-indigo-400" />
            All Mess Expenses
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase border-b bg-slate-950/60 text-slate-400 border-slate-800">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Special Assignment</th>
                <th className="px-4 py-3 text-center">Receipt</th>
                <th className="px-4 py-3 text-right">Amount</th>
                {isManager && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="py-6 text-center text-slate-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="py-6 text-center text-slate-500">
                    No expense entries found.
                  </td>
                </tr>
              ) : (
                expenses.map((item) => {
                  const formattedDate = new Date(item.date).toLocaleDateString();
                  const receiptUrl = item.uploadedReceipt 
                    ? `http://localhost:5000${item.uploadedReceipt}` 
                    : null;

                  return (
                    <tr key={item._id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-200">{formattedDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.category === 'Bazaar'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.category === 'Utility' || item.category === 'House Rent'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{item.description || '—'}</td>
                      
                      <td className="px-4 py-3">
                        {item.category === 'Personal' && item.assignedTo ? (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                            <User size={12} />
                            <span>Assigned: {typeof item.assignedTo === 'object' ? item.assignedTo?.name : 'Member'}</span>
                          </div>
                        ) : item.exemptedUsers && item.exemptedUsers.length > 0 ? (
                          <div className="flex flex-col gap-0.5 text-xs text-amber-300/70">
                            <div className="flex items-center gap-1.5 font-medium text-amber-400">
                              <Users size={12} />
                              <span>Exempted:</span>
                            </div>
                            {item.exemptedUsers.map((eu, idx) => (
                              <span key={eu._id || idx}>- {typeof eu === 'object' ? eu?.name : 'Member'}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {receiptUrl ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                          >
                            <FileText size={14} />
                            <span>View</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-right text-slate-100">৳{item.amount?.toFixed(2)}</td>
                      {isManager && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(item._id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 size={16} />
                          </button>
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