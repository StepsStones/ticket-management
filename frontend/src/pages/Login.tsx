import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Building2, ShieldCheck, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
    } catch (err: any) {
      setError(err.message || 'Invalid username/email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/10 mb-4 border border-amber-300">
          S
        </div>
        <h2 className="text-2xl font-black tracking-wider text-white uppercase font-sans">
          STEPSSTONE
        </h2>
        <p className="text-xs text-amber-400 font-semibold tracking-wider mt-0.5">
          PROMETERS PVT. LTD. • INTERNAL PORTAL
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Enterprise Customer Legal & Documentation Ticket Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Staff Email or Username
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. rajesh or admin@stepsstone.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Persistent 60-day Session</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick-fill Demo Accounts for Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 text-center uppercase tracking-wider mb-2.5">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@stepsstone.com', 'admin123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 transition text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 block">Super Administrator</span>
                  <span className="text-[10px] text-slate-500">admin@stepsstone.com (admin123)</span>
                </div>
                <span className="text-[10px] font-semibold text-blue-600 group-hover:underline">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('legal.head@stepsstone.com', 'legal123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 transition text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 block">Chief Legal Officer (Admin)</span>
                  <span className="text-[10px] text-slate-500">legal.head@stepsstone.com (legal123)</span>
                </div>
                <span className="text-[10px] font-semibold text-blue-600 group-hover:underline">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('rajesh.s@stepsstone.com', 'rajesh123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 transition text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 block">Senior Documentation Officer (Employee)</span>
                  <span className="text-[10px] text-slate-500">rajesh.s@stepsstone.com (rajesh123)</span>
                </div>
                <span className="text-[10px] font-semibold text-blue-600 group-hover:underline">Fill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
