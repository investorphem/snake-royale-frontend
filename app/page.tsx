'use client';

import { useState } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, defineChain } from "thirdweb";
import dynamic from 'next/dynamic';

const client = createThirdwebClient({ clientId: "3yd744Q5LPJ3BC1ndknBd0JLotNiKe4Dy-x2aqYEXKfNkzBLo3kXQL-5u0P3aMOX17uEdwClXg_FRKf_RSe09w" });
const celoSepolia = defineChain(11142220); 

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
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-[#0B0E14] text-white font-sans">
      
      {/* Top Navbar */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 bg-[#151A22] p-4 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center font-bold text-black">
            CR
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-200">CeloPlayer</h1>
            <p className="text-xs text-green-400">Level 12</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#0B0E14] px-3 py-1 rounded-full border border-gray-700">
          <span className="text-green-400 font-bold">125.50</span>
          <span className="text-xs text-gray-400">cUSD</span>
        </div>
      </div>

      {!gameStarted ? (
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Hero Branding */}
          <div className="text-center mb-10">
            <h2 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
              CELO SNAKE
            </h2>
            <h3 className="text-3xl font-black text-yellow-500 tracking-widest mt-[-5px]">
              •• ROYALE ••
            </h3>
            <p className="text-gray-400 text-sm mt-4 tracking-widest">EAT. GROW. WIN.</p>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-4">
            <button 
              onClick={() => setGameStarted(true)}
              disabled={!account}
              className={`w-full py-5 rounded-xl font-black text-xl tracking-wide transition-all ${
                account 
                  ? 'bg-gradient-to-r from-green-400 to-green-600 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {account ? 'PLAY NOW' : 'CONNECT WALLET TO PLAY'}
            </button>
            
            {!account && (
              <div className="flex justify-center mt-2">
                <ConnectButton client={client} chain={celoSepolia} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl h-[700px] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.2)] border-4 border-[#1A222C] relative">
          {/* Overlay UI for Game */}
          <div className="absolute top-4 right-4 z-10 text-right pointer-events-none">
            <p className="text-3xl font-black text-white drop-shadow-md">02:45</p>
            <p className="text-sm font-bold text-gray-300">Kills: 3</p>
          </div>
          <PhaserGame walletAddress={account?.address} />
        </div>
      )}
    </main>
  );
}