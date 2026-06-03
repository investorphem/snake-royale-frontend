'use client';

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { supabase } from "@/lib/supabaseClient";

interface ProductItem {
  id: string;
  name: string;
  category: 'consumable' | 'skin' | 'arena';
  description: string;
  price: number;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  badgeColor: string;
}

const CATALOG: ProductItem[] = [
  // Consumables Category
  { id: 'speed', name: 'Turbo Velocity Charge', category: 'consumable', description: 'Gives +100% velocity boost for mid-game escaping.', price: 2.00, icon: '⚡', rarity: 'Common', badgeColor: 'bg-zinc-800 text-gray-300' },
  { id: 'shield', name: 'Aegis Quantum Shield', category: 'consumable', description: 'Deploys invincibility barrier to absorb single wall collisions.', price: 3.50, icon: '🛡️', rarity: 'Rare', badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' },
  { id: 'magnet', name: 'Singularity Orbs Magnet', category: 'consumable', description: 'Generates deep suction pull vacuum drawing close proximity food.', price: 5.00, icon: '🧲', rarity: 'Epic', badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  // Skins Category
  { id: 'golden', name: 'Midas Golden King Skin', category: 'skin', description: 'Permits ultimate on-chain prestige. Emits radiant particles.', price: 25.00, icon: '👑', rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' },
  { id: 'cyber', name: 'Synthetic Cyber Snake Skin', category: 'skin', description: 'Glitch-wave aesthetic matching specialized terminal runs.', price: 15.00, icon: '🤖', rarity: 'Epic', badgeColor: 'bg-purple-950 text-purple-400 border border-purple-500/20' },
  { id: 'magma', name: 'Molten Magma Flow Skin', category: 'skin', description: 'Animated volcanic plate textures responding dynamically.', price: 12.50, icon: '🌋', rarity: 'Epic', badgeColor: 'bg-orange-950 text-orange-400 border border-orange-500/20' },
  // Arenas Category
  { id: 'arena_cyber', name: 'Neon Matrix Domain', category: 'arena', description: 'Unlocks complete multiplayer wraparound boundary map rights.', price: 30.00, icon: '🌐', rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' },
  { id: 'arena_void', name: 'Abyssal Gravity Space Map', category: 'arena', description: 'Enables dark space mapping featuring center drag mechanics.', price: 20.00, icon: '🌌', rarity: 'Legendary', badgeColor: 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' },
  { id: 'arena_toxic', name: 'Radioactive Sludge Sector', category: 'arena', description: 'Mutates target layouts spawning hazardous shrink green fields.', price: 10.00, icon: '☣️', rarity: 'Rare', badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' }
];

interface CartItem {
  product: ProductItem;
  quantity: number;
}

export default function Shop() {
  const account = useActiveAccount();
  const [activeCategory, setActiveCategory] = useState<'all' | 'consumable' | 'skin' | 'arena'>('all');
  
  // Shopping Cart & Config Modal states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Computed Values
  const totalCartCost = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredCatalog = CATALOG.filter(item => activeCategory === 'all' || item.category === activeCategory);

  const handleOpenConfigModal = (product: ProductItem) => {
    setSelectedProduct(product);
    setModalQuantity(1); // Reset counter
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
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

    setSelectedProduct(null); // Dismiss Modal
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => setCart([]);

  const handleExecuteCartCheckout = async () => {
    if (!account?.address) return alert("Please authenticate your wallet to execute trades.");
    if (cart.length === 0) return;

    setIsProcessingCheckout(true);
    try {
      const lowerAddress = account.address.toLowerCase();

      for (const item of cart) {
        if (item.product.category === 'consumable') {
          const { data } = await supabase
            .from('inventory_items')
            .select(item.product.id)
            .eq('wallet_address', lowerAddress)
            .single();

          // FIXED: Explicitly cast data to "any" to allow runtime variable key lookup
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

      alert("Assets Securely Minted to Inventory Profile!");
      setCart([]); 
    } catch (err: any) {
      console.error("Store execution pipeline failure:", err);
      alert("Checkout failure: " + err.message);
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
            TRADING CONCOURSE
          </h2>
          <p className="text-gray-400 font-semibold text-sm">Deploy multi-stablecoin liquidity to load premium assets.</p>
        </div>

        {/* Categories Tab Toggles */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-fit select-none">
          {(['all', 'consumable', 'skin', 'arena'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
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
            <div key={product.id} className="bg-[#111722] p-5 rounded-2xl border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-all h-52">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-black/40 w-12 h-12 flex items-center justify-center rounded-xl shadow-inner select-none">{product.icon}</span>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${product.badgeColor} mt-1 inline-block`}>
                        {product.rarity}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mt-2 leading-relaxed">{product.description}</p>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2">
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Asset Valuation</p>
                  <p className="text-lg font-black text-white font-mono">${product.price.toFixed(2)}</p>
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
          <div className="xl:col-span-4 bg-[#111722] p-5 rounded-2xl border border-indigo-500/20 animate-fade-in flex flex-col gap-4 sticky top-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                🛍️ Asset Basket <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">{totalCartUnits}</span>
              </h4>
              <button onClick={handleClearCart} className="text-[10px] font-bold text-gray-500 hover:text-red-400 uppercase tracking-wider transition-colors">Clear</button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs animate-fade-in">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl bg-black/40 w-8 h-8 rounded-lg flex items-center justify-center select-none">{item.product.icon}</span>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{item.product.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">Qty: {item.quantity} × ${item.product.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFromCart(item.product.id)} className="text-gray-600 hover:text-red-400 font-bold px-1 text-base transition-colors ml-2 select-none">✕</button>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
              <div className="flex justify-between items-end font-bold">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Aggregate Value</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">${totalCartCost.toFixed(2)}</span>
              </div>
              <button
                onClick={handleExecuteCartCheckout}
                disabled={isProcessingCheckout}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-800 disabled:text-gray-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] active:scale-98"
              >
                {isProcessingCheckout ? 'MINTING LEDGER SECURES...' : 'AUTHORIZE BUNDLE CHECKOUT'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* POP-UP ON-DEMAND PURCHASE CONFIGURATION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-[#111722] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-base select-none">✕</button>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl bg-black/40 w-12 h-12 flex items-center justify-center rounded-xl shadow-inner select-none">{selectedProduct.icon}</span>
              <div>
                <h3 className="font-black text-base text-white">{selectedProduct.name}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">${selectedProduct.price.toFixed(2)} unit allocation</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6 leading-relaxed border-t border-white/5 pt-3">{selectedProduct.description}</p>

            {selectedProduct.category === 'consumable' ? (
              <div className="mb-6 flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Configure Quantity</label>
                <div className="flex items-center bg-black/40 rounded-xl border border-white/5 p-1 w-full max-w-[140px] justify-between h-10 select-none">
                  <button onClick={() => setModalQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">-</button>
                  <span className="font-black text-sm text-white font-mono">{modalQuantity}</span>
                  <button onClick={() => setModalQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">+</button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[10px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-2">
                ℹ️ Unique Asset type limited to maximum 1 unit per account allocation.
              </div>
            )}

            <div className="border-t border-white/5 pt-4 flex justify-between items-center">
              <div>
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Subtotal Value</p>
                <p className="text-xl font-black text-white font-mono">${(selectedProduct.price * modalQuantity).toFixed(2)}</p>
              </div>
              <button
                onClick={handleAddToCart}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md"
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