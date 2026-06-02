'use client';

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction, waitForReceipt, getContract, createThirdwebClient, defineChain } from "thirdweb";
import { supabase } from "@/lib/supabaseClient";

// 1. Setup Client & Chain for Mainnet Purchasing
const client = createThirdwebClient({ 
  clientId: "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" 
}); 
const celoMainnet = defineChain(42220);

// 2. Stablecoin Addresses & Game Treasury
const TREASURY_ADDRESS = "0xec24bAfBc989a9bE5f6F0eAD8848753B5E4aE0B6"; // Replace with your actual receiving wallet

const CURRENCIES = {
  USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6 },
  USDT: { address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", decimals: 6 },
  USDm: { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18 }
} as const;

type CurrencySymbol = keyof typeof CURRENCIES;

const MASTER_SKINS = [
  { id: 'golden', name: 'Golden King', rarity: 'Legendary', price: 25.00, icon: '👑', color: 'from-yellow-300 to-yellow-600' },
  { id: 'cyber', name: 'Cyber Snake', rarity: 'Epic', price: 15.00, icon: '🤖', color: 'from-purple-400 to-purple-600' },
  { id: 'magma', name: 'Magma Flow', rarity: 'Epic', price: 12.50, icon: '🌋', color: 'from-orange-500 to-red-600' }
];

export default function Shop() {
  const account = useActiveAccount();
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencySymbol>('USDC');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState('');

  // Fetch user's current inventory so they don't buy duplicates
  useEffect(() => {
    const fetchInventory = async () => {
      if (!account?.address) return;
      const { data } = await supabase
        .from('inventory')
        .select('item_id')
        .eq('wallet_address', account.address.toLowerCase());
      
      if (data) setOwnedItems(data.map(i => i.item_id));
    };
    fetchInventory();
  }, [account?.address]);

  const handlePurchase = async (skinId: string, price: number) => {
    if (!account?.address) return alert("Please connect your wallet first.");
    
    setProcessingId(skinId);
    try {
      const currency = CURRENCIES[preferredCurrency];
      const tokenContract = getContract({ client, chain: celoMainnet, address: currency.address });
      
      // Convert standard price to token decimals
      const priceInSmallestUnit = BigInt(price * (10 ** currency.decimals));

      setTxStatus(`Authorizing ${price} ${preferredCurrency}...`);
      
      // Step 1: Transfer Stablecoin Directly to Treasury
      const transferTx = prepareContractCall({
        contract: tokenContract,
        method: "function transfer(address to, uint256 amount) returns (bool)",
        params: [TREASURY_ADDRESS, priceInSmallestUnit]
      });

      const { transactionHash } = await sendTransaction({ transaction: transferTx, account });
      
      setTxStatus('Confirming payment on ledger...');
      await waitForReceipt({ transactionHash, client, chain: celoMainnet });

      // Step 2: Unlock in Off-Chain Inventory Database
      setTxStatus('Securing asset to your inventory...');
      const { error } = await supabase
        .from('inventory')
        .insert([{ 
          wallet_address: account.address.toLowerCase(), 
          item_id: skinId 
        }]);

      if (error) throw error;

      setOwnedItems(prev => [...prev, skinId]);
      alert("Purchase Successful! Asset secured in your inventory.");

    } catch (error: any) {
      console.error(error);
      alert("Transaction failed or was rejected.");
    } finally {
      setProcessingId(null);
      setTxStatus('');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10">
      
      {/* SHOP HEADER */}
      <div className="bg-[#111722] p-6 lg:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div className="z-10 relative">
          <h2 className="text-3xl lg:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-wide mb-1">
            COSMETIC ARMORY
          </h2>
          <p className="text-gray-400 font-semibold text-sm">Secure exclusive assets using global stablecoins.</p>
        </div>
        
        {/* GLOBAL CURRENCY SELECTOR */}
        <div className="z-10 bg-[#0B0F17] border border-white/10 p-2 rounded-xl flex items-center gap-2 max-w-fit">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Pay With:</span>
          <select 
            value={preferredCurrency} 
            onChange={(e) => setPreferredCurrency(e.target.value as CurrencySymbol)}
            className="bg-transparent text-white font-black outline-none cursor-pointer p-1"
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="USDm">USDm</option>
          </select>
        </div>
      </div>

      {txStatus && (
        <div className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 p-4 rounded-xl text-center font-bold animate-pulse">
          {txStatus}
        </div>
      )}

      {/* MARKETPLACE GRID */}
      <div>
        <h4 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-4 pl-2">Available Mints</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MASTER_SKINS.map((skin) => {
            const isOwned = ownedItems.includes(skin.id);
            const isProcessing = processingId === skin.id;

            return (
              <div key={skin.id} className="bg-[#0B0F17] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${skin.color} flex items-center justify-center text-3xl shadow-inner`}>
                      {skin.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      skin.rarity === 'Legendary' ? 'text-yellow-500' : 'text-purple-400'
                    }`}>
                      {skin.rarity}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{skin.name}</h3>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                  <span className="text-sm font-black text-gray-300">{skin.price.toFixed(2)} {preferredCurrency}</span>
                  
                  {isOwned ? (
                    <span className="text-xs bg-gray-800 text-gray-400 px-4 py-2 rounded-lg font-bold">Acquired</span>
                  ) : (
                    <button 
                      onClick={() => handlePurchase(skin.id, skin.price)}
                      disabled={!!processingId}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                    >
                      {isProcessing ? 'Processing...' : 'Purchase'}
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