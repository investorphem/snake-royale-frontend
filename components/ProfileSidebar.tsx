'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ProfileSidebarProps {
  accountAddress?: string;
}

export default function ProfileSidebar({ accountAddress }: ProfileSidebarProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Username State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!accountAddress) return;
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('players')
          .select('*')
          .eq('wallet_address', accountAddress.toLowerCase())
          .single();
          
        if (data) {
          setProfile(data);
          setEditName(data.username);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [accountAddress]);

  // Calculate dynamic rank based on real XP
  const getTier = (xp: number) => {
    if (xp >= 5000) return { name: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    if (xp >= 2000) return { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    if (xp >= 500) return { name: 'Silver', color: 'text-gray-300', bg: 'bg-gray-300/10' };
    return { name: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-400/10' };
  };

  const handleSaveUsername = async () => {
    if (!accountAddress || !editName.trim() || editName === profile.username) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ username: editName.trim() })
        .eq('wallet_address', accountAddress.toLowerCase());

      if (error) throw error;
      setProfile({ ...profile, username: editName.trim() });
      setIsEditing(false);
    } catch (error: any) {
      alert(error.message?.includes('unique') ? 'Username already taken!' : 'Failed to update username.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSound = async () => {
    if (!accountAddress || !profile) return;
    const newSoundState = !profile.sound_enabled;
    setProfile({ ...profile, sound_enabled: newSoundState }); // Optimistic UI

    await supabase
      .from('players')
      .update({ sound_enabled: newSoundState })
      .eq('wallet_address', accountAddress.toLowerCase());
  };

  if (!accountAddress) {
    return (
      <div className="w-full bg-[#111722] p-6 rounded-3xl border border-white/5 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0B0F17] flex items-center justify-center text-2xl mb-4 border border-white/5">🔒</div>
        <h3 className="font-bold text-white mb-2">Agent Unknown</h3>
        <p className="text-xs text-gray-500 max-w-[200px]">Authenticate your wallet to establish your global profile and track telemetry.</p>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="w-full bg-[#111722] p-6 rounded-3xl border border-white/5 h-full flex flex-col gap-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-800"></div>
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-800 rounded"></div>
            <div className="w-16 h-3 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const tier = getTier(profile.xp || 0);
  const winRate = profile.games_played > 0 
    ? Math.round((profile.wins / profile.games_played) * 100) 
    : 0;

  return (
    <div className="w-full bg-[#111722] p-6 rounded-3xl border border-white/5 h-full flex flex-col gap-6">
      
      {/* IDENTITY SECTION */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-2xl shadow-inner border border-white/10">
            {profile.current_skin_id === 'golden' ? '👑' : profile.current_skin_id === 'cyber' ? '🤖' : '🐍'}
          </div>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={15}
                  className="bg-[#0B0F17] text-white text-lg font-black outline-none border border-blue-500 rounded px-2 py-1 w-32"
                  autoFocus
                />
                <button onClick={handleSaveUsername} disabled={isSaving} className="text-xs bg-green-600 text-white px-2 py-1.5 rounded font-bold">
                  {isSaving ? '...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-wide">{profile.username}</h3>
                <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-white text-xs">✏️</button>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${tier.bg} ${tier.color}`}>
                {tier.name} Tier
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COMBAT TELEMETRY */}
      <div className="bg-[#0B0F17] rounded-2xl border border-white/5 p-4">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Combat Telemetry</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-black text-white">{profile.xp?.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Total XP</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-400">{winRate}%</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Win Rate</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{profile.games_played || 0}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Deployments</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{profile.wins || 0}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Victories</p>
          </div>
        </div>
      </div>

      {/* HARDWARE / SYSTEM SETTINGS */}
      <div className="bg-[#0B0F17] rounded-2xl border border-white/5 p-4 mt-auto">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">System Config</h4>
        
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm font-bold text-gray-300">Audio Feedback</span>
          <button 
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full transition-all relative ${profile.sound_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${profile.sound_enabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
        
        <div className="flex items-center justify-between py-2 mt-2">
          <span className="text-sm font-bold text-gray-300">Network State</span>
          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Mainnet
          </span>
        </div>
      </div>

    </div>
  );
}