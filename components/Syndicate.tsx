'use client';

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";

interface SyndicateProps {
  onDeployAction?: (actionType: 'arena') => void;
}

export default function Syndicate({ onDeployAction }: SyndicateProps) {
  const account = useActiveAccount();
  const [activeWar, setActiveWar] = useState<any>(null);
  const [userClan, setUserClan] = useState<any>(null);
  const [availableClans, setAvailableClans] = useState<any[]>([]);
  const [warLeaderboard, setWarLeaderboard] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // FIX 1: maybeSingle() — single() throws if no active war row exists,
      // crashing the whole component on fresh deployments.
      const { data: warData, error: warError } = await supabase
        .from('clan_wars')
        .select('*')
        .eq('status', 'LIVE')
        .limit(1)
        .maybeSingle();

      if (warError) console.error("War fetch error:", warError.message);
      if (warData) setActiveWar(warData);

      const { data: allClans, error: clansError } = await supabase
        .from('clans')
        .select('*')
        .order('total_power', { ascending: false });

      if (clansError) console.error("Clans fetch error:", clansError.message);
      if (allClans) {
        setAvailableClans(allClans);
        setWarLeaderboard(allClans.slice(0, 5));
      }

      // FIX 2: maybeSingle() — single() throws if user has no clan membership row.
      // This caused a crash on every page load for users not in a clan.
      if (account?.address) {
        const { data: memberData, error: memberError } = await supabase
          .from('clan_members')
          .select('*, clans(*)')
          .eq('wallet_address', account.address.toLowerCase())
          .maybeSingle();

        if (memberError) console.error("Member fetch error:", memberError.message);

        if (memberData?.clans) {
          setUserClan({
            ...memberData.clans,
            userRole: memberData.role,
            myPoints: memberData.war_points,
          });
        } else {
          setUserClan(null);
        }
      }
    } catch (error) {
      console.error("Syndicate sync error:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [account?.address]);

  const handleCreateClan = async () => {
    if (!account) return alert("Connect your wallet first!");
    if (!newClanName.trim() || !newClanTag.trim()) return alert("Syndicate Name and Tag are required.");

    // FIX 3: Validate inputs before hitting the DB
    if (newClanTag.length > 4) return alert("Tag must be 4 characters or less.");
    if (!/^[a-zA-Z0-9 ]+$/.test(newClanName)) return alert("Clan name can only contain letters and numbers.");

    setIsProcessing(true);
    try {
      const { data: clanData, error: clanError } = await supabase
        .from('clans')
        .insert([{
          name: newClanName.trim(),
          tag: newClanTag.trim().toUpperCase(),
          total_power: 0,
          treasury: 0,
          created_by: account.address.toLowerCase(),
        }])
        .select()
        .single();

      if (clanError) {
        if (clanError.code === '23505') throw new Error("A syndicate with that name or tag already exists.");
        throw clanError;
      }

      const { error: memberError } = await supabase
        .from('clan_members')
        .insert([{
          wallet_address: account.address.toLowerCase(),
          clan_id: clanData.id,
          role: 'LEADER',
          war_points: 0,
        }]);

      if (memberError) throw memberError;

      alert("Syndicate initialized successfully!");
      await fetchData();
      setIsCreating(false);
      setNewClanName('');
      setNewClanTag('');
    } catch (error: any) {
      alert("Error: " + (error.message || "Execution rejected."));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinClan = async (clanId: number | string) => {
    if (!account) return alert("Connect your wallet first!");

    // FIX 4: Check if user is already in ANY clan before inserting.
    // Without this, a user can join multiple clans since there's no
    // DB-level unique constraint preventing duplicate wallet_address rows
    // in clan_members across different clan_ids.
    const { data: existing } = await supabase
      .from('clan_members')
      .select('clan_id')
      .eq('wallet_address', account.address.toLowerCase())
      .maybeSingle();

    if (existing) {
      return alert("You are already enlisted in a syndicate. Leave your current alliance first.");
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('clan_members')
        .insert([{
          wallet_address: account.address.toLowerCase(),
          clan_id: clanId,
          role: 'AGENT',
          war_points: 0,
        }]);

      if (error) throw error;
      alert("Syndicate clearance granted!");
      await fetchData();
    } catch (error: any) {
      alert("Clearance Denied: " + (error.message || "Connection failure."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in pb-16">

      {/* WAR STATUS HEADER */}
      <div className="bg-[#111722] p-6 lg:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">Active Incursion Zone</span>
            <span className={`text-[10px] font-bold text-blue-300 transition-opacity duration-300 ${isRefreshing ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
              [Syncing Ledger...]
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-wide">
            {activeWar?.title || 'AWAITING SECTOR ASSIGNMENT'}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-gray-300 font-bold text-sm">Ends: <span className="text-white ml-1 font-mono">12:00:00 UTC</span></p>
          </div>
        </div>
        <div className="z-10 text-center sm:text-right bg-black/40 px-8 py-4 rounded-2xl border border-white/5 min-w-[200px]">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total Escrow Bounty</p>
          <p className="text-4xl font-black text-yellow-500">{activeWar?.prize_pool || 0} <span className="text-lg">cUSD</span></p>
        </div>
      </div>

      {userClan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Faction Control Terminal */}
          <div className="col-span-1 lg:col-span-2 bg-[#0B0F17] p-6 lg:p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-white">{userClan.name} <span className="text-gray-500 text-xl font-bold">[{userClan.tag}]</span></h3>
                  <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mt-1">Clearance: {userClan.userRole}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Faction Power</p>
                  <p className="text-3xl font-black text-white">{userClan.total_power?.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Your Combat Yield</p>
                  <p className="text-2xl font-black text-green-400">{userClan.myPoints} <span className="text-xs text-gray-400 font-bold">PTS</span></p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Alliance Vault</p>
                  <p className="text-2xl font-black text-yellow-500">{userClan.treasury} <span className="text-xs text-gray-400 font-bold">cUSD</span></p>
                </div>
              </div>
            </div>
            <div className="border-t border-white/5 pt-6 mt-4">
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Tactical Deployment</h4>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">Launch into the primary incursion sector. All points gained multiply faction territory dominance and claim weighting over the rolling coin vaults.</p>
              <button
                onClick={() => onDeployAction?.('arena')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] active:scale-95"
              >
                DEPLOY TO WAR ZONE
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-1 flex flex-col gap-6">
            <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/5">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Live Rival Standings</h4>
              <div className="space-y-2.5">
                {warLeaderboard.map((clanItem, idx) => {
                  const isOwnFaction = clanItem.id === userClan.id;
                  return (
                    <div key={clanItem.id} className={`flex justify-between items-center p-2.5 rounded-xl border text-xs ${isOwnFaction ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-black/40 border-white/5 text-gray-300'}`}>
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-black text-gray-500 w-4">#{idx + 1}</span>
                        <span className="font-bold truncate">{clanItem.name}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">[{clanItem.tag}]</span>
                      </div>
                      <span className="font-black whitespace-nowrap pl-2">{clanItem.total_power} XP</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Escrow Distribution</h4>
              <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3.5 my-auto">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-400">Active Contributors Split</span>
                  <span className="text-green-400 font-black text-sm">70%</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold border-t border-white/5 pt-3">
                  <span className="text-gray-400">Syndicate Vault Reserves</span>
                  <span className="text-yellow-500 font-black text-sm">20%</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold border-t border-white/5 pt-3">
                  <span className="text-gray-400">MVP Incursion Bonus</span>
                  <span className="text-purple-400 font-black text-sm">10%</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-500 font-medium text-center uppercase tracking-wider mt-4">Settled automatically on contract expiry</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0B0F17] p-6 lg:p-8 rounded-3xl border border-white/5">
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wide">Available Syndicates</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Enlist under an active faction to claim shared battle prizes.</p>
            </div>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-indigo-500/20 active:scale-95 select-none"
            >
              {isCreating ? 'Cancel' : '+ Form Alliance'}
            </button>
          </div>

          {isCreating && (
            <div className="mb-8 bg-black/40 p-6 rounded-2xl border border-indigo-500/20 animate-fade-in">
              <h4 className="font-bold text-sm text-gray-300 mb-4 uppercase tracking-widest">Establish Alliance Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Syndicate Name (e.g. Cyber Cobras)"
                  value={newClanName}
                  onChange={e => setNewClanName(e.target.value)}
                  className="bg-[#111722] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors md:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Tag (e.g. CC)"
                  maxLength={4}
                  value={newClanTag}
                  onChange={e => setNewClanTag(e.target.value.toUpperCase())}
                  className="bg-[#111722] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors uppercase"
                />
              </div>
              <button
                onClick={handleCreateClan}
                disabled={isProcessing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Deploying...' : 'Initialize Syndicate'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableClans.length === 0 ? (
              <p className="text-gray-500 text-sm font-bold col-span-2 py-8 text-center">No active syndicates found. Initialize an alliance above.</p>
            ) : (
              availableClans.map(clan => (
                <div key={clan.id} className="bg-[#111722] p-5 rounded-xl border border-white/5 flex justify-between items-center hover:border-white/15 transition-all">
                  <div className="truncate pr-2">
                    <h4 className="font-bold text-white text-base truncate">{clan.name} <span className="text-gray-500 text-xs font-semibold ml-1">[{clan.tag}]</span></h4>
                    <p className="text-[11px] font-black text-blue-400 mt-1 uppercase tracking-wider">Power: {clan.total_power?.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleJoinClan(clan.id)}
                    disabled={isProcessing}
                    className="px-5 py-2.5 bg-gray-800 hover:bg-white hover:text-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 select-none whitespace-nowrap"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
