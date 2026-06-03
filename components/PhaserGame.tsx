'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';

// ... (Keep AudioSynth class exactly as it is)
class AudioSynth {
  private ctx: AudioContext | null = null;
  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  playEat() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08); 
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }
  playEpicSpawn() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx; 
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + (index * 0.04));
      gain.gain.setValueAtTime(0.15, now + (index * 0.04));
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + (index * 0.04));
      osc.stop(now + 0.4);
    });
  }
  playDie() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.4); 
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
}
const sfx = new AudioSynth();

interface PhaserGameProps { walletAddress?: string; onGameOver?: (score: number) => void; }

export default function PhaserGame({ walletAddress, onGameOver }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 450,
      parent: gameRef.current,
      backgroundColor: '#06090E',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };

    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    let pathHistory: { x: number, y: number, rotation: number }[] = [];
    let food: Phaser.Physics.Arcade.Sprite;
    let scoreText: Phaser.GameObjects.Text;
    let score = 0;
    const speed = 250; // Slightly faster for more arcade intensity
    const spacing = 2; // TIGHTENED: Produces a sleeker, less "wide" line

    let targetX = 1000;
    let targetY = 1000;
    let isTouching = false;
    let isEpicFood = false;
    let foodTimer = 0;

    function preload(this: Phaser.Scene) {
      this.load.image('arena_default', '/assets/arena_default.png');
      this.load.image('classic_head', '/assets/classic_head.png');
      this.load.image('classic_body', '/assets/classic_body.png');
      this.load.image('classic_tail', '/assets/classic_tail.png');
      this.load.image('food_normal', '/assets/food_normal.png');
      this.load.image('food_epic', '/assets/food_epic.png');
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 2000, 2000);
      
      // PREMIUM ARENA LOOK
      const arena = this.add.tileSprite(1000, 1000, 2000, 2000, 'arena_default');
      arena.setAlpha(0.7); 

      head = this.physics.add.sprite(1000, 1000, 'classic_head');
      head.setDepth(1000);
      head.setScale(0.85); // Slimmer head
      head.setCollideWorldBounds(true);

      for(let i=0; i<15; i++) {
        const bodyPart = this.add.sprite(1000, 1000, i === 14 ? 'classic_tail' : 'classic_body');
        bodyPart.setDepth(999 - i);
        bodyPart.setScale(0.65); // Slimmer body
        snakeBody.push(bodyPart);
      }

      food = this.physics.add.sprite(0, 0, 'food_normal');
      spawnFood(this);

      this.cameras.main.startFollow(head, true, 0.1, 0.1);
      scoreText = this.add.text(20, 20, 'YIELD: 0 cUSD', { fontSize: '24px', fontFamily: 'sans-serif', color: '#ffffff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(2000);
      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);

      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { isTouching = true; targetX = p.worldX; targetY = p.worldY; });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (isTouching || p.isDown) { targetX = p.worldX; targetY = p.worldY; } });
      this.input.on('pointerup', () => { isTouching = false; });
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (!head || !head.body) return;
      const targetAngle = Phaser.Math.Angle.Between(head.x, head.y, targetX, targetY);
      
      if (isTouching || this.input.activePointer.isDown) {
         head.rotation = Phaser.Math.Angle.RotateTo(head.rotation, targetAngle, 0.18 * (delta / 16));
      }
      this.physics.velocityFromRotation(head.rotation, speed, (head.body as Phaser.Physics.Arcade.Body).velocity);

      pathHistory.unshift({ x: head.x, y: head.y, rotation: head.rotation });
      if (pathHistory.length > snakeBody.length * spacing) pathHistory.pop();

      for (let i = 0; i < snakeBody.length; i++) {
        const targetPos = pathHistory[(i + 1) * spacing];
        if (targetPos) {
          snakeBody[i].setPosition(targetPos.x, targetPos.y);
          snakeBody[i].setRotation(targetPos.rotation);
          snakeBody[i].setScale(0.65); 
        }
      }
      if (head.x <= 5 || head.x >= 1995 || head.y <= 5 || head.y >= 1995) triggerDeath(this);
    }

    function spawnFood(scene: Phaser.Scene) {
      food.setPosition(Phaser.Math.Between(100, 1900), Phaser.Math.Between(100, 1900));
      isEpicFood = Math.random() < 0.2;
      food.setTexture(isEpicFood ? 'food_epic' : 'food_normal');
      if (isEpicFood) sfx.playEpicSpawn();
    }

    function eatFood(scene: Phaser.Scene) {
      sfx.playEat();
      const last = snakeBody[snakeBody.length - 1];
      const newBody = scene.add.sprite(last.x, last.y, 'classic_body').setScale(0.65);
      snakeBody.push(newBody);
      score += (isEpicFood ? 20 : 5);
      scoreText.setText(`YIELD: ${score} cUSD`);
      spawnFood(scene);
    }

    function triggerDeath(scene: Phaser.Scene) {
      sfx.playDie();
      onGameOverRef.current?.(score);
      scene.cameras.main.shake(400, 0.03);
      scene.time.delayedCall(400, () => {
        score = 0; scoreText.setText('YIELD: 0 cUSD');
        head.setPosition(1000, 1000);
        snakeBody.forEach(s => s.destroy()); snakeBody = [];
        for(let i=0; i<15; i++) snakeBody.push(scene.add.sprite(1000, 1000, 'classic_body').setScale(0.65));
      });
    }

    phaserInstance.current = new Phaser.Game(config);
    return () => { phaserInstance.current?.destroy(true); phaserInstance.current = null; };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#06090E] relative">
      <div ref={gameRef} className="rounded-xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)] w-full max-w-[800px]" />
    </div>
  );
}
