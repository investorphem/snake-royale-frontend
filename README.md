# 🐍👑 Snake Royale: Celo MiniPay Edition

**A real-time, multiplayer wager arena natively optimized for the Celo MiniPay and Valora ecosystems.** Snake Royale bridges the gap between high-performance WebGL gaming and decentralized finance. By utilizing a hybrid on-chain/off-chain architecture, players can seamlessly wager stablecoins (cUSD, USDC, USDT) in skill-based combat without leaving their mobile wallets.

## 🌟 The Vision & Ecosystem Pivot
The Celo ecosystem is rich with utility and payment applications. To avoid market saturation and ecosystem duplication, Snake Royale was engineered to introduce **gamified liquidity**. By providing a high-stakes, hyper-casual gaming experience directly inside MiniPay, we create a new, engaging utility vector for stablecoins on the network.

## 🚀 Core Features

* **Zero-Friction Onboarding:** Silent auto-connection via injected `window.ethereum` providers. Players open the app inside MiniPay and immediately see their stablecoin balances without manual wallet linking.
* **Trustless Escrow Arenas:** Wagers are locked in a custom Solidity Smart Contract on the Celo network. The winner takes the pool; the blockchain guarantees the payout.
* **Hybrid Telemetry Backend:** Game state, player loadouts (NFT skins), and the Syndicate Clans DAO leaderboards are powered by a real-time PostgreSQL (Supabase) database to ensure zero-latency UI updates, keeping the blockchain reserved strictly for financial settlements.
* **Dynamic Matchmaking:** The frontend actively queries the Celo network to index and display live, un-settled wager rooms for instant matchmaking.

## 🛠 Technical Architecture

* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Game Engine:** Phaser.js (WebGL)
* **Web3 Integration:** Thirdweb SDK (Targeting Celo Sepolia & Celo Mainnet)
* **Off-Chain Database:** Supabase (PostgreSQL)

## 📱 Mobile-First Design
The application is strictly constrained via viewport meta-tagging and responsive Tailwind layouts to feel like a native iOS/Android application when launched from within the MiniPay browser. The layout features a sticky bottom navigation dock and touch-optimized virtual joysticks for flawless mobile combat.

## 🛡️ Syndicate DAOs (Clans)
Players can pool resources, establish Syndicates, and climb the global leaderboard based on total accumulated power and wager yield, setting the stage for massive future Clan Wars.

---
*Built by Oluwafemi Mobolaji Olagoke for the Celo Ecosystem.*