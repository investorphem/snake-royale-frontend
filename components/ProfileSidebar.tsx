'use client';

interface ProfileSidebarProps {
  accountAddress?: string;
  trophies?: number;
  level?: number;
  xp?: number;
  matchesPlayed?: number;
  winRate?: number;
}

export default function ProfileSidebar({
  accountAddress,
  trophies = 1420,
  level = 4,
  xp = 65,
  matchesPlayed = 48,
  winRate = 72
}: ProfileSidebarProps) {
  
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 flex flex-col h-full justify-between shadow-2xl backdrop-blur-sm">
      <div>
        {/* PLAYER IDENTITY HERO */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 via-green-500 to-indigo-600 p-[2px] shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <div className="w-full h-full bg-[#0B0F17] rounded-2xl flex items-center justify-center text-3xl">
                🐍
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-black text-xs px-1.5 py-0.5 rounded-md border-2 border-[#111722]">
              PRO
            </div>
          </div>
          
          <div className="flex-grow">
            <h3 className="font-black text-lg tracking-wide text-white">
              {accountAddress ? formatAddress(accountAddress) : "Anonymous Snake"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-yellow-500 text-sm">🏆</span>
              <span className="text-sm font-bold text-gray-300">{trophies.toLocaleString()} Trophies</span>
            </div>
          </div>
        </div>

        {/* PROGRESSION LAYER */}
        <div className="bg-[#0B0F17] p-4 rounded-2xl border border-white/5 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black tracking-widest text-gray-400">RANK LEVEL {level}</span>
            <span className="text-xs font-bold text-green-400">{xp}% to Level {level + 1}</span>
          </div>
          <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden p-[1px]">
            <div 
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
              style={{ width: `${xp}%` }}
            />
          </div>
        </div>

        {/* FINANCIAL ASSET COMPLIANCE MONITOR */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-black tracking-widest text-gray-500 uppercase">Vault Balances</h4>
          
          {/* cUSD Card */}
          <div className="flex justify-between items-center bg-[#0B0F17] p-4 rounded-xl border border-white/5 hover:border-green-500/20 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center font-bold text-green-400 text-sm">
                $
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">Celo Dollar</p>
                <p className="text-xs text-gray-600 font-medium">Stable Asset</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-white">10.50</p>
              <p className="text-[10px] text-gray-500 font-bold">cUSD</p>
            </div>
          </div>

          {/* CELO Card */}
          <div className="flex justify-between items-center bg-[#0B0F17] p-4 rounded-xl border border-white/5 hover:border-yellow-500/20 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center font-bold text-yellow-500 text-sm">
                C
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">Native CELO</p>
                <p className="text-xs text-gray-600 font-medium">Gas Token</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-white">4.25</p>
              <p className="text-[10px] text-gray-500 font-bold">CELO</p>
            </div>
          </div>
        </div>

        {/* ARENA STATISTICS */}
        <div className="space-y-3">
          <h4 className="text-xs font-black tracking-widest text-gray-500 uppercase">Combat Logs</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5 text-center">
              <p className="text-2xl font-black text-white">{matchesPlayed}</p>
              <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mt-1">Matches</p>
            </div>
            <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5 text-center">
              <p className="text-2xl font-black text-green-400">{winRate}%</p>
              <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mt-1">Win Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK INVENTORY PREVIEW */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Active Equips</span>
          <span className="text-xs text-[#84cc16] font-bold cursor-pointer hover:underline">Customize →</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0B0F17] aspect-square rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group hover:border-[#84cc16]/30 transition-all">
            <span className="text-xl">🟢</span>
            <span className="text-[9px] text-gray-500 font-bold">Neon Skin</span>
          </div>
          <div className="bg-[#0B0F17] aspect-square rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group hover:border-[#84cc16]/30 transition-all">
            <span className="text-xl">⚡</span>
            <span className="text-[9px] text-gray-500 font-bold">Spark Trail</span>
          </div>
          <div className="bg-[#0B0F17] aspect-square rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group hover:border-[#84cc16]/30 transition-all">
            <span className="text-xl">👑</span>
            <span className="text-[9px] text-gray-500 font-bold">Royale Crown</span>
          </div>
        </div>
      </div>
    </div>
  );
}