'use client';

import { useState } from "react";

export default function Shop() {
  const [selectedSkin, setSelectedSkin] = useState<string | null>('golden');

  const skins = [
    {
      id: 'classic',
      name: 'Classic Green',
      rarity: 'Common',
      price: 'Free',
      icon: '🐍',
      color: 'from-green-400 to-green-600',
      owned: true
    },
    {
      id: 'golden',
      name: 'Golden King',
      rarity: 'Legendary',
      price: '25.00 CELO',
      icon: '👑',
      color: 'from-yellow-300 to-yellow-600',
      owned: false
    },
    {
      id: 'cyber',
      name: 'Cyber Snake',
      rarity: 'Epic',
      price: '15.00 CELO',
      icon: '🤖',
      color: 'from-purple-400 to-purple-600',
      owned: false
    },
    {
      id: 'magma',
      name: 'Magma Flow',
      rarity: 'Epic',
      price: '12.50 CELO',
      icon: '🌋',
      color: 'from-orange-500 to-red-600',
      owned: false
    }
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      
      {/* SHOP HEADER */}
      <div className="bg-[#111722] p-6 lg:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex justify-between items-center">
        <div className="z-10 relative">
          <h2 className="text-3xl lg:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-wide mb-1">
            COSMETIC ARMORY
          </h2>
          <p className="text-gray-400 font-semibold text-sm">Trade CELO for exclusive on-chain assets.</p>
        </div>
        <div className="text-6xl opacity-20 absolute right-8 -bottom-4 transform rotate-12">
          💎
        </div>
      </div>

      {/* FEATURED DAILY ITEM */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-transparent p-[1px] rounded-3xl">
        <div className="bg-[#111722] p-6 rounded-3xl border border-yellow-500/20 flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transform hover:scale-105 transition-transform cursor-pointer">
            👑
          </div>
          <div className="flex-grow text-center sm:text-left">
            <span className="bg-yellow-500 text-black text-[10px] font-black tracking-widest px-2 py-1 rounded-md uppercase mb-2 inline-block">
              Daily Featured
            </span>
            <h3 className="text-2xl font-black text-white mb-1">The Golden King</h3>
            <p className="text-sm text-gray-400 mb-4">Leave a trail of gold dust. 20% bonus to end-of-match cUSD yield.</p>
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <span className="text-xl font-black text-yellow-500">25.00 CELO</span>
              <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                Mint NFT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MARKETPLACE GRID */}
      <div>
        <h4 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-4 pl-2">Available Mints</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skins.map((skin) => (
            <div 
              key={skin.id}
              onClick={() => setSelectedSkin(skin.id)}
              className={`bg-[#0B0F17] p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedSkin === skin.id ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${skin.color} flex items-center justify-center text-3xl shadow-inner`}>
                  {skin.icon}
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    skin.rarity === 'Legendary' ? 'text-yellow-500' : 
                    skin.rarity === 'Epic' ? 'text-purple-400' : 'text-gray-400'
                  }`}>
                    {skin.rarity}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{skin.name}</h3>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                <span className="text-sm font-black text-gray-300">{skin.price}</span>
                {skin.owned ? (
                  <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-lg font-bold">Owned</span>
                ) : (
                  <button className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors">
                    Buy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}