'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface FeatureGridProps {
  onSelectAction?: (actionType: 'arena' | 'shop' | 'tournament' | 'syndicate') => void;
}

export default function FeatureGrid({ onSelectAction }: FeatureGridProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Real-time telemetry state
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [topClan, setTopClan] = useState<any>(null);
  const [activeWar, setActiveWar] = useState<any>(null);
  const [tournamentPool, setTournamentPool] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGridTelemetry = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Top 3 Players by XP
        const { data: players } = await supabase
          .from('players')
          .select('username, xp')
          .order('xp', { ascending: false })
          .limit(3);
        if (players) setTopPlayers(players);

        // 2. Fetch #1 Global Syndicate
        const { data: clans } = await supabase
          .from('clans')
          .select('name, tag, total_power')
          .order('total_power', { ascending: false })
          .limit(1)
          .single();
        if (clans) setTopClan(clans);

        // 3. Fetch Highest Active War Pool
        const { data: wars } = await supabase
          .from('clan_wars')
          .select('title, prize_pool')
          .eq('status', 'LIVE')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        if (wars) setActiveWar(wars);

        // 4. NEW: Fetch Tournament entry count to display Live Grand Prix Stakes
        const { count } = await supabase
          .from('tournament_entries')
          .select('*', { count: 'exact', head: true })
          .eq('has_paid', true);
        
        if (count) setTournamentPool(count * 5); // 5 cUSD per entry fee

      } catch (error) {
        console.error("Failed to load feature grid telemetry:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGridTelemetry();
  }, []);

  const modules = [
    {
      id: 'compete',
      title: 'COMPETE',
      subtitle: 'Leaderboard Tier',
      description: 'Ascend global on-chain rank charts.',
      icon: '🏆',
      borderColor: 'hover:border-green-500/50',
      textColor: 'group-hover:text-green-400',
      actionLabel: 'Enter Tournament Lobby',
      targetTab: 'tournament' as const,
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">TOP GLOBAL RANKING AGENTS</p>
          {isLoading ? (
            <div className="h-20 bg-gray-800 rounded animate-pulse"></div>
          ) : topPlayers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No agents registered.</p>
          ) : (
            <div className="space-y-2">
              {topPlayers.map((player, idx) => (
                <div key={idx} className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="font-bold text-gray-300">{player.username}</span>
                  </div>
                  <span className="font-black text-green-400">{player.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'yield',
      title: 'YIELD JACKPOTS',
      subtitle: 'Tournament & Liquidity Pools',
      description: 'Secure verified multi-player escrow pools.',
      icon: '💰',
      borderColor: 'hover:border-yellow-500/50',
      textColor: 'group-hover:text-yellow-400',
      actionLabel: 'Launch Match Arena',
      targetTab: 'arena' as const,
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">LIVE ESCROW RESERVES</p>
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
            <div>
              <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-widest">Daily Grand Prix Pool</span>
              <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
                {isLoading ? '...' : `${tournamentPool}.00 cUSD`}
              </span>
            </div>
            
            <div className="border-t border-white/5 pt-2">
              <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-widest">
                {activeWar ? activeWar.title : 'Syndicate War'} Pool
              </span>
              <span className="text-xl font-black text-yellow-500 mt-0.5 block">
                {activeWar ? activeWar.prize_pool : 'Awaiting Deployment'}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'nft',
      title: 'COSMETIC ARMORY',
      subtitle: 'Skins & Arenas Store',
      description: 'Unlock unique skins, power-ups, and arenas.',
      icon: '👑',
      borderColor: 'hover:border-purple-500/50',
      textColor: 'group-hover:text-purple-400',
      actionLabel: 'Open Trading Store',
      targetTab: 'shop' as const,
      content: (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold mb-2">AVAILABLE STABLECOIN MINTS</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { name: 'Golden King Skin', price: '25.00', icon: '👑', color: 'border-yellow-500/20 text-yellow-400' },
              { name: 'Premium Map Arenas', price: '30.00+', icon: '🌌', color: 'border-blue-500/20 text-blue-400' },
              { name: 'Combat Power-Ups', price: '2.00+', icon: '⚡', color: 'border-green-500/20 text-green-400' }
            ].map((skin, idx) => (
              <div key={idx} className={`flex justify-between items-center bg-black/40 p-2.5 rounded-lg border text-xs ${skin.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{skin.icon}</span>
                  <span className="font-bold text-gray-300">{skin.name}</span>
                </div>
                <span className="font-black text-white">{skin.price} Stables</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 text-center font-semibold mt-1 uppercase tracking-wider">Supports USDC / USDT / USDm</p>
        </div>
      )
    },
    {
      id: 'syndicate',
      title: 'SYNDICATE CLANS',
      subtitle: 'Multi-agent Vaults',
      description: 'Form alliances to govern map territories.',
      icon: '🛡️',
      borderColor: 'hover:border-blue-500/50',
      textColor: 'group-hover:text-blue-400',
      actionLabel: 'Manage Alliances',
      targetTab: 'syndicate' as const,
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">APEX SYNDICATE ON-CHAIN</p>
          <div className="p-4 bg-black/40 rounded-lg border border-white/5 text-center">
            {isLoading ? (
              <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
            ) : topClan ? (
              <>
                <h4 className="font-black text-white text-lg">{topClan.name} <span className="text-gray-500 text-xs">[{topClan.tag}]</span></h4>
                <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-widest">Power: {topClan.total_power}</p>
              </>
            ) : (
              <p className="text-sm text-gray-300 font-medium">No Networks Formed</p>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      {/* GRID OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {modules.map((mod) => (
          <div
            key={mod.id}
            onClick={() => setActiveModal(mod.id)}
            className={`bg-[#111722] p-6 rounded-2xl border border-white/5 h-48 flex flex-col justify-end group transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${mod.borderColor}`}
          >
            <div className="text-3xl mb-auto opacity-60 group-hover:opacity-100 transition-opacity">
              {mod.icon}
            </div>
            <span className="text-[10px] font-black text-gray-500 tracking-wider block mb-1 uppercase">
              {mod.subtitle}
            </span>
            <h3 className={`font-black text-lg text-white transition-colors ${mod.textColor}`}>
              {mod.title}
            </h3>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {mod.description}
            </p>
          </div>
        ))}
      </div>

      {/* PORTAL MODAL WINDOW OVERLAY */}
      {activeModal && (() => {
        const selected = modules.find(m => m.id === activeModal);
        if (!selected) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-[#111722] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{selected.icon}</span>
                <div>
                  <h3 className="font-black text-xl text-white">{selected.title}</h3>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{selected.subtitle}</p>
                </div>
              </div>
              
              <div className="mt-4 border-t border-white/5 pt-4">
                {selected.content}
              </div>

              {/* ACTION CALL TO ACTION DEEP LINK BUTTON */}
              <button
                onClick={() => {
                  if (onSelectAction && selected.targetTab) {
                    onSelectAction(selected.targetTab);
                  }
                  setActiveModal(null); // Dismiss modal window
                }}
                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] active:scale-98"
              >
                {selected.actionLabel}
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}