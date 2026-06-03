'use client';

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction, waitForReceipt, getContract, createThirdwebClient, defineChain } from "thirdweb";
import { supabase } from "@/lib/supabaseClient";

// 1. Setup Client & Chain
const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" 
}); 
const celoMainnet = defineChain(42220);

// 2. Stablecoin Addresses & Game Treasury
const TREASURY_ADDRESS = "0xec24bAfBc989a9bE5f6F0eAD8848753B5E4aE0B6";

const CURRENCIES = {
  USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6 },
  USDT: { address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", decimals: 6 },
  USDm: { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18 }
} as const;

type CurrencySymbol = keyof typeof CURRENCIES;

// Asset Catalogs
const MASTER_SKINS = [
  { id: 'golden', name: 'Golden King', rarity: 'Legendary', price: 25.00, icon: '👑', color: 'from-yellow-300 to-yellow-600' },
  { id: 'cyber', name: 'Cyber Snake', rarity: 'Epic', price: 15.00, icon: '🤖', color: 'from-purple-400 to-purple-600' },
  { id: 'magma', name: 'Magma Flow', rarity: 'Epic', price: 12.50, icon: '🌋', color: 'from-orange-500 to-red-600' }
];

const POWER_UPS = [
  { id: 'speed', name: 'Speed Boost', desc: 'Double your movement velocity for 5 seconds.', price: 2.00, icon: '⚡', color: 'from-yellow-400 to-amber-500' },
  { id: 'shield', name: 'Invincibility', desc: 'Survive head-on wall collisions safely.', price: 5.00, icon: '🛡️', color: 'from-blue-400 to-indigo-600' },
  { id: 'magnet', name: 'Food Magnet', desc: 'Pull distant energy orbs automatically.', price: 3.00, icon: '🧲', color: 'from-purple-400 to-fuchsia-600' }
];

// NEW: Premium Arenas
const PREMIUM_ARENAS = [
  { id: 'arena_cyber', name: 'Neon Matrix', rarity: 'Legendary', price: 50.00, icon: '🌐', color: 'from-blue-500 to-blue-900' },
  { id: 'arena_magma', name: 'Volcanic Fissure', rarity: 'Epic', price: 40.00, icon: '🔥', color: 'from-red-600 to-orange-900' },
  { id: 'arena_toxic', name: 'Radioactive Sludge', rarity: 'Rare', price: 30.00, icon: '☣️', color: 'from-green-500 to-emerald-900' },
  { id: 'arena_void', name: 'Abyssal Space', rarity: 'Legendary', price: 55.00, icon: '🌌', color: 'from-purple-600 to-indigo-900' },
  { id: 'arena_temple', name: 'Golden Sands', rarity: 'Epic', price: 45.00, icon: '🏛️', color: 'from-yellow-600 to-amber-900' }
];

export default function Shop() {
  const account = useActiveAccount();
  
  // State
  const [ownedItems, setOwnedItems] = useState<string[]>([]); // Holds both skins AND arenas
  const [powerUpBalances, setPowerUpBalances] = useState<Record<string, number>>({ speed: 0, shield: 0, magnet: 0 });
  const [quantities, setQuantities] = useState<Record<string, number>>({ speed: 1, shield: 1, magnet: 1 });
  
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencySymbol>('USDC');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState('');

  const fetchInventory = async () => {
    if (!account?.address) return;
    const lowerAddress = account.address.toLowerCase();

    // Fetch Unique Items (Skins & Arenas)
    const { data: uniqueData } = await supabase.from('inventory').select('item_id').eq('wallet_address', lowerAddress);
    if (uniqueData) setOwnedItems(uniqueData.map(i => i.item_id));

    // Fetch Stackable Power-ups
    const { data: powerData } = await supabase.from('inventory_items').select('speed, shield, magnet').eq('wallet_address', lowerAddress).single();
    if (powerData) setPowerUpBalances({ speed: powerData.speed || 0, shield: powerData.shield || 0, magnet: powerData.magnet || 0 });
  };

  useEffect(() => { fetchInventory(); }, [account?.address]);

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + delta) }));
  };

  const handlePurchase = async (itemId: string, unitPrice: number, isPowerUp: boolean = false) => {
    if (!account?.address) return alert("Please connect your wallet first.");
    
    const quantity = isPowerUp ? (quantities[itemId] || 1) : 1;
    const totalPrice = unitPrice * quantity;
    
    setProcessingId(itemId);
    try {
      const currency = CURRENCIES[preferredCurrency];
      const tokenContract = getContract({ client, chain: celoMainnet, address: currency.address });
      const priceInSmallestUnit = BigInt(Math.round(totalPrice * (10 ** currency.decimals)));

      setTxStatus(`Authorizing ${totalPrice.toFixed(2)} ${preferredCurrency}...`);
      
      const transferTx = prepareContractCall({
        contract: tokenContract,
        method: "function transfer(address to, uint256 amount) returns (bool)",
        params: [TREASURY_ADDRESS, priceInSmallestUnit]
      });

      const { transactionHash } = await sendTransaction({ transaction: transferTx, account });
      
      setTxStatus('Confirming payment on ledger...');
      await waitForReceipt({ transactionHash, client, chain: celoMainnet });
      setTxStatus('Securing asset to your inventory...');

      if (isPowerUp) {
        const response = await fetch('/api/shop/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: account.address, itemType: itemId, quantity: quantity, transactionHash })
        });
        if (!response.ok) throw new Error("Database delivery failed");
        
        setPowerUpBalances(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + quantity }));
        setQuantities(prev => ({ ...prev, [itemId]: 1 }));
      } else {
        // Unlocks Skins OR Arenas permanently
        const { error } = await supabase.from('inventory').insert([{ wallet_address: account.address.toLowerCase(), item_id: itemId }]);
        if (error) throw error;
        setOwnedItems(prev => [...prev, itemId]);
      }

      alert("Purchase Successful! Asset secured in your inventory.");
    } catch (error: any) {
      alert("Transaction failed or was rejected.");
    } finally {
      setProcessingId(null);
      setTxStatus('');
    }
  };

  return (
    <div className="w-full flex flex-col gap-10 animate-fade-in pb-16">
      
      {/* SHOP HEADER */}
      <div className="bg-[#111722] p-6 lg:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div className="z-10 relative">
          <h2 className="text-3xl lg:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-wide mb-1">
            COSMETIC ARMORY
          </h2>
          <p className="text-gray-400 font-semibold text-sm">Secure exclusive assets and power-ups using stablecoins.</p>
        </div>
        <div className="z-10 bg-[#0B0F17] border border-white/10 p-2 rounded-xl flex items-center gap-2 max-w-fit">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Pay With:</span>
          <select value={preferredCurrency} onChange={(e) => setPreferredCurrency(e.target.value as CurrencySymbol)} className="bg-transparent text-white font-black outline-none cursor-pointer p-1">
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="USDm">USDm</option>
          </select>
        </div>
      </div>

      {txStatus && <div className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 p-4 rounded-xl text-center font-bold animate-pulse">{txStatus}</div>}

      {/* SECTION 1: POWER-UPS */}
      <div>
        <h4 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-4 pl-2">Combat Power-Ups (Stackable)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POWER_UPS.map((power) => (
             /* ... Keep existing Power-up rendering logic ... */
             <div key={power.id} className="bg-[#0B0F17] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between group relative overflow-hidden">
             <div>
               <div className="flex justify-between items-start mb-4">
                 <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${power.color} flex items-center justify-center text-3xl shadow-inner relative z-10`}>{power.icon}</div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Consumable</span>
                   {account?.address && <span className="text-xs text-gray-400 font-bold mt-1">Owned: {powerUpBalances[power.id] || 0}</span>}
                 </div>
               </div>
               <h3 className="text-lg font-bold text-white mb-1 z-10 relative">{power.name}</h3>
               <p className="text-xs text-gray-400 z-10 relative mb-4 h-8 line-clamp-2">{power.desc}</p>
               
               <div className="bg-[#111722] border border-white/5 rounded-xl p-2 flex items-center justify-between mb-2">
                 <span className="text-xs font-bold text-gray-400 pl-1">Quantity:</span>
                 <div className="flex items-center gap-3">
                   <button onClick={() => updateQuantity(power.id, -1)} disabled={(quantities[power.id] || 1) <= 1 || !!processingId} className="w-7 h-7 rounded-lg bg-gray-800 text-white font-bold transition-all disabled:opacity-30">-</button>
                   <span className="text-sm font-black text-white min-w-[16px] text-center">{quantities[power.id] || 1}</span>
                   <button onClick={() => updateQuantity(power.id, 1)} disabled={!!processingId} className="w-7 h-7 rounded-lg bg-gray-800 text-white font-bold transition-all disabled:opacity-30">+</button>
                 </div>
               </div>
             </div>
             
             <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/5 z-10 relative">
               <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                 <span>Unit: {power.price.toFixed(2)}</span>
                 <span className="font-bold text-gray-300">Total: {(power.price * (quantities[power.id] || 1)).toFixed(2)} {preferredCurrency}</span>
               </div>
               <button onClick={() => handlePurchase(power.id, power.price, true)} disabled={!!processingId} className="w-full text-xs bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2.5 rounded-xl font-black uppercase transition-all disabled:opacity-50">
                 {processingId === power.id ? 'Processing...' : `Buy ${quantities[power.id] || 1}`}
               </button>
             </div>
           </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: COSMETIC SKINS */}
      <div>
        <h4 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-4 pl-2">Cosmetic Snake Skins</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MASTER_SKINS.map((skin) => {
            const isOwned = ownedItems.includes(skin.id);
            return (
              <div key={skin.id} className="bg-[#0B0F17] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${skin.color} flex items-center justify-center text-3xl shadow-inner`}>{skin.icon}</div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${skin.rarity === 'Legendary' ? 'text-yellow-500' : 'text-purple-400'}`}>{skin.rarity}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{skin.name}</h3>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                  <span className="text-sm font-black text-gray-300">{skin.price.toFixed(2)} {preferredCurrency}</span>
                  {isOwned ? (
                    <span className="text-xs bg-gray-800 text-gray-400 px-4 py-2 rounded-lg font-bold">Acquired</span>
                  ) : (
                    <button onClick={() => handlePurchase(skin.id, skin.price, false)} disabled={!!processingId} className="text-xs bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50">
                      {processingId === skin.id ? 'Processing...' : 'Purchase'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: PREMIUM ARENAS */}
      <div>
        <h4 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-4 pl-2">Premium Arenas</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREMIUM_ARENAS.map((arena) => {
            const isOwned = ownedItems.includes(arena.id); // Re-uses the exact same array as skins!
            return (
              <div key={arena.id} className="bg-[#0B0F17] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-full h-24 rounded-xl bg-gradient-to-tr ${arena.color} flex items-center justify-center text-4xl shadow-inner mb-4`}>
                      {arena.icon}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{arena.name}</h3>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${arena.rarity === 'Legendary' ? 'text-yellow-500' : arena.rarity === 'Epic' ? 'text-purple-400' : 'text-blue-400'}`}>{arena.rarity}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                  <span className="text-sm font-black text-gray-300">{arena.price.toFixed(2)} {preferredCurrency}</span>
                  {isOwned ? (
                    <span className="text-xs bg-gray-800 text-gray-400 px-4 py-2 rounded-lg font-bold">Acquired</span>
                  ) : (
                    <button onClick={() => handlePurchase(arena.id, arena.price, false)} disabled={!!processingId} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50">
                      {processingId === arena.id ? 'Processing...' : 'Purchase'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}