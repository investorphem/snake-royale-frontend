'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import config from '@/game/config';
import MainScene from '@/game/scenes/MainScene';

// 1. Define the props interface to satisfy TypeScript
interface PhaserGameProps {
  walletAddress?: string;
}

// 2. Pass the props into the component
export default function PhaserGame({ walletAddress }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && gameRef.current) {
      // Initialize the Phaser Game
      const game = new Phaser.Game({
        ...config,
        parent: gameRef.current,
      });

      // Pass the wallet address into the MainScene when it boots up
      game.scene.add('MainScene', MainScene, true, { walletAddress });

      return () => {
        game.destroy(true);
      };
    }
  }, [walletAddress]); // Re-run if wallet address changes

  return <div ref={gameRef} className="w-full h-full" />;
}