'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useActiveAccount } from 'thirdweb/react';
import MainScene from '@/game/scenes/MainScene';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game| null>(null);
  const account = useActiveAccount();

  useEffect(() => {
    // 1. Ensure the container exists and we have an active connected wallet
    if (!gameRef.current || !account?.address || phaserInstance.current) return;

    // 2. Phaser Game Configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [MainScene],
      callbacks: {
        preBoot: (game) => {
          // Store the connected wallet address on the game registry 
          // so that scenes can access it globally
          game.registry.set('walletAddress', account.address);
        }
      }
    };

    // 3. Initialize Phaser
    phaserInstance.current = new Phaser.Game(config);

    // Cleanup when the component unmounts or wallet changes
    return () => {
      if (phaserInstance.current) {
        phaserInstance.current.destroy(true);
        phaserInstance.current = null;
      }
    };
  }, [account?.address]);

  return (
    <div 
      ref={gameRef} 
      className="w-full h-full flex items-center justify-center bg-[#0d0d12]"
    />
  );
}