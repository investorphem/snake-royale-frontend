'use client';

import { useState } from "react";

interface FeatureGridProps {
  onSelectAction?: (actionType: string) => void;
}

export default function FeatureGrid({ onSelectAction }: FeatureGridProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

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
          <div className="space-y-2">
            {[
              { rank: '🥇 1', user: '0x71C...8941', score: '18,420 TRPH' },
              { rank: '🥈 2', user: '0x3A2...F19c', score: '16,110 TRPH' },
              { rank: '🥉 3', user: '0x9bE...7781', score: '14,950 TRPH' }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between bg-black/40 p-2.5 rounded-lg border border-white/5 text-sm">
                <span className="font-bold text-gray-300">{item.rank} {item.user}</span>
                <span className="font-mono text-green-400 font-bold">{item.score}</span>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-gray-500 block font-bold">GLOBAL TVL</span>
              <span className="text-lg font-black text-white">42,850 cUSD</span>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-gray-500 block font-bold">TOTAL PAYOUTS</span>
              <span className="text-lg font-black text-yellow-500">128.4K cUSD</span>
            </div>
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
          <div className="grid grid-cols-3 gap-2">
            {['🔥 Magma', '❄️ Glacial', '🌌 Cosmic'].map((skin, idx) => (
              <div key={idx} className="bg-black/40 p-2 rounded-lg border border-white/5 text-center cursor-pointer hover:border-purple-500/30">
                <span className="text-xs font-bold block text-gray-300">{skin}</span>
                <span className="text-[9px] text-purple-400 font-mono">0.5 CELO</span>
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
        <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-center">
          <p className="text-sm text-gray-300 font-medium">No Active Clan Affiliation</p>
          <button className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-md transition-all">
            Initialize Syndicate
          </button>
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