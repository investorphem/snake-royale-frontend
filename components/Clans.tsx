'use client';

import { useState } from "react";

export default function Clans() {
  const [hasClan, setHasClan] = useState(false);
  const [activeView, setActiveView] = useState<'hub' | 'create'>('hub');

  const topClans = [
    { rank: 1, name: 'Venom Cartel', members: '48/50', power: '245K', yield: '+15%' },
    { rank: 2, name: 'Celo Kings', members: '50/50', power: '210K', yield: '+12%' },
    { rank: 3, name: 'Neon Serpents', members: '42/50', power: '189K', yield: '+10%' },
  ];

  const activeWars = [
    { title: 'Sector 7 Domination', pool: '5,000 cUSD', endsIn: '12h 45m', status: 'LIVE' },
    { title: 'Global Liquidity Raid', pool: '12,500 cUSD', endsIn: '2d 14h', status: 'UPCOMING' }
  ];

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
            <div className="bg-[#111722] p-6 rounded-3xl border border-blue-500/20 flex flex-col items-center text-center">
              {!hasClan ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-4xl mb-4 shadow-inner">
                    👤
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-wide">No Affiliation</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-sm">
                    You are currently operating as a solo agent. Join a syndicate to access multiplier yields, or create your own to lead.
                  </p>
                  <div className="flex gap-4 w-full max-w-xs">
                    <button 
                      onClick={() => setActiveView('create')}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                      Create Clan
                    </button>
                    <button 
                      onClick={() => setActiveView('hub')}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-white/5"
                    >
                      Find Clan
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Active Clan View Placeholder */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                    🐍
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1 tracking-wide">Venom Cartel</h3>
                  <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest mb-6">
                    Rank #1 Global
                  </span>
                  <button onClick={() => setHasClan(false)} className="text-sm text-gray-500 hover:text-red-400 underline">
                    Leave Syndicate
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ACTIVE WAR DEPLOYMENTS */}
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-6">Global War Deployments</h3>
            <div className="space-y-4">
              {activeWars.map((war, idx) => (
                <div key={idx} className="bg-[#0B0F17] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group hover:border-red-500/30 transition-all cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full animate-pulse ${war.status === 'LIVE' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                      <span className={`text-[10px] font-black tracking-widest uppercase ${war.status === 'LIVE' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {war.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-lg">{war.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">Ends in: <span className="text-gray-300 font-mono">{war.endsIn}</span></p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Prize Pool</p>
                    <p className="text-xl font-black text-yellow-500">{war.pool}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Top Syndicates */}
        <div className="lg:col-span-5">
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 h-full">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-6">Top Syndicates</h3>

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

            <button className="w-full mt-6 py-3 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-xl transition-all text-sm">
              View Global Leaderboard →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
