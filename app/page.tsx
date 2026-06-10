'use client';

import { useState, useEffect, useRef } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount, useReadContract } from "thirdweb/react";
import { createThirdwebClient, defineChain, prepareContractCall, sendTransaction, waitForReceipt, getContract, readContract } from "thirdweb";
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabaseClient";

import ProfileSidebar from "@/components/ProfileSidebar";
import MobileNav from "@/components/MobileNav";
import Shop from "@/components/Shop";
import Inventory from "@/components/Inventory";
import Clans from "@/components/Clans";
import Tournament from "@/components/Tournament";

// Client definition utilizing environment configuration exclusively
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const mainnetChain = defineChain(42220); // Celo Mainnet

const STABLECOINS = [
  { symbol: "cUSD", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18, color: "text-green-400" },
  { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6,  color: "text-blue-400" },
  { symbol: "USDT", address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", decimals: 6,  color: "text-teal-400" },
];

const SNAKE_WAGER_ADDRESS = "0xF30b45003dCDe160B94962bB58FA8C2E9Ab70372";
const wagerContract = getContract({ client, chain: mainnetChain, address: SNAKE_WAGER_ADDRESS });

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

  const [appState, setAppState]     = useState<'menu' | 'create' | 'join' | 'playing'>('menu');
  const [activeTab, setActiveTab]   = useState<'home' | 'shop' | 'inventory' | 'clans' | 'profile' | 'tournament'>('home');
  const [txStatus, setTxStatus]     = useState('');
  const [selectedCoin, setSelectedCoin] = useState(STABLECOINS[0]);
  const [roomIdInput, setRoomIdInput]   = useState('1');
  const [feeInput, setFeeInput]         = useState('1');
  const [activeRooms, setActiveRooms]   = useState<any[]>([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);

  const [showOnboarding, setShowOnboarding]       = useState(false);
  const [chosenUsername, setChosenUsername]         = useState('');
  const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);
  const [playerProfile, setPlayerProfile]           = useState<any>(null);

  const fetchedForAddress = useRef<string | null>(null);

  // Sync state cleanly when tabs are switched globally
  useEffect(() => {
    if (activeTab !== 'home') {
      setAppState('menu');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!account?.address) {
      setPlayerProfile(null);
      setShowOnboarding(false);
      fetchedForAddress.current = null;
      return;
    }

    if (fetchedForAddress.current === account.address.toLowerCase()) return;

    const lowerAddress = account.address.toLowerCase();
    fetchedForAddress.current = lowerAddress;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('wallet_address', lowerAddress)
          .maybeSingle();

        if (error) {
          console.error("Supabase profile fetch error:", error.message);
          return;
        }

        if (!data) {
          setShowOnboarding(true);
        } else {
          setPlayerProfile(data);
          setShowOnboarding(false);
        }
      } catch (err) {
        console.error("Unexpected profile fetch error:", err);
      }
    };

    fetchProfile();
  }, [account?.address]);

  const handleCreateOnboardingAccount = async () => {
    if (!account?.address || !chosenUsername.trim()) return;
    setIsOnboardingSaving(true);
    setTxStatus('Saving Profile...');

    try {
      const lowerAddress = account.address.toLowerCase();

      const { data, error } = await supabase
        .from('players')
        .upsert(
          { wallet_address: lowerAddress, username: chosenUsername.trim(), xp: 0 },
          { onConflict: 'wallet_address' }
        )
        .select()
        .single();

      if (error) throw error;

      setPlayerProfile(data);
      setShowOnboarding(false);
    } catch (err: any) {
      console.error("Onboarding save error:", err);
      alert(`Failed to save username: ${err.message || 'Check Supabase RLS policies.'}`);
    } finally {
      setIsOnboardingSaving(false);
      setTxStatus('');
    }
  };

  const refreshProfile = async () => {
    if (!account?.address) return;
    const lowerAddress = account.address.toLowerCase();
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('wallet_address', lowerAddress)
        .maybeSingle();
      if (!error && data) setPlayerProfile(data);
    } catch (err) {
      console.error("Profile refresh error:", err);
    }
  };

  const fetchLiveRooms = async () => {
    setIsFetchingRooms(true);
    const roomsFound = [];
    for (let i = 1; i <= 10; i++) {
      try {
        const roomData = await readContract({
          contract: wagerContract,
          method: "function rooms(uint256) view returns (uint256 roomId, uint256 entryFee, address winner, bool isSettled, bool isActive)",
          params: [BigInt(i)],
        });
        if (roomData[4] === true) {
          roomsFound.push({ roomId: Number(roomData[0]), entryFee: (Number(roomData[1]) / 1e18).toFixed(2) });
        }
      } catch {}
    }
    setActiveRooms(roomsFound);
    setIsFetchingRooms(false);
  };

  useEffect(() => { 
    if (appState === 'join') fetchLiveRooms(); 
  }, [appState]);

  const handleCreateRoom = async () => {
    if (!account) return alert("Wallet not connected");
    if (Number(feeInput) <= 0) return alert("Invalid fee amount");
    try {
      setTxStatus('Awaiting Escrow Deposit...');
      const currencyContract = getContract({ client, chain: mainnetChain, address: selectedCoin.address });
      const multiplier = BigInt(10) ** BigInt(selectedCoin.decimals - 2);
      const wagerInWei = BigInt(Math.round(Number(feeInput) * 100)) * multiplier;
      const depositTx = prepareContractCall({
        contract: currencyContract,
        method: "function transfer(address to, uint256 value) returns (bool)",
        params: [SNAKE_WAGER_ADDRESS, wagerInWei],
      });
      const { transactionHash } = await sendTransaction({ transaction: { ...depositTx, feeCurrency: selectedCoin.address } as any, account });
      await waitForReceipt({ transactionHash, client, chain: mainnetChain });
      setTxStatus('');
      setAppState('playing');
    } catch (error) {
      console.error(error);
      setTxStatus('');
      alert("Transaction failed or was cancelled.");
    }
  };

  const handleJoinRoom = async (selectedRoomId: string, requiredFee: string) => {
    if (!account) return alert("Wallet not connected");
    try {
      setTxStatus('Awaiting Escrow Deposit...');
      const currencyContract = getContract({ client, chain: mainnetChain, address: selectedCoin.address });
      const multiplier = BigInt(10) ** BigInt(selectedCoin.decimals - 2);
      const wagerInWei = BigInt(Math.round(Number(requiredFee) * 100)) * multiplier;
      const depositTx = prepareContractCall({
        contract: currencyContract,
        method: "function transfer(address to, uint256 value) returns (bool)",
        params: [SNAKE_WAGER_ADDRESS, wagerInWei],
      });
      const { transactionHash } = await sendTransaction({ transaction: { ...depositTx, feeCurrency: selectedCoin.address } as any, account });
      await waitForReceipt({ transactionHash, client, chain: mainnetChain });
      setTxStatus('');
      setAppState('playing');
    } catch (error) {
      console.error(error);
      setTxStatus('');
      alert("Transaction failed or was cancelled.");
    }
  };

  const handleGameOver = async (finalScore: number) => {
    setAppState('menu');
  };

  const playerLevel   = Math.floor((playerProfile?.xp || 0) / 1000) + 1;
  const xpProgress    = ((playerProfile?.xp || 0) % 1000) / 10;

  return (
    <main className="min-h-screen bg-[#06090E] text-white font-sans overflow-x-hidden selection:bg-[#84cc16] selection:text-black flex flex-col items-center">

      {/* HEADER */}
      <nav className="w-full max-w-md mx-auto flex justify-between items-center p-4 bg-[#06090E] fixed top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('profile')}>
          <div className="w-12 h-12 relative flex items-center justify-center bg-gradient-to-b from-[#84cc16] to-[#166534]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <div className="w-[44px] h-[44px] bg-[#111722] flex items-center justify-center text-xl" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              {playerProfile ? '💀' : '👤'}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-white font-bold text-sm leading-tight">{playerProfile?.username || 'Guest Agent'}</span>
            <span className="text-[#84cc16] text-[10px] font-black leading-tight tracking-wider uppercase mt-0.5">Level {playerLevel}</span>
            <div className="w-20 h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#84cc16] to-[#4ade80]" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </div>
        <MiniPayNav selectedCoin={selectedCoin} setSelectedCoin={setSelectedCoin} />
      </nav>

      {/* CONTENT INTERFACE */}
      <div className="pt-24 pb-32 px-4 w-full max-w-md mx-auto flex-1 flex flex-col">
        {activeTab === 'shop'       && <Shop selectedCoin={selectedCoin} refreshProfile={refreshProfile} />}
        {activeTab === 'inventory'  && <Inventory refreshProfile={refreshProfile} />}
        {activeTab === 'clans'      && <Clans />}
        {activeTab === 'tournament' && <Tournament />}
        {activeTab === 'profile'    && <ProfileSidebar accountAddress={account?.address} refreshProfile={refreshProfile} />}

        {activeTab === 'home' && (
          <>
            {appState === 'playing' ? (
              <div className="w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-[#22c55e]/30 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
                <PhaserGame walletAddress={account?.address} onGameOver={handleGameOver} />
                <button onClick={() => setAppState('menu')} className="absolute top-4 left-4 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all border border-white/10 text-xs font-bold">
                  Quit
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center flex-1 justify-center animate-fade-in">

                {appState === 'menu' && (
                  <div className="w-full flex flex-col items-center text-center">
                    <div className="relative w-full flex flex-col items-center justify-center mb-8 mt-2">
                      <img src="/assets/hero_snake.png" alt="Snake Royale King" className="w-56 h-auto drop-shadow-[0_0_40px_rgba(132,204,22,0.3)] mb-4 hover:scale-105 transition-transform duration-500" />
                      <h1 className="text-4xl font-black italic text-white drop-shadow-lg text-center tracking-tighter leading-none">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#bef264] to-[#22c55e] text-[52px] tracking-tight" style={{ WebkitTextStroke: '1px #166534' }}>SNAKE</span><br />
                        <span className="text-yellow-400 text-5xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">ROYALE</span>
                      </h1>
                    </div>
                    
                    <div className="flex flex-col gap-3 w-full">
                      {/* ACTION CONTROLS MATCHING UI FLOW */}
                      <button onClick={() => setAppState('playing')} className="w-full bg-gradient-to-b from-[#a3e635] to-[#65a30d] text-black rounded-2xl py-4 font-black text-2xl shadow-[0_6px_0_#3f6212] active:shadow-none active:translate-y-1.5 transition-all flex flex-col items-center uppercase tracking-wide">
                        PLAY QUICK MATCH
                      </button>
                      
                      <button onClick={() => setAppState('create')} className="w-full bg-[#1A1F2E] text-white rounded-2xl py-4 font-black text-sm shadow-[0_6px_0_#0B0F17] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-widest mt-1 border border-white/5">
                        HOST ARENA
                      </button>

                      <button onClick={() => setAppState('join')} className="w-full bg-[#1A1F2E] text-white rounded-2xl py-4 font-black text-sm shadow-[0_6px_0_#0B0F17] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-widest mt-1 border border-white/5">
                        JOIN ARENA
                      </button>

                      <div className="grid grid-cols-2 gap-3 w-full mt-2">
                        <button onClick={() => setActiveTab('tournament')} className="w-full bg-[#111722] hover:bg-[#1A1F2E] text-gray-400 hover:text-white rounded-xl py-3 font-bold text-xs border border-white/5 transition-all uppercase tracking-wider">LEADERBOARD</button>
                        <button onClick={() => setActiveTab('clans')} className="w-full bg-[#111722] hover:bg-[#1A1F2E] text-gray-400 hover:text-white rounded-xl py-3 font-bold text-xs border border-white/5 transition-all uppercase tracking-wider">MISSIONS</button>
                      </div>
                    </div>
                  </div>
                )}

                {appState === 'create' && (
                  <div className="w-full bg-[#111722] p-6 rounded-3xl border border-white/5 flex flex-col animate-fade-in text-sm font-semibold">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black tracking-wide">Host Wager Configuration</h3>
                      <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Index</label>
                    <input type="number" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-indigo-500 font-mono" />
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Entry Fee ({selectedCoin.symbol})</label>
                    <input type="number" value={feeInput} onChange={e => setFeeInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-8 outline-none focus:border-indigo-500 font-mono" />
                    <button onClick={handleCreateRoom} disabled={!!txStatus} className="w-full py-4 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 transition-all uppercase tracking-wider flex items-center justify-center">
                      {txStatus ? <><span className="animate-spin mr-2">⚙️</span>{txStatus}</> : 'PUBLISH ESCROW'}
                    </button>
                  </div>
                )}

                {appState === 'join' && (
                  <div className="w-full bg-[#111722] p-6 rounded-3xl border border-white/5 flex flex-col animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black tracking-wide">Live Arenas</h3>
                      <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white text-lg">✕</button>
                    </div>
                    {isFetchingRooms ? (
                      <div className="text-center py-10 text-gray-500 font-bold animate-pulse text-xs uppercase tracking-widest">Scanning network...</div>
                    ) : activeRooms.length === 0 ? (
                      <div className="text-center py-10 bg-[#0B0F17] rounded-xl border border-white/5 w-full">
                        <p className="text-gray-400 font-bold mb-2">No Active Rooms Found</p>
                        <button onClick={() => setAppState('create')} className="text-indigo-400 text-sm font-bold hover:underline">Host a new wager →</button>
                      </div>
                    ) : (
                      <div className="space-y-3 w-full">
                        {activeRooms.map((room) => (
                          <div key={room.roomId} className="bg-[#0B0F17] border border-white/10 rounded-xl p-4 flex justify-between items-center hover:border-green-500/50 transition-all">
                            <div>
                              <h4 className="font-bold text-white text-sm">Room #{room.roomId}</h4>
                              <span className="font-black text-green-400 text-xs">{room.entryFee} {selectedCoin.symbol} Stake</span>
                            </div>
                            <button onClick={() => handleJoinRoom(room.roomId.toString(), room.entryFee)} disabled={!!txStatus} className="bg-green-600 hover:bg-green-500 text-white font-black px-4 py-2 rounded-lg text-xs uppercase transition-all">
                              {txStatus ? '...' : 'ENTER'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ONBOARDING SECURITY GATE */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-[#06090E]/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-[#111722] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#84cc16] to-[#22c55e]" />
            <span className="text-5xl block mb-4 select-none">🐍</span>
            <h2 className="text-2xl font-black italic tracking-wide text-white mb-2">INITIALIZE AGENT</h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-6 px-2">Register a unique handle to track your global stats and secure yields.</p>
            <div className="w-full text-left mb-6">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Choose Handle</label>
              <input
                type="text"
                placeholder="e.g. CeloPlayer"
                maxLength={15}
                value={chosenUsername}
                onChange={e => setChosenUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-[#84cc16] font-bold tracking-wide placeholder-gray-600 transition-colors"
                disabled={isOnboardingSaving}
              />
            </div>
            <button
              onClick={handleCreateOnboardingAccount}
              disabled={isOnboardingSaving || !chosenUsername.trim()}
              className="w-full py-4 bg-gradient-to-b from-[#a3e635] to-[#65a30d] disabled:from-gray-800 disabled:text-gray-500 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_0_#3f6212] active:shadow-none active:translate-y-1"
            >
              {isOnboardingSaving ? 'SIGNING...' : 'CONFIRM IDENTITY'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function MiniPayNav({ selectedCoin, setSelectedCoin }: { selectedCoin: any; setSelectedCoin: any }) {
  const account = useActiveAccount();
  const [mounted, setMounted]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="w-24 h-10 bg-gray-800 rounded-2xl animate-pulse" />;

  if (!account) {
    return (
      <ConnectButton
        client={client}
        chain={mainnetChain}
        theme="dark"
        connectButton={{ label: "Connect", className: "!bg-[#1A1F2E] !text-white !font-black !text-xs !uppercase !tracking-widest !rounded-xl !px-4 !py-2 !border !border-white/5" }}
      />
    );
  }

  return (
    <div className="relative z-50">
      <div onClick={() => setDropdownOpen(o => !o)} className="cursor-pointer bg-[#1A1F2E] border border-white/5 px-3 py-2 rounded-2xl flex items-center gap-2 shadow-sm hover:bg-[#252b3d] select-none transition-all">
        <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-[10px]">🪙</div>
        <TokenBadge token={selectedCoin} accountAddress={account.address} />
        <div className="w-5 h-5 bg-[#84cc16] rounded-full flex items-center justify-center text-black font-black leading-none ml-1 shadow-[0_0_10px_rgba(132,204,22,0.4)]">+</div>
      </div>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-full min-w-[150px] bg-[#1A1F2E] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {STABLECOINS.map(token => (
            <button key={token.address} onClick={() => { setSelectedCoin(token); setDropdownOpen(false); }} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-white/5 text-white flex items-center gap-2 border-b border-white/5 last:border-0 transition-colors">
              <span className={token.color}>{token.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenBadge({ token, accountAddress }: { token: any; accountAddress: string }) {
  const contract = getContract({ client, chain: mainnetChain, address: token.address });

  const { data, isLoading, error } = useReadContract({
    contract,
    method: "function balanceOf(address) view returns (uint256)",
    params: [accountAddress],
  });

  useEffect(() => {
    if (error) console.error(`Balance fetch error for ${token.symbol}:`, error);
  }, [error, token.symbol]);

  const formattedBalance = (() => {
    if (!data) return "0.00";
    try {
      if (token.decimals === 18) {
        const whole = data / BigInt(10 ** 14);
        return (Number(whole) / 10000).toFixed(2);
      } else {
        return (Number(data) / Math.pow(10, token.decimals)).toFixed(2);
      }
    } catch {
      return "0.00";
    }
  })();

  return (
    <div className="flex flex-col items-start leading-none justify-center">
      <span className="text-white font-black text-[11px] font-mono">{isLoading ? "..." : formattedBalance}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{token.symbol}</span>
    </div>
  );
}
