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

  // Sync Score to React UI
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  useEffect(() => {
    // Custom Event Listener to grab score from Phaser without unmounting
    const handleScoreUpdate = (e: any) => setCurrentScore(e.detail);
    window.addEventListener('updatePhaserScore', handleScoreUpdate);
    return () => window.removeEventListener('updatePhaserScore', handleScoreUpdate);
  }, []);

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    // ---------------------------------------------------------
    // 🛠️ PREMIUM SNAKE TUNING & CALIBRATION 🛠️
    // ---------------------------------------------------------
    const HEAD_SCALE = 0.25;  
    const BODY_SCALE = 0.22;  
    const VISUAL_OFFSET = Math.PI; 
    
    const SPEED = 280; 
    const RECORD_DISTANCE = 2; 
    const SPACING_INDEX = 10;  
    // ---------------------------------------------------------

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      // FULL SCREEN DEVICE SCALING
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
    
    // Joystick Variables
    let joystickBase: Phaser.GameObjects.Arc;
    let joystickThumb: Phaser.GameObjects.Arc;
    let isJoystickActive = false;

    let score = 0;
    let isEpicFood = false;
    let foodTimer = 0;
    let pendingGrowth = 0;
    let isEating = false;

    function preload(this: Phaser.Scene) {
      // Load all premium assets into the Phaser engine
      this.load.image('arena_default', '/assets/arena_default.png');
      this.load.image('classic_head', '/assets/classic_head.png');
      this.load.image('classic_body', '/assets/classic_body.png');
      this.load.image('classic_tail', '/assets/classic_tail.png'); 
      this.load.image('food_normal', '/assets/food_normal.png');
      this.load.image('food_epic', '/assets/food_epic.png');
      this.load.image('food_blue', '/assets/food_blue.png');
      this.load.image('food_purple', '/assets/food_purple.png');
      this.load.image('food_red', '/assets/food_red.png');
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 3000, 3000);

      const grid = this.add.tileSprite(1500, 1500, 3000, 3000, 'arena_default').setDepth(0);
      grid.setAlpha(0.3);

      head = this.physics.add.sprite(1500, 1500, 'classic_head');
      head.setDepth(1000); 
      head.setScale(HEAD_SCALE); 
      head.setCollideWorldBounds(true);
      head.setData('moveAngle', -Math.PI / 2); 

      for (let i = 0; i <= 25 * SPACING_INDEX + 10; i++) {
        pathHistory.push({ x: 1500, y: 1500 + (i * RECORD_DISTANCE), moveAngle: -Math.PI / 2 });
      }

      for(let i=0; i<20; i++) {
        const texture = i === 19 ? 'classic_tail' : 'classic_body';
        const bodyPart = this.add.sprite(1500, 1500, texture);
        bodyPart.setDepth(999 - i);
        bodyPart.setScale(BODY_SCALE); 
        snakeBody.push(bodyPart);
      }

      // Initial food spawn uses the premium assets loaded in preload()
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
      this.input.addPointer(2); // Enable multi-touch

      joystickBase = this.add.circle(0, 0, 60, 0xffffff, 0.1).setScrollFactor(0).setDepth(3000).setVisible(false);
      joystickThumb = this.add.circle(0, 0, 30, 0xffffff, 0.3).setScrollFactor(0).setDepth(3000).setVisible(false);

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { 
        // Only trigger joystick on the left 70% of the screen (leaves right side for buttons)
        if (pointer.x > this.cameras.main.width * 0.7) return; 
        
        isJoystickActive = true;
        joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
        joystickThumb.setPosition(pointer.x, pointer.y).setVisible(true);
      });

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { 
        if (isJoystickActive && pointer.isDown) { 
          const angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
          const dist = Math.min(Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y), 40);

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
      if (!head || !head.body) return;

      let currentMoveAngle = head.getData('moveAngle');
      this.physics.velocityFromRotation(currentMoveAngle, SPEED, (head.body as Phaser.Physics.Arcade.Body).velocity);

      head.rotation = currentMoveAngle + VISUAL_OFFSET;

      const foodDistance = Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y);

      if (foodDistance < 140 && !isEating) {
        const pullAngle = Phaser.Math.Angle.Between(food.x, food.y, head.x, head.y);
        food.x += Math.cos(pullAngle) * 8;
        food.y += Math.sin(pullAngle) * 8;
      }

      if (foodDistance < 28 && !isEating) {
        eatFood(this);
      }

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
        }
      }

      if (isEpicFood) {
        foodTimer -= delta;
        if (foodTimer < 1500) food.alpha = Math.floor(time / 100) % 2 === 0 ? 0.3 : 1;
        if (foodTimer <= 0) spawnFood(this); 
      }

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

      if (head.x <= 10 || head.x >= 2990 || head.y <= 10 || head.y >= 2990) triggerDeath(this);
    }

    function spawnFood(scene: Phaser.Scene) {
      const randomX = Phaser.Math.Between(150, 2850);
      const randomY = Phaser.Math.Between(150, 2850);
      food.setPosition(randomX, randomY);
      isEpicFood = Math.random() < 0.2;

      // Applying premium food images dynamically
      if (isEpicFood) {
        food.setTexture('food_epic');
        foodTimer = 5000;
        food.alpha = 1;
        food.setScale(0);
        scene.tweens.add({ targets: food, scale: 0.25, duration: 400, ease: 'Back.out' });
        sfx.playEpicSpawn();
      } else {
        const standardFoods = ['food_normal', 'food_blue', 'food_purple', 'food_red'];
        food.setTexture(Phaser.Math.RND.pick(standardFoods));
        food.alpha = 1;
        food.setScale(0.2); 
      }
    }

    function eatFood(scene: Phaser.Scene) {
      if (isEating) return;
      isEating = true;
      sfx.playEat();

      const points = isEpicFood ? 45 : 15;

      // 💥 PREMIUM FLOATING POP-UP SCORE 💥
      const popup = scene.add.text(head.x, head.y - 40, `+${points}`, {
        fontSize: '38px',
        fontFamily: 'Arial',
        color: '#4ade80',
        fontStyle: '900',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(2500);

      scene.tweens.add({
        targets: popup,
        y: popup.y - 100, // Float upwards
        alpha: 0,
        duration: 900,
        ease: 'Cubic.out',
        onComplete: () => popup.destroy()
      });

      scene.tweens.add({
        targets: head,
        scale: HEAD_SCALE * 1.25,
        duration: 80,
        yoyo: true
      });

      scene.add.particles(food.x, food.y, 'foodSpark', {
        speed: { min: 60, max: 220 },
        lifespan: 350,
        quantity: 12,
        scale: { start: 0.4, end: 0 }
      });

      scene.tweens.add({
        targets: food,
        scale: 0,
        alpha: 0,
        duration: 120,
        ease: 'Back.in',
        onComplete: () => {
          pendingGrowth += isEpicFood ? 12 : 6;

          score += points;
          // Send updated score to React UI
          window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));

          spawnFood(scene);
          isEating = false;
        }
      });
    }

    function triggerDeath(scene: Phaser.Scene) {
      sfx.playDie();
      if (score > 0) onGameOverRef.current?.(score);
      scene.cameras.main.shake(400, 0.03);
      scene.time.delayedCall(400, () => {
        for (let i = 0; i < snakeBody.length; i++) snakeBody[i].destroy();
        snakeBody = [];
        pathHistory = [];
        head.setPosition(1500, 1500);
        head.setData('moveAngle', -Math.PI / 2);
        head.setVelocity(0, 0);

        for (let i = 0; i <= 25 * SPACING_INDEX + 10; i++) {
          pathHistory.push({ x: 1500, y: 1500 + (i * RECORD_DISTANCE), moveAngle: -Math.PI / 2 });
        }

        for(let i=0; i<20; i++) {
          const texture = i === 19 ? 'classic_tail' : 'classic_body';
          const bodyPart = scene.add.sprite(1500, 1500, texture);
          bodyPart.setDepth(999 - i);
          bodyPart.setScale(BODY_SCALE); 
          snakeBody.push(bodyPart);
        }
        score = 0;
        window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));
        spawnFood(scene);
      });
    }

    phaserInstance.current = new Phaser.Game(config);

    return () => {
      phaserInstance.current?.destroy(true);
      phaserInstance.current = null;
      if (gameRef.current) gameRef.current.innerHTML = '';
    };
  }, []);

  // =========================================================
  // 🎨 REACT UI OVERLAY (Perfectly matches the reference video)
  // =========================================================
  return (
    // FULL SCREEN BREAKOUT CONTAINER
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#06090E] z-[9999] overflow-hidden select-none touch-none">
      
      {/* Phaser Canvas */}
      <div ref={gameRef} className="absolute inset-0 w-full h-full" />

      {/* UI OVERLAY (Pointer-events-none so touches pass through to the game joystick) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-8 z-10">
        
        {/* TOP ROW */}
        <div className="flex justify-between items-start w-full">
          
          {/* TOP LEFT: Back Arrow */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onGameOverRef.current?.(currentScore)} 
              className="pointer-events-auto bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
          </div>

          {/* TOP CENTER: Score & Kills */}
          <div className="flex flex-col items-center mt-2">
             <div className="w-32 h-2.5 bg-black/50 rounded-full mb-2 overflow-hidden border border-white/10">
                <div className="h-full bg-[#4ade80] w-[30%] shadow-[0_0_10px_#4ade80]"></div>
             </div>
             <div className="text-5xl font-black text-white drop-shadow-md leading-none">{currentScore}</div>
             <div className="text-base font-bold text-white mt-1">Kills: <span className="text-gray-300">3</span></div>
          </div>

          {/* TOP RIGHT: Leaderboard */}
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 w-36 text-white shadow-lg hidden sm:block">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/10 text-yellow-400 font-bold text-xs">
              <span>🏆 Rank</span>
              <span>Pts</span>
            </div>
            <div className="flex flex-col gap-1 text-xs font-bold">
               <div className="flex justify-between"><span className="text-gray-400">1. Pgem</span><span className="text-yellow-400">1299</span></div>
               <div className="flex justify-between"><span className="text-gray-400">2. Sil</span><span className="text-gray-300">855</span></div>
               <div className="flex justify-between text-[#4ade80] mt-1"><span>3. You</span><span>{currentScore}</span></div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Premium Image Power-up Buttons */}
        <div className="flex justify-end items-end w-full pb-4 pr-2">
           <div className="flex gap-4 pointer-events-auto">
              {/* SPEED POWER-UP */}
              <button className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border-2 border-yellow-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)] active:scale-90 transition-all p-3">
                <img src="/assets/powerup_speed.png" alt="Speed" className="w-full h-full object-contain drop-shadow-md" />
              </button>
              
              {/* SHIELD POWER-UP */}
              <button className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border-2 border-blue-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-90 transition-all p-3">
                <img src="/assets/powerup_shield.png" alt="Shield" className="w-full h-full object-contain drop-shadow-md" />
              </button>

              {/* MAGNET POWER-UP */}
              <button className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border-2 border-purple-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-90 transition-all p-3">
                <img src="/assets/powerup_magnet.png" alt="Magnet" className="w-full h-full object-contain drop-shadow-md" />
              </button>
           </div>
        </div>
        
      </div>
    </div>
  );
}
