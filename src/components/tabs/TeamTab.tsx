import React, { useEffect, useState, useCallback } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Users, Plus, Trash2, Shield, UserPlus, Loader2 } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'support';
  invitedAt: string;
}

export const TeamTab: React.FC = () => {
  const { selectedTenant } = useSaaS();
  const [owner, setOwner] = useState<{ uid: string; role: string } | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'support'>('support');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!selectedTenant) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${selectedTenant.id}/team`);
      if (res.ok) {
        const data = await res.json();
        setOwner(data.owner);
        setMembers(data.members || []);
      }
    } catch {
      // ignore — panel just stays empty
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  if (!selectedTenant) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/${selectedTenant.id}/team/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      const data = await res.json();
      if (res.ok) {
        setInviteEmail('');
        await fetchTeam();
      } else {
        setError(data.error || 'Failed to invite team member.');
      }
    } catch {
      setError('Network error while inviting team member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await fetch(`/api/tenant/${selectedTenant.id}/team/${memberId}`, { method: 'DELETE' });
      await fetchTeam();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-500" />
          <span>Team Members</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Invite teammates by the email address they use to sign in. They must have signed in at
          least once before you can invite them.
        </p>
      </div>

      <form
        onSubmit={handleInvite}
        className="p-5 border border-white/10 bg-[#080b12] rounded-2xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
      >
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold font-mono uppercase text-slate-450">
            Email address
          </label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="w-full px-3 py-2 bg-[#0d121d] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold font-mono uppercase text-slate-450">Role</label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'support')}
            className="px-3 py-2 bg-[#0d121d] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="support">Support Agent</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={inviting || !inviteEmail.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
        >
          {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
          <span>{inviting ? 'Inviting…' : 'Invite'}</span>
        </button>
      </form>

      {error && <p className="text-[11px] text-red-400 font-mono px-1">{error}</p>}

      <div className="border border-white/10 bg-[#080b12] rounded-2xl divide-y divide-white/5">
        {owner && (
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Owner</div>
                <div className="text-[10px] text-slate-500 font-mono">{owner.uid}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold font-mono uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
        )}

        {loading && members.length === 0 && (
          <div className="p-4 text-xs text-slate-500 font-mono">Loading team…</div>
        )}

        {!loading && members.length === 0 && (
          <div className="p-4 text-xs text-slate-500 font-mono">
            No team members yet — invite someone above.
          </div>
        )}

        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{m.email}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Invited {new Date(m.invitedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-full border ${
                  m.role === 'admin'
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : 'text-slate-400 bg-white/5 border-white/10'
                }`}
              >
                {m.role === 'admin' ? 'Admin' : 'Support Agent'}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                aria-label={`Remove ${m.email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
