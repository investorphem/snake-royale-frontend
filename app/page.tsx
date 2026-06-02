'use client';

import { useState } from "react";
import { 
  ThirdwebProvider, 
  ConnectButton, 
  useActiveAccount 
} from "thirdweb/react";
import { createThirdwebClient, defineChain } from "thirdweb";
import dynamic from 'next/dynamic';

// 1. Initialize Client & Chain for Celo Sepolia
const client = createThirdwebClient({ 
  clientId: "060a16f2491d7191bdd9f5bdca0d5fe6" // 🚨 Replace this!
});

// Celo Sepolia Chain ID
const celoSepolia = defineChain(11142220); 

// 2. Define our Smart Contracts
const WAGER_CONTRACT_ADDRESS = "0xF30b45003dCDe160B94962bB58FA8C2E9Ab70372"; 
const CUSD_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

// Dynamically import the Phaser Game component to prevent SSR window errors
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
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-green-400">SnakeRoyale Arena</h1>
        
        <ConnectButton 
          client={client} 
          chain={celoSepolia}
        />
      </div>

      {!gameStarted ? (
        <div className="flex flex-col items-center justify-center h-[600px] w-full bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-2xl mb-4">Ready to Wager?</h2>
          <p className="text-gray-400 mb-8">Entry Fee: 1 cUSD</p>
          
          <button 
            onClick={() => setGameStarted(true)}
            disabled={!account}
            className={`px-8 py-4 rounded-lg font-bold text-xl transition-all ${
              account 
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {account ? 'Join Arena (Approve cUSD)' : 'Connect Wallet to Play'}
          </button>
        </div>
      ) : (
        <div className="w-full h-[600px] border-2 border-green-500 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          {/* We pass the wallet address to the game so the Node.js server knows who wins */}
          <PhaserGame walletAddress={account?.address} />
        </div>
      )}
    </main>
  );
}