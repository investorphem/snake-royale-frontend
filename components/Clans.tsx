'use client';

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";

export default function Clans() {
<<<<<<< HEAD
  const account = useActiveAccount();
  const [activeView, setActiveView] = useState<'hub' | 'create'>('hub');
  
  // Dynamic State
  const [userClan, setUserClan] = useState<any>(null);
  const [topClans, setTopClans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [txStatus, setTxStatus] = useState('');
=======
  const [hasClan, setHasClan] = useState(false);
  const [activeView, setActiveView] = useState<'hub' | 'create'>('hub');
>>>>>>> f44a698310c73f6aece17b3edd8ee9992dc06cc7

  // Create Clan Form State
  const [clanName, setClanName] = useState('');
  const [clanTag, setClanTag] = useState('');

  // Static for now (can be moved to smart contracts later)
  const activeWars = [
    { title: 'Sector 7 Domination', pool: '5,000 cUSD', endsIn: '12h 45m', status: 'LIVE' },
    { title: 'Global Liquidity Raid', pool: '12,500 cUSD', endsIn: '2d 14h', status: 'UPCOMING' }
  ];

  // Fetch the Global Leaderboard and the User's specific Clan
  const fetchData = async () => {
    if (!account?.address) return;
    setIsLoading(true);

    try {
      const lowerAddress = account.address.toLowerCase();

      // 1. Fetch Top Clans for the Leaderboard
      const { data: clans } = await supabase
        .from('clans')
        .select('*')
        .order('total_power', { ascending: false })
        .limit(5);
        
      if (clans) setTopClans(clans);

      // 2. Check if current user is in a clan
      const { data: player } = await supabase
        .from('players')
        .select('clan_id, clans(*)')
        .eq('wallet_address', lowerAddress)
        .single();

      if (player?.clans) {
        setUserClan(player.clans);
      } else {
        setUserClan(null);
      }

    } catch (error) {
      console.error("Error fetching clans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [account?.address, activeView]);

  // Handle Clan Creation
  const handleCreateClan = async () => {
    if (!account?.address || !clanName || !clanTag) return;
    setTxStatus('Forging Syndicate...');
    
    try {
      const lowerAddress = account.address.toLowerCase();

      // 1. Insert new clan into DB
      const { data: newClan, error: clanError } = await supabase
        .from('clans')
        .insert([{ 
          name: clanName, 
          tag: clanTag.toUpperCase(), 
          leader_address: lowerAddress,
          total_power: 100 // Starting power
        }])
        .select()
        .single();

      if (clanError) throw clanError;

      // 2. Update user's profile to link them to the new clan
      if (newClan) {
        await supabase
          .from('players')
          .update({ clan_id: newClan.id })
          .eq('wallet_address', lowerAddress);
          
        setUserClan(newClan);
        setActiveView('hub');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message.includes('unique') ? 'Clan name or tag already taken!' : 'Failed to create clan.');
    } finally {
      setTxStatus('');
    }
  };

  // Handle Joining an Existing Clan
  const handleJoinClan = async (clanId: number) => {
    if (!account?.address) return;
    try {
      const lowerAddress = account.address.toLowerCase();
      await supabase
        .from('players')
        .update({ clan_id: clanId })
        .eq('wallet_address', lowerAddress);
      
      // Refresh UI
      fetchData();
    } catch (error) {
      console.error("Failed to join clan", error);
    }
  };

  // Handle Leaving a Clan
  const handleLeaveClan = async () => {
    if (!account?.address) return;
    try {
      await supabase
        .from('players')
        .update({ clan_id: null })
        .eq('wallet_address', account.address.toLowerCase());
      
      setUserClan(null);
    } catch (error) {
      console.error("Failed to leave clan", error);
    }
  };

  if (!account) return <div className="text-center py-20 text-gray-500 font-bold">Connect wallet to access Syndicates.</div>;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10">

      {/* CLANS HEADER */}
      <div className="bg-[#111722] p-6 lg:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex justify-between items-center">
        <div className="z-10 relative">
          <h2 className="text-3xl lg:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-wide mb-1">
            SYNDICATE CLANS
          </h2>
          <p className="text-gray-400 font-semibold text-sm">Pool assets. Form alliances. Dominate the ecosystem.</p>
        </div>
        <div className="text-6xl opacity-20 absolute right-8 -bottom-4 transform rotate-12">
          🛡️
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: User Status & Wars */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* USER SYNDICATE STATUS */}
          <div className="bg-gradient-to-r from-blue-500/10 to-transparent p-[1px] rounded-3xl">
            <div className="bg-[#111722] p-6 rounded-3xl border border-blue-500/20 flex flex-col items-center text-center transition-all">
              
              {isLoading ? (
                <div className="h-40 flex items-center justify-center text-blue-500 animate-pulse font-bold">Syncing Network...</div>
              ) : activeView === 'create' ? (
                <div className="w-full max-w-sm animate-fade-in">
                  <h3 className="text-xl font-black text-white mb-4">Establish Syndicate</h3>
                  <input 
                    type="text" 
                    placeholder="Syndicate Name" 
                    maxLength={20}
                    value={clanName}
                    onChange={e => setClanName(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-3 outline-none focus:border-blue-500 font-bold" 
                  />
                  <input 
                    type="text" 
                    placeholder="TAG (4 Letters)" 
                    maxLength={4}
                    value={clanTag}
                    onChange={e => setClanTag(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-6 outline-none focus:border-blue-500 font-mono uppercase" 
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setActiveView('hub')} className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl">Cancel</button>
                    <button onClick={handleCreateClan} disabled={!!txStatus} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50">
                      {txStatus || 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : !userClan ? (
                <div className="animate-fade-in">
                  <div className="w-20 h-20 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-4xl mb-4 shadow-inner mx-auto">👤</div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-wide">No Affiliation</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                    You are currently operating as a solo agent. Join a syndicate to access multiplier yields, or create your own to lead.
                  </p>
<<<<<<< HEAD
                  <div className="flex gap-4 w-full max-w-xs mx-auto">
=======
                  <div className="flex gap-4 w-full max-w-xs">
>>>>>>> f44a698310c73f6aece17b3edd8ee9992dc06cc7
                    <button 
                      onClick={() => setActiveView('create')}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                      Create Clan
                    </button>
<<<<<<< HEAD
=======
                    <button 
                      onClick={() => setActiveView('hub')}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-white/5"
                    >
                      Find Clan
                    </button>
>>>>>>> f44a698310c73f6aece17b3edd8ee9992dc06cc7
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)] mx-auto">🐍</div>
                  <h3 className="text-2xl font-black text-white mb-1 tracking-wide">{userClan.name}</h3>
                  <div className="flex justify-center gap-2 mb-6">
                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest">
                      [{userClan.tag}]
                    </span>
                    <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest">
                      Power: {userClan.total_power}
                    </span>
                  </div>
                  <button onClick={handleLeaveClan} className="text-sm text-gray-500 hover:text-red-400 underline">
                    Leave Syndicate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE WAR DEPLOYMENTS */}
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 hidden sm:block">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-6">Global War Deployments</h3>
            <div className="space-y-4">
              {activeWars.map((war, idx) => (
                <div key={idx} className="bg-[#0B0F17] border border-white/5 rounded-2xl p-4 flex justify-between items-center group hover:border-red-500/30 transition-all cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full animate-pulse ${war.status === 'LIVE' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                      <span className={`text-[10px] font-black tracking-widest uppercase ${war.status === 'LIVE' ? 'text-red-500' : 'text-yellow-500'}`}>{war.status}</span>
                    </div>
                    <h4 className="font-bold text-white text-lg">{war.title}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Prize Pool</p>
                    <p className="text-xl font-black text-yellow-500">{war.pool}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Global Leaderboard */}
        <div className="lg:col-span-5">
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 h-full">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-6">Top Syndicates</h3>
<<<<<<< HEAD
=======

            <div className="space-y-3">
              {topClans.map((clan, idx) => (
                <div key={idx} className="bg-[#0B0F17] p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    clan.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                    clan.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                    'bg-orange-500/20 text-orange-500'
                  }`}>
                    #{clan.rank}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-white">{clan.name}</h4>
                    <p className="text-xs text-gray-500">{clan.members} Members</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-green-400 font-bold">{clan.yield}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Yield Bonus</p>
                  </div>
                </div>
              ))}
            </div>
>>>>>>> f44a698310c73f6aece17b3edd8ee9992dc06cc7

            {isLoading ? (
               <div className="space-y-3 animate-pulse">
                 <div className="h-16 bg-gray-800 rounded-xl w-full"></div>
                 <div className="h-16 bg-gray-800 rounded-xl w-full"></div>
                 <div className="h-16 bg-gray-800 rounded-xl w-full"></div>
               </div>
            ) : topClans.length === 0 ? (
               <div className="text-center py-10 text-gray-500 text-sm font-bold">No syndicates formed yet. Be the first.</div>
            ) : (
              <div className="space-y-3">
                {topClans.map((clan, idx) => (
                  <div key={clan.id} className="bg-[#0B0F17] p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      idx === 1 ? 'bg-gray-300/20 text-gray-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-gray-500'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        {clan.name} <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">[{clan.tag}]</span>
                      </h4>
                      <p className="text-xs text-gray-500">Power: {clan.total_power}</p>
                    </div>
                    
                    {/* If user has no clan, let them join this one instantly */}
                    {!userClan && (
                      <button 
                        onClick={() => handleJoinClan(clan.id)}
                        className="text-[10px] bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                      >
                        Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
