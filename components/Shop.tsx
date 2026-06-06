'use client';

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { 
  createThirdwebClient, 
  defineChain, 
  getContract, 
  prepareContractCall, 
  sendTransaction, 
  waitForReceipt 
} from "thirdweb";

// FIX 1: Remove hardcoded clientId fallback — if env var is missing,
// fail loudly rather than silently using a broken/garbled key.
const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
}); 

const mainnetChain = defineChain(42220);
const TREASURY_WALLET_ADDRESS = "0xec24bAfBc989a9bE5f6F0eAD8848753B5E4aE0B6"; 

// ==========================================
// UI AUDIO SYNTHESIZER
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
    this.init(); if (!this.ctx) return;
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.05);
  }
  playCheckout() {
    this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.3);
  }
}
const uiSfx = new UISynth();

// ==========================================
// TYPES & CATALOG
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
  { id: 'speed',        name: 'Turbo Velocity Charge',    category: 'consumable', description: 'Gives +100% velocity boost for mid-game escaping.',              price: 2.00,  image: '/assets/powerup_speed.png',   rarity: 'Common',    badgeColor: 'bg-zinc-800 text-gray-300' },
  { id: 'shield',       name: 'Aegis Quantum Shield',     category: 'consumable', description: 'Deploys invincibility barrier to absorb single wall collisions.', price: 3.50,  image: '/assets/powerup_shield.png',  rarity: 'Rare',      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'magnet',       name: 'Singularity Orbs Magnet',  category: 'consumable', description: 'Generates deep suction pull vacuum drawing close proximity food.',price: 5.00,  image: '/assets/powerup_magnet.png',  rarity: 'Epic',      badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  { id: 'skin_classic', name: 'Classic Green Serpent',    category: 'skin',       description: 'The original smooth scale aesthetic. A true classic.',           price: 5.00,  image: '/assets/classic_head.png',    rarity: 'Common',    badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'skin_cyber',   name: 'Synthetic Cyber Snake',    category: 'skin',       description: 'Glitch-wave aesthetic with neon cyan LED optical sensors.',      price: 15.00, image: '/assets/cyber_head.png',      rarity: 'Epic',      badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  { id: 'skin_golden',  name: 'Midas Golden King',        category: 'skin',       description: 'Permits ultimate on-chain prestige. Features the Royal Crown.',  price: 25.00, image: '/assets/golden_head.png',     rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' },
  { id: 'arena_default',name: 'Neon Matrix Domain',       category: 'arena',      description: 'Dark cyberpunk hexagonal honeycomb tech floor.',                 price: 10.00, image: '/assets/arena_default.png',   rarity: 'Common',    badgeColor: 'bg-zinc-800 text-gray-300' },
  { id: 'arena_jungle', name: 'Toxic Swamp Sector',       category: 'arena',      description: 'Mutated alien jungle terrain with bioluminescent flora.',        price: 15.00, image: '/assets/arena_jungle.png',    rarity: 'Rare',      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'arena_lava',   name: 'Volcanic Magma Flow',      category: 'arena',      description: 'Intense cracking lava rock perfect for high-pressure matches.',  price: 20.00, image: '/assets/arena_lava.png',      rarity: 'Epic',      badgeColor: 'bg-orange-950 text-orange-400 border border-orange-500/20' },
  { id: 'arena_space',  name: 'Abyssal Gravity Space',    category: 'arena',      description: 'Deep space nebula mapping with glowing purple stardust.',        price: 25.00, image: '/assets/arena_space.png',     rarity: 'Legendary', badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  { id: 'arena_vault',  name: 'Royal Treasury Vault',     category: 'arena',      description: 'Luxurious polished marble inlaid with gold circuit lines.',      price: 35.00, image: '/assets/arena_vault.png',     rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' },
];

interface CartItem { product: ProductItem; quantity: number; }

export default function Shop({ selectedCoin }: { selectedCoin: { symbol: string; address: string; decimals: number; color: string } }) {
  const account = useActiveAccount();
  const [activeCategory, setActiveCategory] = useState<'all' | 'consumable' | 'skin' | 'arena'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');

  const totalCartCost  = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const filteredCatalog = CATALOG.filter(item => activeCategory === 'all' || item.category === activeCategory);

  const handleOpenConfigModal = (product: ProductItem) => {
    uiSfx.playClick();
    setSelectedProduct(product);
    setModalQuantity(1);
  };

  // FIX 2: Non-consumables are capped at qty 1 and blocked if already in cart.
  // Previously the clamp only fired when the item was already in the cart,
  // letting you add a second modal entry for skins/arenas.
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    uiSfx.playClick();

    const isUnique = selectedProduct.category !== 'consumable';

    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.product.id === selectedProduct.id);

      if (existingIndex > -1) {
        if (isUnique) return prev; // Block duplicate unique items entirely
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + modalQuantity,
        };
        return updated;
      }

      return [...prev, { product: selectedProduct, quantity: isUnique ? 1 : modalQuantity }];
    });

    setSelectedProduct(null);
  };

  const handleRemoveFromCart = (productId: string) => { uiSfx.playClick(); setCart(prev => prev.filter(i => i.product.id !== productId)); };
  const handleClearCart = () => { uiSfx.playClick(); setCart([]); };

  // ==========================================
  // CHECKOUT — PAY ON-CHAIN THEN MINT VIA API
  // ==========================================
  const handleExecuteCartCheckout = async () => {
    if (!account) return alert("Please authenticate your wallet.");
    if (cart.length === 0) return;

    uiSfx.playCheckout();
    setIsProcessingCheckout(true);
    setCheckoutStatus('Preparing transaction...');

    try {
      // Step 1: On-chain payment
      const currencyContract = getContract({ client, chain: mainnetChain, address: selectedCoin.address });
      const multiplier  = BigInt(10) ** BigInt(selectedCoin.decimals - 2);
      const totalInWei  = BigInt(Math.round(totalCartCost * 100)) * multiplier;

      const transferTx = prepareContractCall({
        contract: currencyContract,
        method: "function transfer(address to, uint256 value) returns (bool)",
        params: [TREASURY_WALLET_ADDRESS, totalInWei],
      });

      setCheckoutStatus(`Confirm payment in wallet...`);
      const { transactionHash } = await sendTransaction({
        transaction: { ...transferTx, feeCurrency: selectedCoin.address } as any,
        account,
      });

      setCheckoutStatus('Waiting for confirmation...');
      await waitForReceipt({ transactionHash, client, chain: mainnetChain });

      // FIX 3: Mint items via SECURE BACKEND ROUTES — never write to Supabase
      // directly from the frontend after payment. The backend verifies the tx hash
      // before granting items, preventing anyone from faking purchases.
      setCheckoutStatus('Minting items...');

      for (const item of cart) {
        if (item.product.category === 'consumable') {
          // Uses /api/shop/purchase which verifies tx hash + prevents replay attacks
          const res = await fetch('/api/shop/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: account.address,
              itemType: item.product.id,
              quantity: item.quantity,
              transactionHash,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Consumable mint failed');

        } else {
          // FIX 4: Skins and arenas use the same /api/shop/buy route
          // with a unified 'inventory_items' table — no more split between
          // 'inventory' and 'inventory_items' tables causing inconsistency.
          const res = await fetch('/api/shop/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: account.address,
              itemType: item.product.id,
              quantity: 1,
              transactionHash,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Item mint failed');
        }
      }

      setCheckoutStatus('');
      alert(`✅ Payment confirmed! ${totalCartCost.toFixed(2)} ${selectedCoin.symbol} transferred.`);
      setCart([]);

    } catch (err: any) {
      console.error("Checkout error:", err);
      setCheckoutStatus('');
      alert(`Checkout failed: ${err.message || 'Transaction was cancelled or failed.'}`);
    } finally {
      setIsProcessingCheckout(false);
      setCheckoutStatus('');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-16">

      {/* HEADER */}
      <div className="bg-[#111722] p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden">
        <div>
          <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 tracking-wide mb-1">PREMIUM ARMORY</h2>
          <p className="text-gray-400 font-semibold text-sm">Currency: <span className={`${selectedCoin.color} font-bold`}>{selectedCoin.symbol}</span></p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-fit select-none">
          {(['all', 'consumable', 'skin', 'arena'] as const).map(cat => (
            <button key={cat} onClick={() => { uiSfx.playClick(); setActiveCategory(cat); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* CATALOG */}
        <div className={`${cart.length > 0 ? 'xl:col-span-8' : 'xl:col-span-12'} grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300`}>
          {filteredCatalog.map(product => {
            const inCart = cart.some(i => i.product.id === product.id);
            const isUnique = product.category !== 'consumable';

            return (
              <div key={product.id} className="bg-[#111722] p-5 rounded-2xl border border-white/5 flex flex-col justify-between group hover:border-indigo-500/30 transition-all h-56 shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-4">
                      <div className="bg-[#06090E] border border-white/10 w-16 h-16 flex items-center justify-center rounded-xl shadow-inner select-none p-2 group-hover:scale-110 transition-transform duration-300">
                        <img src={product.image} alt={product.name} className={`w-full h-full object-contain ${product.category === 'arena' ? 'rounded-md' : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${product.badgeColor} mt-1.5 inline-block`}>{product.rarity}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2">
                  <div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Price ({selectedCoin.symbol})</p>
                    <p className={`text-lg font-black ${selectedCoin.color} font-mono`}>{product.price.toFixed(2)}</p>
                  </div>
                  {/* Show "In Cart" badge for unique items already added */}
                  {isUnique && inCart ? (
                    <span className="px-4 py-2 bg-green-900/40 text-green-400 border border-green-500/20 font-black text-xs uppercase tracking-wider rounded-xl">✓ In Cart</span>
                  ) : (
                    <button onClick={() => handleOpenConfigModal(product)}
                      className="px-4 py-2 bg-gray-800 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95">
                      Purchase
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CART */}
        {cart.length > 0 && (
          <div className="xl:col-span-4 bg-[#111722] p-5 rounded-2xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)] animate-fade-in flex flex-col gap-4 sticky top-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                🛍️ Asset Basket <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">{totalCartUnits}</span>
              </h4>
              <button onClick={handleClearCart} className="text-[10px] font-bold text-gray-500 hover:text-red-400 uppercase tracking-wider transition-colors">Clear</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {cart.map(item => (
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
                <span className="text-xs text-gray-400 uppercase tracking-wider">Total ({selectedCoin.symbol})</span>
                <span className={`text-2xl font-black ${selectedCoin.color} font-mono`}>{totalCartCost.toFixed(2)}</span>
              </div>
              {checkoutStatus && (
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest text-center animate-pulse">{checkoutStatus}</p>
              )}
              <button onClick={handleExecuteCartCheckout} disabled={isProcessingCheckout}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-800 disabled:text-gray-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] active:scale-95 flex items-center justify-center gap-2">
                {isProcessingCheckout
                  ? <><span className="animate-spin text-lg">⚙️</span> {checkoutStatus || `PAYING...`}</>
                  : `PAY ${totalCartCost.toFixed(2)} ${selectedCoin.symbol}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PRODUCT MODAL */}
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
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${selectedProduct.badgeColor} mt-2 inline-block`}>{selectedProduct.rarity} Tier</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed text-center px-2">{selectedProduct.description}</p>

            {selectedProduct.category === 'consumable' ? (
              <div className="mb-6 flex flex-col items-center gap-2 bg-[#06090E] p-4 rounded-xl border border-white/5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Quantity</label>
                <div className="flex items-center bg-[#111722] rounded-xl border border-white/10 p-1 w-full max-w-[160px] justify-between h-12 select-none">
                  <button onClick={() => { uiSfx.playClick(); setModalQuantity(q => Math.max(1, q - 1)); }} className="w-10 h-10 flex items-center justify-center font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">-</button>
                  <span className="font-black text-lg text-white font-mono">{modalQuantity}</span>
                  <button onClick={() => { uiSfx.playClick(); setModalQuantity(q => Math.min(99, q + 1)); }} className="w-10 h-10 flex items-center justify-center font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">+</button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[11px] font-bold text-indigo-300 uppercase tracking-wide flex flex-col items-center text-center gap-2">
                <span className="text-xl">🔒</span>
                Unique asset — limited to 1 unit per account.
              </div>
            )}

            <div className="border-t border-white/10 pt-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Subtotal ({selectedCoin.symbol})</p>
                <p className={`text-2xl font-black ${selectedCoin.color} font-mono`}>{(selectedProduct.price * modalQuantity).toFixed(2)}</p>
              </div>
              <button onClick={handleAddToCart}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95">
                Add to Basket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
