'use client';

import { useState } from "react";

export default function Inventory() {
  const [equippedSkin, setEquippedSkin] = useState('classic');

  const ownedSkins = [
    {
      id: 'classic',
      name: 'Classic Green',
      rarity: 'Common',
      icon: '🐍',
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'golden',
      name: 'Golden King',
      rarity: 'Legendary',
      icon: '👑',
      color: 'from-yellow-300 to-yellow-600'
    },
    {
      id: 'cyber',
      name: 'Cyber Snake',
      rarity: 'Epic',
      icon: '🤖',
      color: 'from-purple-400 to-purple-600'
    }
  ];

  const stats = [
    { label: 'Games Played', value: '156' },
    { label: 'High Score', value: '12,540' },
    { label: 'Longest Snake', value: '892' },
    { label: 'Wins', value: '78' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10">
      
      {/* INVENTORY HEADER */}
      <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#84cc16] to-[#22c55e] tracking-wide mb-1">
          ASSET INVENTORY
        </h2>
        <p className="text-gray-400 font-semibold text-sm">Manage your cryptographic skins and view lifetime telemetry.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT: OWNED SKINS */}
        <div className="bg-[#111722] p-6 rounded-3xl border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm">Owned Snakes</h3>
            <span className="text-[#84cc16] text-xs font-bold bg-[#84cc16]/10 px-3 py-1 rounded-full">
              {ownedSkins.length} Assets
            </span>
          </div>

          <div className="space-y-3">
            {ownedSkins.map((skin) => (
              <div 
                key={skin.id}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-4 ${
                  equippedSkin === skin.id 
                    ? 'bg-[#0B0F17] border-[#84cc16] shadow-[0_0_15px_rgba(132,204,22,0.15)]' 
                    : 'bg-[#0B0F17] border-white/5'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${skin.color} flex items-center justify-center text-2xl shadow-inner`}>
                  {skin.icon}
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-white">{skin.name}</h4>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${
                    skin.rarity === 'Legendary' ? 'text-yellow-500' : 
                    skin.rarity === 'Epic' ? 'text-purple-400' : 'text-gray-400'
                  }`}>
                    {skin.rarity}
                  </p>
                </div>
                <button 
                  onClick={() => setEquippedSkin(skin.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    equippedSkin === skin.id 
                      ? 'bg-[#84cc16]/20 text-[#84cc16]' 
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {equippedSkin === skin.id ? 'Equipped' : 'Equip'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: LIFETIME STATS */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 flex-grow">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-6">Lifetime Statistics</h3>
            
            <div className="space-y-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <span className="text-gray-300 font-semibold">{stat.label}</span>
                  <span className="font-black text-white text-lg">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#84cc16]/20 to-transparent p-[1px] rounded-3xl">
            <div className="bg-[#111722] p-6 rounded-3xl border border-[#84cc16]/20 flex justify-between items-center cursor-pointer hover:bg-[#151d2b] transition-colors">
              <div>
                <h4 className="font-bold text-white mb-1">Verify on Explorer</h4>
                <p className="text-xs text-gray-400">View all your on-chain assets on Celoscan.</p>
              </div>
              <span className="text-2xl">🔗</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}