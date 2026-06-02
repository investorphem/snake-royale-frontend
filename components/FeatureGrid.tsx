'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface FeatureGridProps {
  onSelectAction?: (actionType: string) => void;
}

export default function FeatureGrid({ onSelectAction }: FeatureGridProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Real-time telemetry state
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [topClan, setTopClan] = useState<any>(null);
  const [activeWar, setActiveWar] = useState<any>(null);
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
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">TOP RANKED PROTOCOL AGENTS</p>
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
      title: 'YIELD DISTRIBUTION',
      subtitle: 'Active Liquidity Pools',
      description: 'Secure verified multi-player reward pools.',
      icon: '💰',
      borderColor: 'hover:border-yellow-500/50',
      textColor: 'group-hover:text-yellow-400',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">LIVE ARENA VOLUMES</p>
          <div className="bg-black/40 p-4 rounded-lg border border-white/5 text-center">
            {isLoading ? (
               <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
            ) : activeWar ? (
              <>
                <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-widest">{activeWar.title} Pool</span>
                <span className="text-2xl font-black text-yellow-500 mt-1 block">{activeWar.prize_pool}</span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-gray-500 block font-bold">ACTIVE LIQUIDITY</span>
                <span className="text-lg font-black text-white">Awaiting Deployment</span>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'nft',
      title: 'NFT SKINS',
      subtitle: 'Cosmetic Armory',
      description: 'Unlock rare cryptographic assets.',
      icon: '👑',
      borderColor: 'hover:border-purple-500/50',
      textColor: 'group-hover:text-purple-400',
      content: (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold mb-2">AVAILABLE ASSET UPGRADES</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { name: 'Golden King', price: '25.00 USDC', icon: '👑', color: 'border-yellow-500/30' },
              { name: 'Cyber Snake', price: '15.00 USDC', icon: '🤖', color: 'border-purple-500/30' },
              { name: 'Magma Flow', price: '12.50 USDC', icon: '🌋', color: 'border-red-500/30' }
            ].map((skin, idx) => (
              <div key={idx} className={`flex justify-between items-center bg-black/40 p-3 rounded-lg border text-sm ${skin.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{skin.icon}</span>
                  <span className="font-bold text-gray-300">{skin.name}</span>
                </div>
                <span className="font-black text-purple-400">{skin.price}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'syndicate',
      title: 'SYNDICATE CLANS',
      subtitle: 'Multi-agent Vaults',
      description: 'Form groups to control the ecosystem.',
      icon: '🛡️',
      borderColor: 'hover:border-blue-500/50',
      textColor: 'group-hover:text-blue-400',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold mb-2">APEX SYNDICATE</p>
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
            </div>
          </div>
        );
      })()}
    </>
  );
}