'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '@/game/scenes/MainScene';

interface PhaserGameProps {
  walletAddress?: string;
}

export default function PhaserGame({ walletAddress }: PhaserGameProps) {
  // We use refs to stop Next.js from accidentally booting the game twice
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Only run if we are in the browser, the div exists, and the game hasn't started yet
    if (typeof window !== 'undefined' && gameRef.current && !gameInstance.current) {
      
      // Injecting config directly here so we don't rely on external config files
      gameInstance.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        backgroundColor: '#0B0E14',
        scene: [MainScene],
      });

      // Pass the wallet address to the scene
      gameInstance.current.scene.start('MainScene', { walletAddress });
    }

    // Cleanup function when player leaves the page
    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [walletAddress]);

  // Forcing standard pixel sizes so CSS can't break the canvas
  return (
    <div className="flex justify-center items-center w-full h-full bg-black">
      <div ref={gameRef} style={{ width: '800px', height: '600px' }} />
    </div>
  );
}