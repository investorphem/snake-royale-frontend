'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';

// ==========================================
// PREMIUM ZERO-LATENCY AUDIO SYNTHESIZER
// ==========================================
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
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, index) => {
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

// ==========================================
// GAME ENGINE COMPONENT
// ==========================================
interface PhaserGameProps {
  walletAddress?: string;
  onGameOver?: (score: number) => void;
}

export default function PhaserGame({ walletAddress, onGameOver }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);

  // Sync Score, Kills, and Inventory to React UI
  const [currentScore, setCurrentScore] = useState(0);
  const [currentKills, setCurrentKills] = useState(0);
  
  // Mock Inventory Balances (You can hook this up to your database later)
  const [inventoryBalances, setInventoryBalances] = useState({ speed: 2, shield: 1, magnet: 0 });

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  useEffect(() => {
    const handleScoreUpdate = (e: any) => setCurrentScore(e.detail);
    window.addEventListener('updatePhaserScore', handleScoreUpdate);
    return () => window.removeEventListener('updatePhaserScore', handleScoreUpdate);
  }, []);

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    // ---------------------------------------------------------
    // 🛠️ PREMIUM SNAKE TUNING & CALIBRATION 🛠️
    // ---------------------------------------------------------
    const HEAD_SCALE = 0.22;  
    const BODY_SCALE = 0.19;  
    const VISUAL_OFFSET = Math.PI; // Fixes upside down head
    
    const SPEED = 280; 
    const RECORD_DISTANCE = 2; // Ultra tight recording
    const SPACING_INDEX = 6;   // Tighter spacing = Seamless Tube!
    // ---------------------------------------------------------

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: gameRef.current,
        width: '100%',
        height: '100%',
      },
      backgroundColor: '#06090E',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };

    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    let pathHistory: { x: number, y: number, moveAngle: number }[] = [];
    let food: Phaser.Physics.Arcade.Sprite;
    
    let joystickBase: Phaser.GameObjects.Arc;
    let joystickThumb: Phaser.GameObjects.Arc;
    let isJoystickActive = false;

    let score = 0;
    let isEpicFood = false;
    let foodTimer = 0;
    let pendingGrowth = 0;
    let isEating = false;
    let isDead = false;

    function preload(this: Phaser.Scene) {
      this.load.image('arena_default', '/assets/arena_default.png');
      this.load.image('classic_head', '/assets/classic_head.png');
      this.load.image('classic_body', '/assets/classic_body.png');
      this.load.image('classic_tail', '/assets/classic_tail.png'); 
      this.load.image('food_normal', '/assets/food_normal.png');
      this.load.image('food_epic', '/assets/food_epic.png');
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 3000, 3000);

      const grid = this.add.tileSprite(1500, 1500, 3000, 3000, 'arena_default').setDepth(0);
      grid.setAlpha(0.4);

      head = this.physics.add.sprite(1500, 1500, 'classic_head');
      head.setDepth(1000); 
      head.setScale(HEAD_SCALE); 
      head.setCollideWorldBounds(true);
      head.setData('moveAngle', -Math.PI / 2); 

      // Pre-fill history to prevent bunching
      for (let i = 0; i <= 35 * SPACING_INDEX + 10; i++) {
        pathHistory.push({ x: 1500, y: 1500 + (i * RECORD_DISTANCE), moveAngle: -Math.PI / 2 });
      }

      for(let i=0; i<30; i++) {
        const texture = i === 29 ? 'classic_tail' : 'classic_body';
        const bodyPart = this.add.sprite(1500, 1500, texture);
        bodyPart.setDepth(999 - i);
        bodyPart.setScale(BODY_SCALE); 
        snakeBody.push(bodyPart);
      }

      food = this.physics.add.sprite(0, 0, 'food_normal');
      food.setDepth(5);

      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('foodSpark', 8, 8);
      gfx.destroy();

      spawnFood(this);

      this.cameras.main.startFollow(head, true, 0.08, 0.08); 
      this.cameras.main.setBounds(0, 0, 3000, 3000);
      this.cameras.main.setZoom(0.85);

      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);

      // =====================================
      // ON-SCREEN REFLECTIVE VIRTUAL JOYSTICK
      // =====================================
      this.input.addPointer(2); 

      joystickBase = this.add.circle(0, 0, 70, 0xffffff, 0.15).setScrollFactor(0).setDepth(3000).setVisible(false);
      joystickThumb = this.add.circle(0, 0, 35, 0xffffff, 0.4).setScrollFactor(0).setDepth(3000).setVisible(false);

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { 
        if (pointer.x > this.cameras.main.width * 0.6) return; // Leave right side for powerups
        if (isDead) return;
        
        isJoystickActive = true;
        joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
        joystickThumb.setPosition(pointer.x, pointer.y).setVisible(true);
      });

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { 
        if (isJoystickActive && pointer.isDown && !isDead) { 
          const angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
          const dist = Math.min(Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y), 45);

          joystickThumb.setPosition(
            joystickBase.x + Math.cos(angle) * dist,
            joystickBase.y + Math.sin(angle) * dist
          );

          head.setData('moveAngle', angle);
        } 
      });

      this.input.on('pointerup', () => { 
        isJoystickActive = false; 
        joystickBase.setVisible(false);
        joystickThumb.setVisible(false);
      });
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (!head || !head.body || isDead) return;

      let currentMoveAngle = head.getData('moveAngle');
      this.physics.velocityFromRotation(currentMoveAngle, SPEED, (head.body as Phaser.Physics.Arcade.Body).velocity);

      head.rotation = currentMoveAngle + VISUAL_OFFSET;

      const foodDistance = Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y);

      if (foodDistance < 150 && !isEating) {
        const pullAngle = Phaser.Math.Angle.Between(food.x, food.y, head.x, head.y);
        food.x += Math.cos(pullAngle) * 9;
        food.y += Math.sin(pullAngle) * 9;
      }

      if (foodDistance < 30 && !isEating) eatFood(this);

      // Interpolation Physics (Prevents String of Beads)
      const lastPos = pathHistory[0];
      const distToLast = Phaser.Math.Distance.Between(head.x, head.y, lastPos.x, lastPos.y);

      if (distToLast >= RECORD_DISTANCE) {
        const steps = Math.floor(distToLast / RECORD_DISTANCE);
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const interpX = Phaser.Math.Interpolation.Linear([lastPos.x, head.x], t);
          const interpY = Phaser.Math.Interpolation.Linear([lastPos.y, head.y], t);
          
          pathHistory.unshift({ x: interpX, y: interpY, moveAngle: currentMoveAngle });
          if (pathHistory.length > snakeBody.length * SPACING_INDEX + 15) {
            pathHistory.pop();
          }
        }
      }

      // Apply Body Positions & Collision
      for (let i = 0; i < snakeBody.length; i++) {
        const historyIndex = (i + 1) * SPACING_INDEX;
        const targetPos = pathHistory[historyIndex];

        if (targetPos) {
          snakeBody[i].setPosition(targetPos.x, targetPos.y);
          
          const frontSegment = i === 0 ? head : snakeBody[i - 1];
          const angleToFront = Phaser.Math.Angle.Between(snakeBody[i].x, snakeBody[i].y, frontSegment.x, frontSegment.y);
          snakeBody[i].rotation = angleToFront + VISUAL_OFFSET;

          const taperStart = snakeBody.length - 12;
          if (i > taperStart) {
            const step = (BODY_SCALE - 0.08) / 12;
            const scaleDown = BODY_SCALE - ((i - taperStart) * step);
            snakeBody[i].setScale(Math.max(scaleDown, 0.08)); 
          } else {
            snakeBody[i].setScale(BODY_SCALE); 
          }

          // =====================================
          // 💀 SELF COLLISION (DEATH MECHANISM)
          // =====================================
          // Don't check the first 25 segments (the neck), or the snake will instantly die!
          if (i > 25 && !isDead) {
            const bodyDist = Phaser.Math.Distance.Between(head.x, head.y, snakeBody[i].x, snakeBody[i].y);
            if (bodyDist < 18) {
              triggerDeath(this);
            }
          }
        }
      }

      if (isEpicFood) {
        foodTimer -= delta;
        if (foodTimer < 1500) food.alpha = Math.floor(time / 100) % 2 === 0 ? 0.3 : 1;
        if (foodTimer <= 0) spawnFood(this); 
      }

      // Growth Queue
      if (pendingGrowth > 0 && time % 60 < 16) {
        const lastSegment = snakeBody[snakeBody.length - 1];
        lastSegment.setTexture('classic_body');

        const newTail = this.add.sprite(lastSegment.x, lastSegment.y, 'classic_tail');
        newTail.setDepth(lastSegment.depth - 1);
        newTail.setScale(BODY_SCALE);
        snakeBody.push(newTail);

        for (let j = 0; j < SPACING_INDEX; j++) {
          const lastHistory = pathHistory[pathHistory.length - 1];
          if (lastHistory) pathHistory.push({ ...lastHistory });
        }
        pendingGrowth--;
      }

      // Wall Collision Death
      if (head.x <= 20 || head.x >= 2980 || head.y <= 20 || head.y >= 2980) {
        triggerDeath(this);
      }
    }

    function spawnFood(scene: Phaser.Scene) {
      const randomX = Phaser.Math.Between(200, 2800);
      const randomY = Phaser.Math.Between(200, 2800);
      food.setPosition(randomX, randomY);
      isEpicFood = Math.random() < 0.2;

      if (isEpicFood) {
        food.setTexture('food_epic');
        foodTimer = 5000;
        food.alpha = 1;
        food.setScale(0);
        scene.tweens.add({ targets: food, scale: 0.25, duration: 400, ease: 'Back.out' });
        sfx.playEpicSpawn();
      } else {
        food.setTexture('food_normal');
        food.alpha = 1;
        food.setScale(0.2); 
      }
    }

    function eatFood(scene: Phaser.Scene) {
      if (isEating || isDead) return;
      isEating = true;
      sfx.playEat();

      const points = isEpicFood ? 45 : 15;

      // Floating Score Anim
      const popup = scene.add.text(head.x, head.y - 40, `+${points}`, {
        fontSize: '44px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#4ade80',
        fontStyle: '900',
        stroke: '#000000',
        strokeThickness: 8
      }).setOrigin(0.5).setDepth(2500);

      scene.tweens.add({
        targets: popup,
        y: popup.y - 120, 
        alpha: 0,
        duration: 1000,
        ease: 'Cubic.out',
        onComplete: () => popup.destroy()
      });

      scene.tweens.add({
        targets: head,
        scale: HEAD_SCALE * 1.3,
        duration: 80,
        yoyo: true
      });

      scene.add.particles(food.x, food.y, 'foodSpark', {
        speed: { min: 80, max: 250 },
        lifespan: 400,
        quantity: 15,
        scale: { start: 0.5, end: 0 }
      });

      scene.tweens.add({
        targets: food,
        scale: 0,
        alpha: 0,
        duration: 100,
        onComplete: () => {
          pendingGrowth += isEpicFood ? 8 : 4;
          score += points;
          window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));
          spawnFood(scene);
          isEating = false;
        }
      });
    }

    function triggerDeath(scene: Phaser.Scene) {
      if (isDead) return;
      isDead = true;
      sfx.playDie();
      
      head.setVelocity(0, 0); // Stop moving instantly
      scene.cameras.main.shake(500, 0.04);
      
      if (score > 0) onGameOverRef.current?.(score);

      scene.time.delayedCall(800, () => {
        for (let i = 0; i < snakeBody.length; i++) snakeBody[i].destroy();
        snakeBody = [];
        pathHistory = [];
        head.setPosition(1500, 1500);
        head.setData('moveAngle', -Math.PI / 2);

        for (let i = 0; i <= 35 * SPACING_INDEX + 10; i++) {
          pathHistory.push({ x: 1500, y: 1500 + (i * RECORD_DISTANCE), moveAngle: -Math.PI / 2 });
        }

        for(let i=0; i<30; i++) {
          const texture = i === 29 ? 'classic_tail' : 'classic_body';
          const bodyPart = scene.add.sprite(1500, 1500, texture);
          bodyPart.setDepth(999 - i);
          bodyPart.setScale(BODY_SCALE); 
          snakeBody.push(bodyPart);
        }
        score = 0;
        window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));
        spawnFood(scene);
        isDead = false;
      });
    }

    phaserInstance.current = new Phaser.Game(config);

    return () => {
      phaserInstance.current?.destroy(true);
      phaserInstance.current = null;
      if (gameRef.current) gameRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#06090E] z-[9999] overflow-hidden select-none touch-none">
      
      {/* Phaser Canvas */}
      <div ref={gameRef} className="absolute inset-0 w-full h-full" />

      {/* UI OVERLAY */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
        
        {/* TOP ROW */}
        <div className="flex justify-between items-start w-full mt-2">
          
          {/* Back Arrow */}
          <button 
            onClick={() => onGameOverRef.current?.(currentScore)} 
            className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>

          {/* Center Score & Dynamic Kills */}
          <div className="flex flex-col items-center">
             <div className="text-[42px] font-black text-white drop-shadow-md leading-none">{currentScore}</div>
             <div className="text-sm font-bold text-gray-300 mt-1 drop-shadow-md">Kills: <span className="text-white">{currentKills}</span></div>
          </div>

          {/* MiniPay Visible Leaderboard */}
          <div className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-2 w-[110px] text-white shadow-lg text-[10px]">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/10 text-yellow-400 font-bold">
              <span>🏆 Rank</span>
              <span>Pts</span>
            </div>
            <div className="flex flex-col gap-1 font-bold">
               <div className="flex justify-between"><span className="text-gray-400 truncate w-12">1. Pgem</span><span className="text-yellow-400">1299</span></div>
               <div className="flex justify-between"><span className="text-gray-400 truncate w-12">2. Sil</span><span className="text-gray-300">855</span></div>
               <div className="flex justify-between text-[#4ade80] mt-1"><span className="truncate w-12">3. You</span><span>{currentScore}</span></div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Power-up Buttons WITH INVENTORY COUNTS */}
        <div className="flex justify-end items-end w-full pb-6 pr-2">
           <div className="flex gap-3 pointer-events-auto">
              
              {/* SPEED POWER-UP */}
              <button className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-yellow-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-90 transition-all p-2.5">
                <img src="/assets/powerup_speed.png" alt="Speed" className={`w-full h-full object-contain ${inventoryBalances.speed === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">
                  {inventoryBalances.speed}
                </span>
              </button>
              
              {/* SHIELD POWER-UP */}
              <button className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-blue-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-90 transition-all p-2.5">
                <img src="/assets/powerup_shield.png" alt="Shield" className={`w-full h-full object-contain ${inventoryBalances.shield === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">
                  {inventoryBalances.shield}
                </span>
              </button>

              {/* MAGNET POWER-UP */}
              <button className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-purple-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-90 transition-all p-2.5">
                <img src="/assets/powerup_magnet.png" alt="Magnet" className={`w-full h-full object-contain ${inventoryBalances.magnet === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">
                  {inventoryBalances.magnet}
                </span>
              </button>

           </div>
        </div>
        
      </div>
    </div>
  );
}
