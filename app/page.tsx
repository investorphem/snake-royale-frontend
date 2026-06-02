'use client';

import { useState } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, defineChain, prepareContractCall, sendTransaction, waitForReceipt, getContract } from "thirdweb";
import dynamic from 'next/dynamic';
import ProfileSidebar from "@/components/ProfileSidebar";
import FeatureGrid from "@/components/FeatureGrid";
import MobileNav from "@/components/MobileNav";

// 1. Initialize Thirdweb Client & Celo Sepolia Chain Matrix
const client = createThirdwebClient({ 
  clientId: "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" 
}); 
const celoSepolia = defineChain(11142220); 

// 2. Smart Contract Declarations
const SNAKE_WAGER_ADDRESS = "0xF30b45003dCDe160B94962bB58FA8C2E9Ab70372";
const CUSD_SEPOLIA_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; 

const wagerContract = getContract({ client, chain: celoSepolia, address: SNAKE_WAGER_ADDRESS });
const cUSDContract = getContract({ client, chain: celoSepolia, address: CUSD_SEPOLIA_ADDRESS });

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
  
  // App Navigation States
  const [appState, setAppState] = useState<'menu' | 'create' | 'join' | 'playing'>('menu');
  const [activeTab, setActiveTab] = useState<'home' | 'shop' | 'inventory' | 'clans' | 'profile'>('home');
  const [txStatus, setTxStatus] = useState('');
  
  // Custom user input configurations
  const [roomIdInput, setRoomIdInput] = useState('1');
  const [feeInput, setFeeInput] = useState('1');

  // --- ESCROW TRANSACTION LOGIC ---
  const handleCreateRoom = async () => {
    if (!account) return;
    try {
      setTxStatus('Initializing On-Chain Arena...');
      const feeInWei = BigInt(parseFloat(feeInput) * 1e18);
      const roomId = BigInt(roomIdInput);

      const createTx = prepareContractCall({
        contract: wagerContract,
        method: "function createRoom(uint256 _roomId, uint256 _entryFee)",
        params: [roomId, feeInWei]
      });

      const { transactionHash } = await sendTransaction({ transaction: createTx, account });
      await waitForReceipt({ transactionHash, client, chain: celoSepolia });

      alert(`Room ${roomId} created successfully! Proceeding to entry staking.`);
      setTxStatus('');
      setAppState('join'); 
    } catch (error) {
      console.error(error);
      alert("Failed to initialize room. Verify if ID is already claimed.");
      setTxStatus('');
    }
  };

  const handleJoinRoom = async () => {
    if (!account) return;
    try {
      setTxStatus('Approving Vault Allocation...');
      const feeInWei = BigInt(parseFloat(feeInput) * 1e18); 
      const roomId = BigInt(roomIdInput);

      const approveTx = prepareContractCall({
        contract: cUSDContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [SNAKE_WAGER_ADDRESS, feeInWei]
      });
      const { transactionHash: approveHash } = await sendTransaction({ transaction: approveTx, account });
      await waitForReceipt({ transactionHash: approveHash, client, chain: celoSepolia });

      setTxStatus('Locking Stake Stakes...');
      const joinTx = prepareContractCall({
        contract: wagerContract,
        method: "function joinRoom(uint256 _roomId)",
        params: [roomId]
      });
      const { transactionHash: joinHash } = await sendTransaction({ transaction: joinTx, account });
      await waitForReceipt({ transactionHash: joinHash, client, chain: celoSepolia });

      setTxStatus('');
      setAppState('playing');
    } catch (error) {
      console.error(error);
      alert("Verification failed. Check your wallet's cUSD balance.");
      setTxStatus('');
    }
  };

  return (
    <main className="min-h-screen bg-[#06090E] text-white font-sans overflow-x-hidden selection:bg-[#84cc16] selection:text-black">
      
      {/* GLOBAL ARCHITECTURE NAVBAR */}
      <nav className="w-full flex justify-between items-center p-4 lg:px-8 border-b border-white/5 bg-[#0B0F17]/80 backdrop-blur-md fixed top-0 z-50">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#22c55e] flex items-center justify-center text-black font-black text-xl">
             SR
           </div>
           <span className="font-black italic text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 hidden sm:block">
             SNAKE <span className="text-[#84cc16]">ROYALE</span>
           </span>
        </div>
        
        <div className="flex items-center gap-4">
          <ConnectButton client={client} chain={celoSepolia} theme={"dark"} />
        </div>
      </nav>

      {/* DASHBOARD CONTAINER MATRIX */}
      <div className="pt-24 pb-24 px-4 lg:px-8 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COMPONENT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {appState === 'playing' ? (
            <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden border border-[#22c55e]/30 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">
              <PhaserGame walletAddress={account?.address} />
              <button 
                onClick={() => setAppState('menu')}
                className="absolute top-4 left-4 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all border border-white/10"
              >
                ← Disconnect Arena
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-12 lg:py-20 bg-gradient-to-b from-[#111722] to-[#0B0F17] rounded-3xl border border-white/5 relative overflow-hidden px-6">
              
              {appState === 'menu' && (
                <div className="w-full flex flex-col items-center animate-fade-in text-center">
                  <h1 className="text-5xl lg:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-[#bef264] to-[#22c55e] drop-shadow-lg mb-2">
                    CELO SNAKE
                  </h1>
                  <h2 className="text-3xl lg:text-4xl font-black text-yellow-500 tracking-widest mb-6">
                    •• ROYALE ••
                  </h2>
                  <p className="text-gray-400 font-semibold tracking-widest mb-10">EAT. GROW. MULTIPLY ASSETS.</p>
                  
                  <div className="flex flex-col gap-4 w-full max-w-sm">
                    <button 
                      onClick={() => setAppState('playing')}
                      className="w-full py-4 rounded-xl font-bold text-lg bg-gray-800 hover:bg-gray-700 text-white border border-white/10 transition-all"
                    >
                      🎮 FREE PRACTICE MODE
                    </button>

                    <div className="relative flex py-2 items-center w-full">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-black tracking-widest">ESCROW ARENAS</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>

                    {!account ? (
                      <p className="text-sm text-gray-500 font-semibold">Connect wallet to unlock on-chain wagers</p>
                    ) : (
                      <>
                        <button 
                          onClick={() => setAppState('create')}
                          className="w-full py-4 rounded-xl font-bold text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all"
                        >
                          ➕ HOST NEW WAGER
                        </button>
                        <button 
                          onClick={() => setAppState('join')}
                          className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all"
                        >
                          ⚔️ ENTER ACTIVE WAGER
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {appState === 'create' && (
                <div className="w-full max-w-md flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black tracking-wide">Host Wager Configuration</h3>
                    <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Index Identifier</label>
                  <input type="number" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-indigo-500 font-mono" />

                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Pool Entry Fee (cUSD)</label>
                  <input type="number" value={feeInput} onChange={e => setFeeInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-8 outline-none focus:border-indigo-500 font-mono" />

                  <button onClick={handleCreateRoom} disabled={!!txStatus} className="w-full py-4 rounded-xl font-black text-lg bg-indigo-600 hover:bg-indigo-500 transition-all disabled:bg-gray-800 disabled:text-gray-500">
                    {txStatus || 'PUBLISH ESCROW APPARATUS'}
                  </button>
                </div>
              )}

              {appState === 'join' && (
                <div className="w-full max-w-md flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black tracking-wide">Enter Arena Room</h3>
                    <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Room ID</label>
                  <input type="number" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-green-500 font-mono" />

                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Verify Admission Staking Requirement (cUSD)</label>
                  <input type="number" value={feeInput} onChange={e => setFeeInput(e.target.value)} className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-white mb-8 outline-none focus:border-green-500 font-mono" />

                  <button onClick={handleJoinRoom} disabled={!!txStatus} className="w-full py-4 rounded-xl font-black text-lg bg-green-600 hover:bg-green-500 transition-all disabled:bg-gray-800 disabled:text-gray-500">
                    {txStatus || 'AUTHORIZE VALUATION & DEPLOY'}
                  </button>
                </div>
              )}

            </div>
          )}

          {/* BOTTOM FEATURE CARDS MATRIX */}
          <FeatureGrid />

        </div>

        {/* RIGHT COLUMN: LINKED SIDEBAR HOOK (HIDDEN ON MOBILE) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-6">
          <ProfileSidebar accountAddress={account?.address} />
        </div>

      </div>

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
    </main>
  );
}