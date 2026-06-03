'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ProfileSidebarProps {
  accountAddress?: string;
}

export default function ProfileSidebar({ accountAddress }: ProfileSidebarProps) {
  const [profile, setProfile] = useState<any>(null);
  const [clanInfo, setClanInfo] = useState<{ name: string; tag: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Username State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfileAndAllianceData = async () => {
    if (!accountAddress) return;
    setIsLoading(true);
    try {
      const lowerAddress = accountAddress.toLowerCase();

      // 1. Fetch Player Base Profile Telemetry
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('wallet_address', lowerAddress)
        .single();
        
      if (playerData) {
        setProfile(playerData);
        setEditName(playerData.username);
      }

      // 2. NEW: Fetch Faction Syndicate cross-references from the junction ledger
      const { data: memberData } = await supabase
        .from('clan_members')
        .select('clans(name, tag)')
        .eq('wallet_address', lowerAddress)
        .single();

      if (memberData?.clans) {
        setClanInfo(memberData.clans as any);
      } else {
        setClanInfo(null);
      }

    } catch (error) {
      console.error("Error synchronizing profile data channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndAllianceData();
  }, [accountAddress]);

  // Calculate dynamic rank tiers matching on-chain reward score weights
  const getTier = (xp: number) => {
    if (xp >= 5000) return { name: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    if (xp >= 2000) return { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    if (xp >= 500) return { name: 'Silver', color: 'text-gray-300', bg: 'bg-gray-300/10' };
    return { name: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-400/10' };
  };

  const handleSaveUsername = async () => {
    if (!accountAddress || !editName.trim() || editName === profile?.username) {
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
      alert(error.message?.includes('unique') || error.code === '23505' ? 'Username already claimed by another agent!' : 'Failed to register identity.');
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
      <div className="w-full bg-[#111722] p-6 rounded-3xl border border-white/5 h-full flex flex-col items-center justify-center text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-[#0B0F17] flex items-center justify-center text-2xl mb-4 border border-white/5">🔒</div>
        <h3 className="font-bold text-white mb-2">Agent Unknown</h3>
        <p className="text-xs text-gray-500 max-w-[200px]">Authenticate your wallet connection to establish your global profile and load telemetry logs.</p>
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
        <div className="flex items-center gap-4 w-full min-w-0">
          {/* UPDATED: Avatar mapping now comprehensively checks the entire store asset profile roster */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-2xl shadow-inner border border-white/10 flex-shrink-0 select-none">
            {profile.current_skin_id === 'golden' ? '👑' : 
             profile.current_skin_id === 'cyber' ? '🤖' : 
             profile.current_skin_id === 'magma' ? '🌋' : '🐍'}
          </div>
          <div className="flex-grow min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={15}
                  className="bg-[#0B0F17] text-white text-base font-black outline-none border border-blue-500 rounded-lg px-2 py-1 w-full max-w-[120px]"
                  autoFocus
                />
                <button onClick={handleSaveUsername} disabled={isSaving} className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2.5 py-1.5 rounded-lg font-black uppercase tracking-wider transition-colors flex-shrink-0">
                  {isSaving ? '...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <h3 className="text-lg font-black text-white tracking-wide truncate">{profile.username}</h3>
                <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-white text-xs flex-shrink-0 transition-colors">✏️</button>
              </div>
            )}
            
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${tier.bg} ${tier.color} flex-shrink-0`}>
                  {tier.name} Tier
                </span>
                <span className="text-[10px] text-gray-500 font-mono truncate">
                  {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
                </span>
              </div>
              
              {/* NEW: Displays the attached Syndicate clan identity tag when linked */}
              {clanInfo && (
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest truncate">
                  Syndicate: <span className="text-white font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">[{clanInfo.tag}]</span> {clanInfo.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMBAT TELEMETRY LOGS */}
      <div className="bg-[#0B0F17] rounded-2xl border border-white/5 p-4">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Combat Telemetry</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xl font-black text-white font-mono">{profile.xp?.toLocaleString()}</p>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-0.5">Total Experience</p>
          </div>
          <div>
            <p className="text-xl font-black text-green-400 font-mono">{winRate}%</p>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-0.5">Win Ratio Tally</p>
          </div>
          <div className="border-t border-white/5 pt-2.5">
            <p className="text-base font-bold text-white font-mono">{profile.games_played || 0}</p>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-0.5">Deployments</p>
          </div>
          <div className="border-t border-white/5 pt-2.5">
            <p className="text-base font-bold text-white font-mono">{profile.wins || 0}</p>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-0.5">Victories Gained</p>
          </div>
        </div>
      </div>

      {/* HARDWARE / SYSTEM CONFIGS */}
      <div className="bg-[#0B0F17] rounded-2xl border border-white/5 p-4 mt-auto">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">System Config</h4>
        
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Audio Feedback</span>
          <button 
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full transition-all relative select-none ${profile.sound_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${profile.sound_enabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
        
        <div className="flex items-center justify-between py-2 mt-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Network Gateway</span>
          <span className="text-[9px] bg-green-500/10 text-green-400 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full尊 animate-pulse"></span>
            Celo Mainnet
          </span>
        </div>
      </div>

    </div>
  );
}