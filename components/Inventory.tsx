'use client';

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";

// Master catalogs for cosmetic skin classifications
const MASTER_SKINS: Record<string, any> = {
  'classic': { id: 'classic', name: 'Classic Green', rarity: 'Common', icon: '🐍', color: 'from-green-400 to-green-600' },
  'golden': { id: 'golden', name: 'Golden King', rarity: 'Legendary', icon: '👑', color: 'from-yellow-300 to-yellow-600' },
  'cyber': { id: 'cyber', name: 'Cyber Snake', rarity: 'Epic', icon: '🤖', color: 'from-purple-400 to-purple-600' },
  'magma': { id: 'magma', name: 'Magma Flow', rarity: 'Epic', icon: '🌋', color: 'from-orange-500 to-red-600' }
};

// Master catalogs for premium map arena classifications
const MASTER_ARENAS: Record<string, any> = {
  'classic': { id: 'classic', name: 'Classic Grid', rarity: 'Common', icon: '🏁', color: 'from-zinc-700 to-zinc-900' },
  'arena_cyber': { id: 'arena_cyber', name: 'Neon Matrix', rarity: 'Legendary', icon: '🌐', color: 'from-blue-500 to-blue-900' },
  'arena_magma': { id: 'arena_magma', name: 'Volcanic Fissure', rarity: 'Epic', icon: '🔥', color: 'from-red-600 to-orange-900' },
  'arena_toxic': { id: 'arena_toxic', name: 'Radioactive Sludge', rarity: 'Rare', icon: '☣️', color: 'from-green-500 to-emerald-900' },
  'arena_void': { id: 'arena_void', name: 'Abyssal Space', rarity: 'Legendary', icon: '🌌', color: 'from-purple-600 to-indigo-900' },
  'arena_temple': { id: 'arena_temple', name: 'Golden Sands', rarity: 'Epic', icon: '🏛️', color: 'from-yellow-600 to-amber-900' }
};

export default function Inventory() {
  const account = useActiveAccount();
  
  // Custom Equip States
  const [equippedSkin, setEquippedSkin] = useState('classic');
  const [equippedArena, setEquippedArena] = useState('classic');
  
  // Inventory Catalogs
  const [ownedSkins, setOwnedSkins] = useState<any[]>([]);
  const [ownedArenas, setOwnedArenas] = useState<any[]>([]);
  const [powerUpBalances, setPowerUpBalances] = useState({ speed: 0, shield: 0, magnet: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Lifetime Performance Metrics
  const [stats, setStats] = useState({
    xp: 0,
    gamesPlayed: 0, 
    wins: 0
  });

  const fetchPlayerData = async () => {
    if (!account?.address) return;
    const lowerAddress = account.address.toLowerCase();
    setIsLoading(true);

    try {
      // 1. Fetch Player Metadata Profiles (XP, custom selections, totals)
      const { data: player } = await supabase
        .from('players')
        .select('xp, current_skin_id, current_arena_id, games_played, wins')
        .eq('wallet_address', lowerAddress)
        .single();

      if (player) {
        setEquippedSkin(player.current_skin_id || 'classic');
        setEquippedArena(player.current_arena_id || 'classic');
        setStats({
          xp: player.xp || 0,
          gamesPlayed: player.games_played || 0,
          wins: player.wins || 0
        });
      }

      // 2. Fetch Unique Owned Unlocks (Filters item listings into skins vs maps)
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('item_id')
        .eq('wallet_address', lowerAddress);

      const userSkinsList = [MASTER_SKINS['classic']];
      const userArenasList = [MASTER_ARENAS['classic']];

      if (inventoryData && inventoryData.length > 0) {
        inventoryData.forEach(item => {
          // If the item ID belongs to a known skin, push it to skins catalog
          if (MASTER_SKINS[item.item_id] && item.item_id !== 'classic') {
            userSkinsList.push(MASTER_SKINS[item.item_id]);
          }
          // If the item ID belongs to a known arena map, push it to arenas catalog
          if (MASTER_ARENAS[item.item_id] && item.item_id !== 'classic') {
            userArenasList.push(MASTER_ARENAS[item.item_id]);
          }
        });
      }
      setOwnedSkins(userSkinsList);
      setOwnedArenas(userArenasList);

      // 3. Fetch Stackable Consumable Counts from inventory_items
      const { data: powerData } = await supabase
        .from('inventory_items')
        .select('speed, shield, magnet')
        .eq('wallet_address', lowerAddress)
        .single();

      if (powerData) {
        setPowerUpBalances({
          speed: powerData.speed || 0,
          shield: powerData.shield || 0,
          magnet: powerData.magnet || 0
        });
      }

    } catch (error) {
      console.error("Error syncing asset logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerData();
  }, [account?.address]);

  // Handle equipping skins instantly
  const handleEquipSkin = async (skinId: string) => {
    setEquippedSkin(skinId); 
    if (account?.address) {
      await supabase
        .from('players')
        .update({ current_skin_id: skinId })
        .eq('wallet_address', account.address.toLowerCase());
    }
  };

  // Handle equipping maps/arenas instantly
  const handleEquipArena = async (arenaId: string) => {
    setEquippedArena(arenaId);
    if (account?.address) {
      await supabase
        .from('players')
        .update({ current_arena_id: arenaId })
        .eq('wallet_address', account.address.toLowerCase());
    }
  };

  if (!account) {
    return <div className="text-center py-20 text-gray-500 font-bold">Please connect your wallet to view inventory.</div>;
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-12">
      
      {/* INVENTORY HEADER */}
      <div className="bg-[#111722] p-6 lg:p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#84cc16] to-[#22c55e] tracking-wide mb-1">
          ASSET INVENTORY
        </h2>
        <p className="text-gray-400 font-semibold text-sm">Manage unlocked custom styles, map modifications, and power-up vaults.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ATTACHED PERMANENT CONFIGURATIONS (SKINS & ARENAS) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* SECTION 1: CUSTOM SNAKE SKINS */}
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Custom Snake Skins</h3>
              <span className="text-[#84cc16] text-[10px] font-black uppercase tracking-wider bg-[#84cc16]/10 px-2.5 py-0.5 rounded-md">
                {ownedSkins.length} Unlocked
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse"><div className="h-16 bg-gray-800 rounded-xl w-full"></div></div>
            ) : (
              <div className="space-y-2.5">
                {ownedSkins.map((skin) => (
                  <div key={skin.id} className={`p-3 rounded-xl border transition-all flex items-center gap-4 bg-[#0B0F17] ${equippedSkin === skin.id ? 'border-[#84cc16] shadow-[0_0_15px_rgba(132,204,22,0.1)]' : 'border-white/5'}`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${skin.color} flex items-center justify-center text-xl shadow-inner flex-shrink-0`}>{skin.icon}</div>
                    <div className="flex-grow truncate">
                      <h4 className="font-bold text-white text-sm truncate">{skin.name}</h4>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${skin.rarity === 'Legendary' ? 'text-yellow-500' : skin.rarity === 'Epic' ? 'text-purple-400' : 'text-gray-500'}`}>{skin.rarity}</p>
                    </div>
                    <button onClick={() => handleEquipSkin(skin.id)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all select-none ${equippedSkin === skin.id ? 'bg-[#84cc16]/20 text-[#84cc16] cursor-default' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                      {equippedSkin === skin.id ? 'Equipped' : 'Equip'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: PREMIUM MAP ARENAS */}
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Unlocked Map Arenas</h3>
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-wider bg-blue-500/10 px-2.5 py-0.5 rounded-md">
                {ownedArenas.length} Unlocked
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse"><div className="h-16 bg-gray-800 rounded-xl w-full"></div></div>
            ) : (
              <div className="space-y-2.5">
                {ownedArenas.map((arena) => (
                  <div key={arena.id} className={`p-3 rounded-xl border transition-all flex items-center gap-4 bg-[#0B0F17] ${equippedArena === arena.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5'}`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${arena.color} flex items-center justify-center text-xl shadow-inner flex-shrink-0`}>{arena.icon}</div>
                    <div className="flex-grow truncate">
                      <h4 className="font-bold text-white text-sm truncate">{arena.name}</h4>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${arena.rarity === 'Legendary' ? 'text-yellow-500' : arena.rarity === 'Epic' ? 'text-purple-400' : 'text-gray-500'}`}>{arena.rarity}</p>
                    </div>
                    <button onClick={() => handleEquipArena(arena.id)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all select-none ${equippedArena === arena.id ? 'bg-blue-500/20 text-blue-400 cursor-default' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                      {equippedArena === arena.id ? 'Active' : 'Equip'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CONSUMABLE POWER-UPS STORAGE & METRICS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* SECTION 3: CONSUMABLE COMBAT POWER-UPS VAULT */}
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-4">Power-Ups Stockpile</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'speed', name: 'Speed', count: powerUpBalances.speed, icon: '⚡', color: 'text-yellow-400 border-yellow-500/10' },
                { id: 'shield', name: 'Shield', count: powerUpBalances.shield, icon: '🛡️', color: 'text-blue-400 border-blue-500/10' },
                { id: 'magnet', name: 'Magnet', count: powerUpBalances.magnet, icon: '🧲', color: 'text-purple-400 border-purple-500/10' },
              ].map((power) => (
                <div key={power.id} className={`bg-[#0B0F17] p-4 rounded-xl border flex flex-col items-center justify-center text-center relative ${power.color}`}>
                  <span className="text-2xl mb-1 select-none">{power.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{power.name}</span>
                  <span className="text-xl font-black text-white mt-2 bg-white/5 px-3 py-0.5 rounded-md min-w-[36px] border border-white/5 shadow-inner">
                    {isLoading ? '...' : power.count}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-500 font-semibold text-center uppercase tracking-wider mt-4">These items stack and exhaust automatically when deployed in matches</p>
          </div>

          {/* SECTION 4: LIFETIME PROFILE DATA */}
          <div className="bg-[#111722] p-6 rounded-3xl border border-white/5">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-5">Lifetime Telemetry</h3>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Experience</span>
                <span className="font-black text-white text-base font-mono">{stats.xp.toLocaleString()} <span className="text-xs text-gray-500">XP</span></span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Matches Initiated</span>
                <span className="font-black text-white text-base font-mono">{stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Bounty Victories</span>
                <span className="font-black text-white text-base font-mono">{stats.wins}</span>
              </div>
            </div>
          </div>

          {/* BLOCKCHAIN LEDGER BLOCK EXPLORER BUTTON */}
          <div className="bg-gradient-to-r from-[#84cc16]/20 to-transparent p-[1px] rounded-3xl">
            <a 
              href={`https://celoscan.io/address/${account.address}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-[#111722] p-5 rounded-3xl border border-[#84cc16]/20 flex justify-between items-center cursor-pointer hover:bg-[#151d2b] transition-colors"
            >
              <div>
                <h4 className="font-bold text-white text-sm mb-0.5 flex items-center gap-1.5">
                  Verify Audit Ledger
                </h4>
                <p className="text-[11px] text-gray-400 font-medium">Verify your custom cosmetic items and on-chain logs on Celoscan.</p>
              </div>
              <span className="text-xl select-none flex-shrink-0 pl-2">🔗</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}