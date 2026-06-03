'use client';

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";
import { 
  createThirdwebClient, 
  defineChain, 
  getContract, 
  prepareContractCall, 
  sendTransaction, 
  waitForReceipt 
} from "thirdweb";

// ==========================================
// BLOCKCHAIN CONFIGURATION
// ==========================================
const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" 
}); 

const mainnetChain = defineChain(42220); // Celo Mainnet for real stablecoins
const TREASURY_WALLET_ADDRESS = "0xec24bAfBc989a9bE5f6F0eAD8848753B5E4aE0B6"; 

// ==========================================
// UI AUDIO SYNTHESIZER (Tactile Shop Sounds)
// ==========================================
class UISynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playCheckout() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}
const uiSfx = new UISynth();

// ==========================================
// SHOP INTERFACES & CATALOG
// ==========================================
interface ProductItem {
  id: string;
  name: string;
  category: 'consumable' | 'skin' | 'arena';
  description: string;
  price: number;
  image: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  badgeColor: string;
}

const CATALOG: ProductItem[] = [
  // Consumables Category
  { id: 'speed', name: 'Turbo Velocity Charge', category: 'consumable', description: 'Gives +100% velocity boost for mid-game escaping.', price: 2.00, image: '/assets/powerup_speed.png', rarity: 'Common', badgeColor: 'bg-zinc-800 text-gray-300' },
  { id: 'shield', name: 'Aegis Quantum Shield', category: 'consumable', description: 'Deploys invincibility barrier to absorb single wall collisions.', price: 3.50, image: '/assets/powerup_shield.png', rarity: 'Rare', badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'magnet', name: 'Singularity Orbs Magnet', category: 'consumable', description: 'Generates deep suction pull vacuum drawing close proximity food.', price: 5.00, image: '/assets/powerup_magnet.png', rarity: 'Epic', badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },

  // Skins Category
  { id: 'skin_classic', name: 'Classic Green Serpent', category: 'skin', description: 'The original smooth scale aesthetic. A true classic.', price: 5.00, image: '/assets/classic_head.png', rarity: 'Common', badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'skin_cyber', name: 'Synthetic Cyber Snake', category: 'skin', description: 'Glitch-wave aesthetic with neon cyan LED optical sensors.', price: 15.00, image: '/assets/cyber_head.png', rarity: 'Epic', badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  { id: 'skin_golden', name: 'Midas Golden King', category: 'skin', description: 'Permits ultimate on-chain prestige. Features the Royal Crown.', price: 25.00, image: '/assets/golden_head.png', rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' },

  // Arenas Category
  { id: 'arena_default', name: 'Neon Matrix Domain', category: 'arena', description: 'Dark cyberpunk hexagonal honeycomb tech floor.', price: 10.00, image: '/assets/arena_default.png', rarity: 'Common', badgeColor: 'bg-zinc-800 text-gray-300' },
  { id: 'arena_jungle', name: 'Toxic Swamp Sector', category: 'arena', description: 'Mutated alien jungle terrain with bioluminescent flora.', price: 15.00, image: '/assets/arena_jungle.png', rarity: 'Rare', badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'arena_lava', name: 'Volcanic Magma Flow', category: 'arena', description: 'Intense cracking lava rock perfect for high-pressure matches.', price: 20.00, image: '/assets/arena_lava.png', rarity: 'Epic', badgeColor: 'bg-orange-950 text-orange-400 border border-orange-500/20' },
  { id: 'arena_space', name: 'Abyssal Gravity Space', category: 'arena', description: 'Deep space nebula mapping with glowing purple stardust.', price: 25.00, image: '/assets/arena_space.png', rarity: 'Legendary', badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  { id: 'arena_vault', name: 'Royal Treasury Vault', category: 'arena', description: 'Luxurious polished marble inlaid with gold circuit lines.', price: 35.00, image: '/assets/arena_vault.png', rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' }
];

interface CartItem {
  product: ProductItem;
  quantity: number;
}

// Accept the dynamic selected coin from the App Navigation
export default function Shop({ selectedCoin }: { selectedCoin: { symbol: string, address: string, decimals: number, color: string } }) {
  const account = useActiveAccount();
  const [activeCategory, setActiveCategory] = useState<'all' | 'consumable' | 'skin' | 'arena'>('all');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const totalCartCost = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredCatalog = CATALOG.filter(item => activeCategory === 'all' || item.category === activeCategory);

  const handleOpenConfigModal = (product: ProductItem) => {
    uiSfx.playClick();
    setSelectedProduct(product);
    setModalQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    uiSfx.playClick();

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === selectedProduct.id);
      if (existingIndex > -1) {
        const newCart = [...prevCart];
        const clampLimit = selectedProduct.category !== 'consumable' ? 1 : newCart[existingIndex].quantity + modalQuantity;
        newCart[existingIndex].quantity = clampLimit;
        return newCart;
      }
      return [...prevCart, { product: selectedProduct, quantity: modalQuantity }];
    });

    setSelectedProduct(null); 
  };

  const handleRemoveFromCart = (productId: string) => {
    uiSfx.playClick();
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    uiSfx.playClick();
    setCart([]);
  };

  // ==========================================
  // REAL WEB3 PAYMENT & MINTING FLOW
  // ==========================================
  const handleExecuteCartCheckout = async () => {
    if (!account) return alert("Please authenticate your wallet to execute trades.");
    if (cart.length === 0) return;

    uiSfx.playCheckout();
    setIsProcessingCheckout(true);

    try {
      // 1. Initialize the contract using the EXACT coin the user selected in the nav
      const currencyContract = getContract({ 
        client, 
        chain: mainnetChain, 
        address: selectedCoin.address 
      });

      // 2. Convert Price to Wei Safely (Handles 18 decimals for USDm vs 6 decimals for USDC/USDT)
      const multiplier = BigInt(10) ** BigInt(selectedCoin.decimals - 2);
      const totalInWei = BigInt(Math.round(totalCartCost * 100)) * multiplier;

      // 3. Prepare the smart contract call
      const transferTx = prepareContractCall({
        contract: currencyContract,
        method: "function transfer(address to, uint256 value) returns (bool)",
        params: [TREASURY_WALLET_ADDRESS, totalInWei]
      });

      // 4. Trigger wallet payment WITH Celo Fee Currency Override (Gas Abstraction)
      const { transactionHash } = await sendTransaction({
        transaction: {
          ...transferTx,
          feeCurrency: selectedCoin.address // <--- Allows gas to be paid in the stablecoin!
        } as any, 
        account
      });

      // 5. Wait for Blockchain Confirmation
      await waitForReceipt({
        transactionHash,
        client,
        chain: mainnetChain
      });

      // 6. IF PAYMENT SUCCESSFUL -> MINT ITEMS TO DATABASE
      const lowerAddress = account.address.toLowerCase();

      for (const item of cart) {
        if (item.product.category === 'consumable') {
          const { data } = await supabase
            .from('inventory_items')
            .select(item.product.id)
            .eq('wallet_address', lowerAddress)
            .single();

          const currentCount = data ? Number((data as any)[item.product.id]) || 0 : 0;

          await supabase
            .from('inventory_items')
            .upsert({
              wallet_address: lowerAddress,
              [item.product.id]: currentCount + item.quantity
            }, { onConflict: 'wallet_address' });

        } else {
          await supabase
            .from('inventory')
            .insert([{
              wallet_address: lowerAddress,
              item_id: item.product.id
            }]);
        }
      }

      alert(`Payment Verified! ${totalCartCost.toFixed(2)} ${selectedCoin.symbol} transferred successfully.`);
      setCart([]); 
    } catch (err: any) {
      console.error("Store execution pipeline failure:", err);
      alert("Checkout failure: Transaction was cancelled or failed.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-16">

      {/* HEADER SECTION */}
      <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden">
        <div>
          <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 tracking-wide mb-1">
            PREMIUM ARMORY
          </h2>
          <p className="text-gray-400 font-semibold text-sm">Active Settlement Currency: <span className={`${selectedCoin.color} font-bold`}>{selectedCoin.symbol}</span></p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-fit select-none">
          {(['all', 'consumable', 'skin', 'arena'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { uiSfx.playClick(); setActiveCategory(cat); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* PRODUCT CATALOG GRID DISPLAY */}
        <div className={`${cart.length > 0 ? 'xl:col-span-8' : 'xl:col-span-12'} grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300`}>
          {filteredCatalog.map((product) => (
            <div key={product.id} className="bg-[#111722] p-5 rounded-2xl border border-white/5 flex flex-col justify-between group hover:border-indigo-500/30 transition-all h-56 shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-4">
                    {/* PREMIUM ASSET IMAGE CONTAINER */}
                    <div className="bg-[#06090E] border border-white/10 w-16 h-16 flex items-center justify-center rounded-xl shadow-inner select-none p-2 group-hover:scale-110 transition-transform duration-300">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className={`w-full h-full object-contain ${product.category === 'arena' ? 'rounded-md' : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]'}`} 
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${product.badgeColor} mt-1.5 inline-block`}>
                        {product.rarity}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2">
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Price in {selectedCoin.symbol}</p>
                  <p className={`text-lg font-black ${selectedCoin.color} font-mono`}>{product.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleOpenConfigModal(product)}
                  className="px-4 py-2 bg-gray-800 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  Purchase
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* PREMIUM MULTI-ITEM BASKET DRAWER */}
        {cart.length > 0 && (
          <div className="xl:col-span-4 bg-[#111722] p-5 rounded-2xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)] animate-fade-in flex flex-col gap-4 sticky top-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                🛍️ Asset Basket <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">{totalCartUnits}</span>
              </h4>
              <button onClick={handleClearCart} className="text-[10px] font-bold text-gray-500 hover:text-red-400 uppercase tracking-wider transition-colors">Clear</button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="bg-[#06090E] border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs animate-fade-in">
                  <div className="flex items-center gap-3 truncate">
                    <div className="bg-black/50 w-10 h-10 rounded-lg p-1.5 flex items-center justify-center border border-white/5">
                       <img src={item.product.image} alt="cart item" className="w-full h-full object-contain" />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{item.product.name}</p>
                      <p className={`text-[10px] ${selectedCoin.color} font-mono`}>Qty: {item.quantity} × {item.product.price.toFixed(2)} {selectedCoin.symbol}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFromCart(item.product.id)} className="text-gray-600 hover:text-red-400 font-bold px-2 text-lg transition-colors select-none">✕</button>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
              <div className="flex justify-between items-end font-bold">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Total in {selectedCoin.symbol}</span>
                <span className={`text-2xl font-black ${selectedCoin.color} font-mono`}>{totalCartCost.toFixed(2)}</span>
              </div>
              <button
                onClick={handleExecuteCartCheckout}
                disabled={isProcessingCheckout}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-800 disabled:text-gray-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] active:scale-95 flex items-center justify-center gap-2"
              >
                {isProcessingCheckout ? (
                  <><span className="animate-spin text-lg">⚙️</span> PAYING IN {selectedCoin.symbol}...</>
                ) : (
                  `PAY ${totalCartCost.toFixed(2)} ${selectedCoin.symbol}`
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* POP-UP ON-DEMAND PURCHASE CONFIGURATION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-[#111722] border border-indigo-500/30 w-full max-w-sm rounded-2xl p-6 shadow-[0_0_50px_rgba(99,102,241,0.15)] relative">
            <button onClick={() => { uiSfx.playClick(); setSelectedProduct(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl font-bold select-none">✕</button>

            <div className="flex flex-col items-center gap-4 mb-6 text-center mt-2">
              <div className="bg-[#06090E] w-24 h-24 rounded-2xl border border-white/10 p-3 shadow-inner flex items-center justify-center">
                 <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">{selectedProduct.name}</h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${selectedProduct.badgeColor} mt-2 inline-block`}>
                  {selectedProduct.rarity} Tier
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-6 leading-relaxed text-center px-2">{selectedProduct.description}</p>

            {selectedProduct.category === 'consumable' ? (
              <div className="mb-6 flex flex-col items-center gap-2 bg-[#06090E] p-4 rounded-xl border border-white/5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Quantity</label>
                <div className="flex items-center bg-[#111722] rounded-xl border border-white/10 p-1 w-full max-w-[160px] justify-between h-12 select-none">
                  <button onClick={() => { uiSfx.playClick(); setModalQuantity(q => Math.max(1, q - 1)); }} className="w-10 h-10 flex items-center justify-center font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">-</button>
                  <span className="font-black text-lg text-white font-mono">{modalQuantity}</span>
                  <button onClick={() => { uiSfx.playClick(); setModalQuantity(q => q + 1); }} className="w-10 h-10 flex items-center justify-center font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">+</button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[11px] font-bold text-indigo-300 uppercase tracking-wide flex flex-col items-center text-center gap-2">
                <span className="text-xl">🔒</span>
                Unique Asset type limited to maximum 1 unit per account allocation.
              </div>
            )}

            <div className="border-t border-white/10 pt-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Subtotal in {selectedCoin.symbol}</p>
                <p className={`text-2xl font-black ${selectedCoin.color} font-mono`}>{(selectedProduct.price * modalQuantity).toFixed(2)}</p>
              </div>
              <button
                onClick={handleAddToCart}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95"
              >
                Add to Basket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
