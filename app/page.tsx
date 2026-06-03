'use client';

import { useState, useEffect } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount, useConnect, useReadContract } from "thirdweb/react";
import { createThirdwebClient, defineChain, prepareContractCall, sendTransaction, waitForReceipt, getContract, readContract } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabaseClient";

// Component Panel Imports
import ProfileSidebar from "@/components/ProfileSidebar";
import FeatureGrid from "@/components/FeatureGrid";
import MobileNav from "@/components/MobileNav";
import Shop from "@/components/Shop";
import Inventory from "@/components/Inventory";
import Clans from "@/components/Clans";
import Tournament from "@/components/Tournament"; // Expanded: Connected the new tournament arena engine

const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" 
}); 

const gameNetwork = defineChain(11142220); // Testnet for development wagers
const mainnetChain = defineChain(42220);    // Celo Mainnet stablecoin asset validations   

const STABLECOINS = [
  { symbol: "USDm", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18, color: "text-green-400" },
  { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6, color: "text-blue-400" },
  { symbol: "USDT", address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", decimals: 6, color: "text-teal-400" },
];

const SNAKE_WAGER_ADDRESS = "0xF30b45003dCDe160B94962bB58FA8C2E9Ab70372";
const WAGER_CURRENCY_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; 

const wagerContract = getContract({ client, chain: gameNetwork, address: SNAKE_WAGER_ADDRESS });
const wagerCurrencyContract = getContract({ client, chain: gameNetwork, address: WAGER_CURRENCY_ADDRESS });

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

export default function Home() {
  return (
    <ThirdwebProvider>
      <SnakeRoyaleApp />
    </ThirdwebProvider>
  );
}

function SnakeRoyaleApp() {
  const account = useActiveAccount();
  
  const [appState, setAppState] = useState<'menu' | 'create' | 'join' | 'playing'>('menu');
  const [activeTab, setActiveTab] = useState<'home' | 'shop' | 'inventory' | 'clans' | 'profile' | 'tournament'>('home');
  const [txStatus, setTxStatus] = useState('');
  
  const [roomIdInput, setRoomIdInput] = useState('1');
  const [feeInput, setFeeInput] = useState('1');

  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  
  // NEW: Profile item selection state tracking to hydrate active arena boundaries inside Phaser loop
  const [equippedArena, setEquippedArena] = useState<'classic' | 'arena_cyber' | 'arena_magma' | 'arena_toxic' | 'arena_void' | 'arena_temple'>('classic');

  // Sync selected level elements from database profiles when navigation transitions occur
  useEffect(() => {
    const fetchEquippedArenaMapId = async () => {
      if (!account?.address) return;
      try {
        const { data } = await supabase
          .from('players')
          .select('current_arena_id')
          .eq('wallet_address', account.address.toLowerCase())
          .single();
        
        if (data?.current_arena_id) {
          setEquippedArena(data.current_arena_id as any);
        }
      } catch (err) {
        console.error("Failed syncing active area parameters:", err);
      }
    };
    fetchEquippedArenaMapId();
  }, [account?.address, activeTab, appState]);

  const fetchLiveRooms = async () => {
    setIsFetchingRooms(true);
    const roomsFound = [];
    
    for (let i = 1; i <= 10; i++) {
      try {
        const roomData = await readContract({
          contract: wagerContract,
          method: "function rooms(uint256) view returns (uint256 roomId, uint256 entryFee, address winner, bool isSettled, bool isActive)",
          params: [BigInt(i)]
        });
        
        if (roomData[4] === true) {
          roomsFound.push({
            roomId: Number(roomData[0]),
            entryFee: (Number(roomData[1]) / 1e18).toFixed(2)
          });
        }
      } catch (error) {
        // Ignore un-mined rooms
      }
    }
    setActiveRooms(roomsFound);
    setIsFetchingRooms(false);
  };

  useEffect(() => {
    if (appState === 'join') fetchLiveRooms();
  }, [appState]);

  const handleCreateRoom = async () => {
    if (!account) return;
    try {
      setTxStatus('Initializing Arena Protocol...');
      const feeInWei = BigInt(parseFloat(feeInput) * 1e18);
      const roomId = BigInt(roomIdInput);

      const createTx = prepareContractCall({
        contract: wagerContract,
        method: "function createRoom(uint256 _roomId, uint256 _entryFee)",
        params: [roomId, feeInWei]
      });

      const { transactionHash } = await sendTransaction({ transaction: createTx, account });
      await waitForReceipt({ transactionHash, client, chain: gameNetwork });

      alert(`Room ${roomId} created successfully! Proceeding to staking.`);
      setTxStatus('');
      setAppState('join'); 
    } catch (error) {
      console.error(error);
      alert("Failed to initialize room. Verify if ID is already active.");
      setTxStatus('');
    }
  };

  const handleJoinRoom = async (selectedRoomId: string, requiredFee: string) => {
    if (!account) return;
    try {
      setTxStatus(`Authorizing Stablecoin Vault for Room ${selectedRoomId}...`);
      const feeInWei = BigInt(parseFloat(requiredFee) * 1e18); 
      const roomId = BigInt(selectedRoomId);

      const approveTx = prepareContractCall({
        contract: wagerCurrencyContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [SNAKE_WAGER_ADDRESS, feeInWei]
      });
      const { transactionHash: approveHash } = await sendTransaction({ transaction: approveTx, account });
      await waitForReceipt({ transactionHash: approveHash, client, chain: gameNetwork });

      setTxStatus('Securing Asset Stake...');
      const joinTx = prepareContractCall({
        contract: wagerContract,
        method: "function joinRoom(uint256 _roomId)",
        params: [roomId]
      });
      const { transactionHash: joinHash } = await sendTransaction({ transaction: joinTx, account });
      await waitForReceipt({ transactionHash: joinHash, client, chain: gameNetwork });

      setTxStatus('');
      setAppState('playing');
    } catch (error) {
      console.error(error);
      alert("Verification failed. Check your wallet balance.");
      setTxStatus('');
    }
  };

  // --- SECURE BACKEND TELEMETRY SYNC ---
  const handleGameOver = async (finalScore: number) => {
    if (!account?.address) return;
    try {
      // 1. Sync User XP Profile points securely
      await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: account.address,
          score: finalScore 
        })
      });

      // 2. NEW: If user belongs to a syndicate clan, aggregate score directly to global clan power
      const lowerAddress = account.address.toLowerCase();
      const { data: membership } = await supabase
        .from('clan_members')
        .select('clan_id, war_points')
        .eq('wallet_address', lowerAddress)
        .single();

      if (membership && membership.clan_id) {
        // Increment user points contribution record
        const newMemberPoints = (membership.war_points || 0) + finalScore;
        await supabase
          .from('clan_members')
          .update({ war_points: newMemberPoints })
          .eq('wallet_address', lowerAddress);

        // Fetch and increment total power matrix on clans base table
        const { data: clanData } = await supabase
          .from('clans')
          .select('total_power')
          .eq('id', membership.clan_id)
          .single();

        if (clanData) {
          await supabase
            .from('clans')
            .update({ total_power: (clanData.total_power || 0) + finalScore })
            .eq('id', membership.clan_id);
          console.log(`⚔️ Added ${finalScore} Power points to Alliance Syndicate ID: ${membership.clan_id}`);
        }
      }

      console.log(`Successfully synced ${finalScore} XP via secure backend.`);
    } catch (error) {
      console.error("Failed to sync match data:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#06090E] text-white font-sans overflow-x-hidden selection:bg-[#84cc16] selection:text-black">
      
      {/* GLOBAL NAVBAR COMPONENT LAYER */}
      <nav className="w-full flex justify-between items-center p-4 lg:px-8 border-b border-white/5 bg-[#0B0F17]/80 backdrop-blur-md fixed top-0 z-50">
        <div className="flex items-center gap-3">
           <div onClick={() => setActiveTab('home')} className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#22c55e] flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer">
             SR
           </div>
           <span onClick={() => setActiveTab('home')} className="font-black italic text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 hidden sm:block cursor-pointer">
             SNAKE <span className="text-[#84cc16]">ROYALE</span>
           </span>
        </div>
        
        <div className="flex items-center gap-4">
          <MiniPayNav />
        </div>
      </nav>

      {/* DASHBOARD CONTAINER SCHEMAS */}
      <div className="pt-24 pb-24 px-4 lg:px-8 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {activeTab === 'shop' && <Shop />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'clans' && <Clans />}
          {activeTab === 'tournament' && <Tournament />}
          {activeTab === 'profile' && (
            <div className="block lg:hidden h-full animate-fade-in">
              <ProfileSidebar accountAddress={account?.address} />
            </div>
          )}
          
          {activeTab === 'home' && (
            <>
              {appState === 'playing' ? (
                <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden border border-[#22c55e]/30 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                  {/* Dynamic arenaTheme integration binds player database equips safely */}
                  <PhaserGame walletAddress={account?.address} arenaTheme={equippedArena} onGameOver={handleGameOver} />
                  <button 
                    onClick={() => setAppState('menu')}
                    className="absolute top-4 left-4 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all border border-white/10 text-xs font-bold"
                  >
                    ← Disconnect Arena
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-12 lg:py-20 bg-gradient-to-b from-[#111722] to-[#0B0F17] rounded-3xl border border-white/5 relative overflow-hidden px-6">
                  
                  {appState === 'menu' && (
                    <div className="w-full flex flex-col items-center animate-fade-in text-center">
                      <h1 className="text-5xl lg:text-7xl font-black italic text-white drop-shadow-lg mb-2">
                        SNAKE <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#bef264] to-[#22c55e]">ROYALE</span>
                      </h1>
                      <p className="text-gray-400 font-semibold tracking-widest mt-4 mb-10 uppercase text-sm">Deploy Assets. Dominate. Earn Yield.</p>
                      
                      <div className="flex flex-col gap-4 w-full max-w-sm">
                        <button 
                          onClick={() => setAppState('playing')}
                          className="w-full py-4 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-white border border-white/10 transition-all uppercase tracking-widest font-black"
                        >
                          🎮 FREE PRACTICE MODE
                        </button>

                        <div className="relative flex py-2 items-center w-full">
                          <div className="flex-grow border-t border-white/5"></div>
                          <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-black tracking-widest">ESCROW ARENAS</span>
                          <div className="flex-grow border-t border-white/5"></div>
                        </div>

                        {!account ? (
                          <p className="text-sm text-gray-500 font-semibold animate-pulse">Establishing secure connection...</p>
                        ) : (
                          <>
                            <button 
                              onClick={() => setAppState('create')}
                              className="w-full py-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all font-black uppercase tracking-widest"
                            >
                              ➕ HOST NEW WAGER
                            </button>
                            <button 
                              onClick={() => setAppState('join')}
                              className="w-full py-4 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all font-black uppercase tracking-widest"
                            >
                              ⚔️ ENTER ACTIVE WAGER
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {appState === 'create' && (
                    <div className="w-full max-w-md flex flex-col animate-fade-in text-sm font-semibold">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black tracking-wide">Host Wager Configuration</h3>
                        <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white">✕</button>
                      </div>
                      
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Index Identifier</label>
                      <input type="number" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-indigo-500 font-mono" />

                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Pool Entry Fee</label>
                      <input type="number" value={feeInput} onChange={e => setFeeInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-8 outline-none focus:border-indigo-500 font-mono" />

                      <button onClick={handleCreateRoom} disabled={!!txStatus} className="w-full py-4 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 transition-all disabled:bg-gray-800 disabled:text-gray-500 uppercase tracking-wider">
                        {txStatus || 'PUBLISH ESCROW APPARATUS'}
                      </button>
                    </div>
                  )}

                  {appState === 'join' && (
                    <div className="w-full max-w-md flex flex-col animate-fade-in">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black tracking-wide">Live Wager Arenas</h3>
                        <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white text-lg">✕</button>
                      </div>

                      {txStatus && (
                        <div className="w-full bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 text-center font-bold animate-pulse text-xs">
                          {txStatus}
                        </div>
                      )}

                      {isFetchingRooms ? (
                        <div className="text-center py-10 text-gray-500 font-bold animate-pulse text-xs uppercase tracking-widest">
                          Scanning network for active rooms...
                        </div>
                      ) : activeRooms.length === 0 ? (
                        <div className="text-center py-10 bg-[#0B0F17] rounded-xl border border-white/5 w-full">
                          <p className="text-gray-400 font-bold mb-2">No Active Rooms Found</p>
                          <p className="text-xs text-gray-600 mb-4">Be the first to host a match.</p>
                          <button onClick={() => setAppState('create')} className="text-indigo-400 text-sm font-bold hover:underline">
                            Host a new wager →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 w-full">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select an Arena to Join</p>
                          {activeRooms.map((room) => (
                            <div key={room.roomId} className="bg-[#0B0F17] border border-white/10 rounded-xl p-4 flex justify-between items-center group hover:border-green-500/50 transition-all">
                              <div>
                                <h4 className="font-bold text-white">Room #{room.roomId}</h4>
                                <p className="text-xs text-gray-500">Awaiting Challengers</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-black text-green-400 text-sm">{room.entryFee} Stake</span>
                                <button 
                                  onClick={() => handleJoinRoom(room.roomId.toString(), room.entryFee)}
                                  disabled={!!txStatus}
                                  className="bg-green-600 hover:bg-green-500 text-white font-black px-4 py-2 rounded-lg text-xs tracking-wide uppercase transition-all disabled:bg-gray-800 disabled:text-gray-500"
                                >
                                  ENTER
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
              
              {/* UPDATED: Injected FeatureGrid tab switcher hook deep linking targets */}
              {appState !== 'playing' && (
                <FeatureGrid 
                  onSelectAction={(target) => {
                    if (target === 'shop') setActiveTab('shop');
                    if (target === 'syndicate') setActiveTab('clans');
                    if (target === 'tournament') setActiveTab('tournament');
                    if (target === 'arena') {
                      setActiveTab('home');
                      setAppState('join');
                    }
                  }} 
                />
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: PERMANENT DESKTOP PROFILE BAR */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-6">
          <ProfileSidebar accountAddress={account?.address} />
        </div>

      </div>
      
      {/* STICKY FOOTER TOUCH BAR NAV */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}

// ========================================================
// STABLECOINS SYSTEM HEADER CONTROLLER & HYDRATION BOUNDARY
// ========================================================
function MiniPayNav() {
  const account = useActiveAccount();
  const { connect } = useConnect();
  const [mounted, setMounted] = useState(false);
  const [isMobileWallet, setIsMobileWallet] = useState(true);
  
  const [selectedCoin, setSelectedCoin] = useState(STABLECOINS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 1. Hydration Initialization checks
  useEffect(() => {
    setMounted(true);
    const checkWallet = setTimeout(() => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        connect(createWallet("injected" as any)).catch(() => setIsMobileWallet(false));
      } else {
        setIsMobileWallet(false);
      }
    }, 1500);
    return () => clearTimeout(checkWallet);
  }, [connect]);

  // 2. Secure player registration lifecycle onboard hooks
  useEffect(() => {
    const onboardPlayer = async () => {
      if (!account?.address) return;
      try {
        await fetch('/api/player/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: account.address })
        });
      } catch (err) {
        console.error("Failed to securely onboard player:", err);
      }
    };
    if (account?.address) onboardPlayer();
  }, [account?.address]);

  if (!mounted) return <div className="text-xs text-gray-500 font-bold animate-pulse uppercase tracking-wider">Loading Interface...</div>;

  if (!account) {
    return isMobileWallet ? (
      <div className="text-xs text-gray-500 font-bold animate-pulse uppercase tracking-wider">Detecting Wallet...</div>
    ) : (
      <ConnectButton client={client} chain={mainnetChain} theme={"dark"} />
    );
  }

  return (
    <div className="relative group">
      {/* Dropdown Toggle */}
      <div 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="cursor-pointer flex items-center gap-1 hover:ring-1 hover:ring-white/10 rounded-lg transition-all select-none"
      >
        <TokenBadge token={selectedCoin} accountAddress={account.address} />
        <div className="bg-[#0B0F17] border border-white/5 px-2 py-1.5 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.02)]">
          <span className={`text-gray-500 text-[10px] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {/* Dropdown Menu options selection list container */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-full min-w-[140px] bg-[#0B0F17] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col">
          {STABLECOINS.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                setSelectedCoin(token);
                setDropdownOpen(false);
              }}
              className={`text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-white/5 last:border-0 hover:bg-white/5 ${
                selectedCoin.symbol === token.symbol ? 'bg-white/5 text-white' : 'text-gray-500'
              }`}
            >
              <span className={token.color}>{token.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenBadge({ token, accountAddress }: { token: any, accountAddress: string }) {
  const contract = getContract({ client, chain: mainnetChain, address: token.address });
  const { data } = useReadContract({
    contract,
    method: "function balanceOf(address) view returns (uint256)",
    params: [accountAddress],
  });

  const formattedBalance = data ? (Number(data) / 10 ** token.decimals).toFixed(2) : "0.00";

  return (
    <div className="bg-[#0B0F17] border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,255,255,0.02)]">
       <span className="text-white font-black text-sm font-mono">{formattedBalance}</span>
       <span className={`${token.color} text-[10px] font-black uppercase tracking-widest`}>{token.symbol}</span>
    </div>
  );
}