'use client';

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction, waitForReceipt, getContract, createThirdwebClient, defineChain } from "thirdweb";
import { supabase } from "@/lib/supabaseClient";

// 1. Setup Client & Chain
const client = createThirdwebClient({ 
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "YOUR_CLIENT_ID" 
}); 
const gameNetwork = defineChain(42220); // Celo Mainnet
const ESCROW_CONTRACT_ADDRESS = "0xYOUR_ESCROW_CONTRACT"; 
const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const ENTRY_FEE = 5;

export default function Tournament() {
  const account = useActiveAccount();
  const [hasJoined, setHasJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [prizePool, setPrizePool] = useState(0);
  
  // Time and Date States
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [currentDate, setCurrentDate] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- TIMER LOGIC: Ticks down to Midnight UTC ---
  useEffect(() => {
    // Set today's formatted date
    const today = new Date();
    setCurrentDate(today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));

    const updateTimer = () => {
      const now = new Date();
      // Calculate time until next midnight (UTC)
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();

      const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
      
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimer(); // Run immediately
    const timerInterval = setInterval(updateTimer, 1000); // Tick every second
    return () => clearInterval(timerInterval);
  }, []);

  // --- LIVE LEADERBOARD POLLING ---
  const fetchLeaderboard = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('tournament_entries')
        .select('wallet_address, username, highest_score')
        .eq('has_paid', true)
        .order('highest_score', { ascending: false })
        .limit(10);
      
      if (data) {
        setLeaderboard(data);
        setPrizePool(data.length * ENTRY_FEE);
        
        if (account && data.find(p => p.wallet_address === account.address.toLowerCase())) {
          setHasJoined(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      // Small delay so the user sees the "Refreshing..." UI pulse
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  useEffect(() => {
    fetchLeaderboard(); // Fetch on load
    
    // Auto-refresh the leaderboard every 15 seconds!
    const pollInterval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(pollInterval);
  }, [account]);

  // --- JOIN TOURNAMENT LOGIC ---
  const handleJoinTournament = async () => {
    if (!account) return alert("Connect wallet first!");
    
    // Optional: Ask for a username before they pay
    const desiredUsername = prompt("Enter your Tournament Username:", "SnakeMaster") || "Anonymous";
    
    try {
      const currencyContract = getContract({ client, chain: gameNetwork, address: USDC_ADDRESS }); 
      const transferTx = prepareContractCall({
        contract: currencyContract,
        method: "function transfer(address to, uint256 amount) returns (bool)",
        params: [ESCROW_CONTRACT_ADDRESS, BigInt(ENTRY_FEE * 1e6)]
      });

      const { transactionHash } = await sendTransaction({ transaction: transferTx, account });
      await waitForReceipt({ transactionHash, client, chain: gameNetwork });

      // Register them with their new username
      await supabase.from('tournament_entries').upsert({
        wallet_address: account.address.toLowerCase(),
        username: desiredUsername,
        has_paid: true,
        highest_score: 0 // Starts at 0 until they play
      });

      setHasJoined(true);
      fetchLeaderboard(); // Instantly update the board to show them at the bottom
      alert("Successfully entered! Head to the Arena to post your score.");
      
    } catch (error) {
      console.error(error);
      alert("Failed to join tournament.");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 animate-fade-in text-white pb-16">
      
      {/* HEADER: DATE, TIMER, AND PRIZE POOL */}
      <div className="bg-[#111722] p-8 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="z-10 text-center md:text-left">
          <p className="text-orange-400 font-bold text-sm tracking-widest uppercase mb-1">{currentDate}</p>
          <h2 className="text-3xl lg:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            GLOBAL GRAND PRIX
          </h2>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <p className="text-gray-300 font-bold text-sm">
              Closes in: <span className="text-white font-mono text-lg ml-1">{timeLeft}</span>
            </p>
          </div>
        </div>
        
        <div className="z-10 text-center md:text-right bg-black/40 px-8 py-4 rounded-2xl border border-white/5">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Live Prize Pool</p>
          <p className="text-4xl lg:text-5xl font-black text-emerald-400">{prizePool} <span className="text-xl">cUSD</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ACTION PANEL */}
        <div className="col-span-1 bg-[#0B0F17] p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center h-fit sticky top-6">
          <div className="w-24 h-24 bg-gradient-to-tr from-yellow-600 to-orange-500 rounded-2xl flex items-center justify-center text-5xl mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            🏆
          </div>
          <h3 className="text-2xl font-black mb-2">Daily Cup</h3>
          <p className="text-sm text-gray-400 mb-8 px-4">Pay the {ENTRY_FEE} cUSD entry fee once. Play unlimited times today. Only your absolute highest yield is recorded on the leaderboard.</p>
          
          {hasJoined ? (
            <div className="w-full flex flex-col gap-3">
              <button className="w-full py-4 bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 rounded-xl font-black cursor-default flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE PARTICIPANT
              </button>
              <p className="text-xs text-gray-500 font-semibold">Head to the Arena to improve your score!</p>
            </div>
          ) : (
            <button 
              onClick={handleJoinTournament} 
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-orange-500/25 active:scale-95"
            >
              Enter for {ENTRY_FEE} cUSD
            </button>
          )}

          <div className="w-full mt-8 pt-6 border-t border-white/5 text-left">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Payout Structure</h4>
            <div className="space-y-2 text-sm font-bold">
              <div className="flex justify-between text-yellow-400"><span>1st Place:</span><span>60% Pool</span></div>
              <div className="flex justify-between text-gray-300"><span>2nd Place:</span><span>25% Pool</span></div>
              <div className="flex justify-between text-orange-400"><span>3rd Place:</span><span>15% Pool</span></div>
            </div>
          </div>
        </div>

        {/* LIVE LEADERBOARD */}
        <div className="col-span-1 lg:col-span-2 bg-[#0B0F17] p-6 rounded-2xl border border-white/5 relative">
          
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Live Standings</h3>
            {/* Refresh Indicator */}
            <span className={`text-xs font-bold transition-opacity duration-300 ${isRefreshing ? 'text-blue-400 opacity-100' : 'text-gray-600 opacity-0'}`}>
              Syncing...
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
              <div className="col-span-2 text-center">Rank</div>
              <div className="col-span-6">Player</div>
              <div className="col-span-4 text-right">Top Yield</div>
            </div>

            {/* Empty State */}
            {leaderboard.length === 0 && (
              <div className="text-center py-10 text-gray-500 font-bold">
                No scores posted yet. Be the first!
              </div>
            )}

            {/* Players Map */}
            {leaderboard.map((player, index) => {
              const isCurrentUser = account && player.wallet_address === account.address.toLowerCase();
              
              return (
                <div 
                  key={player.wallet_address} 
                  className={`grid grid-cols-12 items-center p-3 rounded-xl transition-all duration-500 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' : 
                    index === 1 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/20' : 
                    index === 2 ? 'bg-gradient-to-r from-orange-700/20 to-transparent border border-orange-700/30' : 
                    'bg-white/5 border border-transparent'
                  } ${isCurrentUser ? 'ring-1 ring-blue-500 bg-blue-500/10' : ''}`}
                >
                  
                  {/* Rank */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`font-black text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {index + 1}
                    </span>
                  </div>
                  
                  {/* Username / Address */}
                  <div className="col-span-6 flex flex-col">
                    <span className={`font-bold truncate ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                      {player.username || 'Anonymous'}
                      {isCurrentUser && <span className="ml-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500">
                      {player.wallet_address.substring(0,6)}...{player.wallet_address.substring(38)}
                    </span>
                  </div>
                  
                  {/* Score & Payout Preview */}
                  <div className="col-span-4 text-right flex flex-col">
                    <span className="font-black text-lg text-white">{player.highest_score}</span>
                    
                    {/* Only show payout previews for the Top 3! */}
                    {index === 0 && <span className="text-[10px] text-yellow-400 font-bold uppercase mt-0.5">Wins: {(prizePool * 0.6).toFixed(2)}</span>}
                    {index === 1 && <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Wins: {(prizePool * 0.25).toFixed(2)}</span>}
                    {index === 2 && <span className="text-[10px] text-orange-400 font-bold uppercase mt-0.5">Wins: {(prizePool * 0.15).toFixed(2)}</span>}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}