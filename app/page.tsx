'use client';

import { useState } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, defineChain } from "thirdweb";
import dynamic from 'next/dynamic';

// Initialize Thirdweb (Make sure your real Client ID is here!)
const client = createThirdwebClient({ clientId: "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" });
const celoSepolia = defineChain(11142220); 

// Dynamically load the game so Next.js doesn't crash on server-side rendering
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

export default function Home() {
  return (
    <ThirdwebProvider>
      <GameDashboard />
    </ThirdwebProvider>
  );
}

function GameDashboard() {
  const account = useActiveAccount();
  const [appState, setAppState] = useState<'menu' | 'staking' | 'playing'>('menu');
  const [isStaking, setIsStaking] = useState(false);

  // Helper to format wallet address nicely (e.g., 0x1234...abcd)
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Simulated Staking Transaction
  const handleStakeAndPlay = () => {
    setIsStaking(true);
    // Simulate a blockchain transaction wait time
    setTimeout(() => {
      setIsStaking(false);
      setAppState('playing');
    }, 2000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0B0E14] text-white font-sans overflow-hidden">
      
      {/* GLOBAL NAVBAR */}
      <div className="w-full max-w-md flex justify-between items-center p-4 bg-[#11161F] border-b border-gray-800 shadow-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center font-black text-black shadow-[0_0_10px_rgba(34,197,94,0.5)]">
            CR
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-200">
              {account ? formatAddress(account.address) : "Guest Player"}
            </h1>
            <p className="text-xs text-green-400 font-semibold">Level 1</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#0B0E14] px-3 py-1.5 rounded-full border border-gray-700">
          <span className="text-green-400 font-bold">1.00</span>
          <span className="text-xs text-gray-400">cUSD</span>
        </div>
      </div>

      <div className="w-full flex-grow flex flex-col items-center justify-center p-4 relative w-full max-w-md">
        
        {/* APP STATE 1: MAIN MENU */}
        {appState === 'menu' && (
          <div className="w-full flex flex-col items-center animate-fade-in mt-[-10vh]">
            {/* Hero Branding */}
            <div className="text-center mb-12">
              <div className="text-6xl mb-2">👑</div>
              <h2 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                CELO SNAKE
              </h2>
              <h3 className="text-3xl font-black text-yellow-500 tracking-widest mt-[-5px]">
                •• ROYALE ••
              </h3>
              <p className="text-gray-400 text-sm mt-4 tracking-widest font-semibold">EAT. GROW. WIN.</p>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-4">
              {!account ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-gray-400 text-sm mb-2">Connect wallet to enter the arena</p>
                  <ConnectButton 
                    client={client} 
                    chain={celoSepolia} 
                    theme={"dark"}
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setAppState('staking')}
                  className="w-full py-5 rounded-2xl font-black text-2xl tracking-wide transition-all bg-gradient-to-r from-green-400 to-green-600 text-black shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:scale-105 active:scale-95"
                >
                  ENTER ARENA
                </button>
              )}
            </div>
          </div>
        )}

        {/* APP STATE 2: TOURNAMENT ENTRY (STAKING) */}
        {appState === 'staking' && (
          <div className="w-full flex flex-col items-center bg-[#151A22] p-6 rounded-3xl border border-gray-800 shadow-2xl animate-fade-in mt-[-5vh]">
            <div className="w-full flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Tournament Entry</h2>
              <button onClick={() => setAppState('menu')} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="bg-[#0B0E14] w-full p-4 rounded-xl mb-6 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">Entry Fee</p>
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-white">1.00</span>
                <span className="text-lg font-bold text-green-400">cUSD</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center mb-8 px-4">
              Stake your cUSD to enter the arena. The last snake standing wins the pool.
            </p>

            <button 
              onClick={handleStakeAndPlay}
              disabled={isStaking}
              className={`w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all ${
                isStaking 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-400'
              }`}
            >
              {isStaking ? 'CONFIRMING TRANSACTION...' : 'STAKE 1.00 cUSD & PLAY'}
            </button>
          </div>
        )}

        {/* APP STATE 3: THE GAME ENGINE */}
        {appState === 'playing' && (
          <div className="absolute inset-0 z-0 bg-black pt-[73px]"> {/* padding-top avoids navbar overlap */}
             <PhaserGame walletAddress={account?.address} />
          </div>
        )}

      </div>
    </main>
  );
}