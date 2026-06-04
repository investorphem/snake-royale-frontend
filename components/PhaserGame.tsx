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

  playHiss() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.3; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; 

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 4000; 
    bandpass.Q.value = 1.0;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  playEat() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); 
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playEpicSpawn() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
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
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4); 
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  playPowerup() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
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

  const [currentScore, setCurrentScore] = useState(0);
  const [currentKills, setCurrentKills] = useState(0);
  const [inventoryBalances, setInventoryBalances] = useState({ speed: 3, shield: 2, magnet: 3 });
  const [gameOverData, setGameOverData] = useState<{score: number, kills: number} | null>(null);

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  useEffect(() => {
    const handleScoreUpdate = (e: any) => setCurrentScore(e.detail);
    const handleGameOverUI = (e: any) => setGameOverData(e.detail);
    window.addEventListener('updatePhaserScore', handleScoreUpdate);
    window.addEventListener('showGameOver', handleGameOverUI);
    return () => {
      window.removeEventListener('updatePhaserScore', handleScoreUpdate);
      window.removeEventListener('showGameOver', handleGameOverUI);
    };
  }, []);

  const handleUsePowerup = (type: 'speed' | 'shield' | 'magnet') => {
    if (inventoryBalances[type] > 0 && !gameOverData) {
      setInventoryBalances(prev => ({ ...prev, [type]: prev[type] - 1 }));
      window.dispatchEvent(new CustomEvent('activatePowerup', { detail: type }));
      sfx.playPowerup();
    }
  };

  const handlePlayAgain = () => {
    setGameOverData(null);
    setCurrentScore(0);
    window.dispatchEvent(new CustomEvent('restartGame'));
  };

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    // ---------------------------------------------------------
    // 🛠️ AAA FRAME-PERFECT CALIBRATION ENGINE 🛠️
    // ---------------------------------------------------------
    const HEAD_SIZE = 55;  
    const BODY_SIZE = 42;  
    const VISUAL_OFFSET = Math.PI / 2; // Perfectly aligns UP-facing images
    const BASE_SPEED = 240; // Slightly slower base speed prevents jagged edges
    
    // Frames recorded per segment spacing. Lower = tighter overlap.
    const SPACING_FRAMES = 5;   
    const COLLISION_RADIUS = 28; 
    // ---------------------------------------------------------

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: { mode: Phaser.Scale.RESIZE, parent: gameRef.current, width: '100%', height: '100%' },
      backgroundColor: '#06090E',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };

    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    
    // NEW: Frame-perfect history array guarantees zero jagged corners
    let pathHistory: { x: number, y: number, angle: number }[] = [];
    
    let food: Phaser.Physics.Arcade.Sprite;
    let tongue: Phaser.GameObjects.Sprite;
    let tongueOffset = 0;
    let isFlicking = false;

    let joystickBase: Phaser.GameObjects.Arc;
    let joystickThumb: Phaser.GameObjects.Arc;
    let isJoystickActive = false;
    let targetJoystickAngle = -Math.PI / 2;
    let currentMoveAngle = -Math.PI / 2;

    let score = 0;
    let isEpicFood = false;
    let foodTimer = 0;
    let pendingGrowth = 0;
    let isEating = false;
    let isDead = false;

    let powerUpSpeedMult = 1;
    let magnetRange = 150;
    let isShielded = false;

    function preload(this: Phaser.Scene) {
      this.load.image('arena_default', '/assets/arena_default.png');
      this.load.image('classic_head', '/assets/classic_head.png');
      this.load.image('food_normal', '/assets/food_normal.png');
      this.load.image('food_epic', '/assets/food_epic.png');
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 3000, 3000);

      const grid = this.add.tileSprite(1500, 1500, 3000, 3000, 'arena_default').setDepth(0);
      grid.setAlpha(0.4);

      // ========================================================
      // 🟢 THE VIDEO-MATCHING GLOSSY BODY GENERATOR
      // Matches the exact lime-green segmented look from your video
      // ========================================================
      const radius = 24;
      const bgfx = this.make.graphics({ x: 0, y: 0 }, false);
      bgfx.fillStyle(0x166534, 1); // Dark green outer stroke
      bgfx.fillCircle(radius, radius, radius);
      bgfx.fillStyle(0x4ade80, 1); // Bright lime-green body
      bgfx.fillCircle(radius, radius, radius - 3);
      bgfx.fillStyle(0x86efac, 0.9); // Glossy top-left specular highlight
      bgfx.fillCircle(radius - 6, radius - 6, radius - 14);
      bgfx.generateTexture('video_body', radius * 2, radius * 2);
      bgfx.destroy();

      // Procedural Forked Tongue
      const tgfx = this.make.graphics({ x: 0, y: 0 }, false);
      tgfx.lineStyle(3, 0xdc2626, 1); 
      tgfx.beginPath();
      tgfx.moveTo(15, 30); tgfx.lineTo(15, 10); tgfx.lineTo(8, 0);   
      tgfx.moveTo(15, 10); tgfx.lineTo(22, 0);  
      tgfx.strokePath();
      tgfx.generateTexture('premium_tongue', 30, 40);
      tgfx.destroy();

      head = this.physics.add.sprite(1500, 1500, 'classic_head');
      head.setDepth(1000); 
      head.setDisplaySize(HEAD_SIZE, HEAD_SIZE); 
      head.setCollideWorldBounds(true);
      head.setData('moveAngle', -Math.PI / 2); 

      tongue = this.add.sprite(1500, 1500, 'premium_tongue');
      tongue.setDepth(999); 
      tongue.setVisible(false);

      // Pre-fill path history so body spawns behind head immediately
      for (let i = 0; i <= 200; i++) {
        pathHistory.push({ 
            x: 1500, 
            y: 1500 + (i * 3), 
            angle: -Math.PI / 2 
        });
      }

      // Initialize initial 15 body segments using the Video-Match Body
      for(let i=0; i<15; i++) {
        const bodyPart = this.add.sprite(1500, 1500, 'video_body');
        bodyPart.setDepth(998 - i);
        bodyPart.setDisplaySize(BODY_SIZE, BODY_SIZE); 
        snakeBody.push(bodyPart);
      }

      food = this.physics.add.sprite(0, 0, 'food_normal');
      food.setDepth(5);

      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff); gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('foodSpark', 8, 8);
      gfx.destroy();

      spawnFood(this);

      this.cameras.main.startFollow(head, true, 0.08, 0.08); 
      this.cameras.main.setBounds(0, 0, 3000, 3000);
      this.cameras.main.setZoom(0.85);

      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);

      window.addEventListener('restartGame', () => {
        isDead = false;
        score = 0;
        pendingGrowth = 0;
        pathHistory = [];
        tongueOffset = 0;

        head.setPosition(1500, 1500);
        currentMoveAngle = -Math.PI / 2;
        targetJoystickAngle = -Math.PI / 2;
        head.setVisible(true);

        for (let i = 0; i <= 200; i++) {
          pathHistory.push({ x: 1500, y: 1500 + (i * 3), angle: -Math.PI / 2 });
        }

        snakeBody.forEach(s => s.destroy());
        snakeBody = [];
        for(let i=0; i<15; i++) {
          const bodyPart = this.add.sprite(1500, 1500, 'video_body');
          bodyPart.setDepth(998 - i);
          bodyPart.setDisplaySize(BODY_SIZE, BODY_SIZE); 
          snakeBody.push(bodyPart);
        }

        window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));
        spawnFood(this);
      });

      const handlePowerupEvent = (e: any) => {
        if (isDead) return;
        const type = e.detail;
        let popupText = "";

        if (type === 'speed') {
          powerUpSpeedMult = 1.8;
          popupText = "⚡ SPEED BOOST!";
          setTimeout(() => powerUpSpeedMult = 1, 5000);
        }
        if (type === 'magnet') {
          magnetRange = 500;
          popupText = "🧲 MAGNET ACTIVE!";
          setTimeout(() => magnetRange = 150, 8000);
        }
        if (type === 'shield') {
          isShielded = true;
          popupText = "🛡️ SHIELDED!";
          head.setTint(0x60a5fa); 
          snakeBody.forEach(seg => seg.setTint(0x60a5fa));
          setTimeout(() => { 
            isShielded = false; 
            head.clearTint();
            snakeBody.forEach(seg => seg.clearTint());
          }, 8000);
        }

        const popup = this.add.text(head.x, head.y - 60, popupText, {
          fontSize: '32px', fontFamily: 'Arial', color: '#ffffff', fontStyle: '900', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(3000);

        this.tweens.add({ targets: popup, y: popup.y - 100, alpha: 0, duration: 1500, onComplete: () => popup.destroy() });
      };

      window.addEventListener('activatePowerup', handlePowerupEvent);
      this.events.on('destroy', () => window.removeEventListener('activatePowerup', handlePowerupEvent));

      this.input.addPointer(2); 
      joystickBase = this.add.circle(0, 0, 70, 0xffffff, 0.15).setScrollFactor(0).setDepth(3000).setVisible(false);
      joystickThumb = this.add.circle(0, 0, 35, 0xffffff, 0.4).setScrollFactor(0).setDepth(3000).setVisible(false);

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { 
        if (pointer.x > this.cameras.main.width * 0.7) return; 
        if (isDead) return;
        isJoystickActive = true;
        joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
        joystickThumb.setPosition(pointer.x, pointer.y).setVisible(true);
      });

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { 
        if (isJoystickActive && pointer.isDown && !isDead) { 
          const angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
          const dist = Math.min(Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y), 45);

          joystickThumb.setPosition(joystickBase.x + Math.cos(angle) * dist, joystickBase.y + Math.sin(angle) * dist);
          targetJoystickAngle = angle; 
        } 
      });

      this.input.on('pointerup', () => { 
        isJoystickActive = false; 
        joystickBase.setVisible(false);
        joystickThumb.setVisible(false);
      });
    }

    function flickTongue(scene: Phaser.Scene) {
      if (isFlicking || isEating || isDead) return;
      isFlicking = true;
      sfx.playHiss(); 
      tongue.setVisible(true);

      scene.tweens.add({
        targets: { offset: 0 },
        offset: HEAD_SIZE * 0.5, 
        duration: 150,
        yoyo: true,
        onUpdate: (tween) => { tongueOffset = Number(tween.getValue()) || 0; },
        onComplete: () => {
          tongueOffset = 0;
          tongue.setVisible(false);
          scene.time.delayedCall(800, () => isFlicking = false);
        }
      });
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (!head || !head.body || isDead) return;

      // 🟢 ULTRA-SMOOTH ARC TURNING (Fixes the 90-degree jagged bug!)
      if (isJoystickActive) {
        let diff = Phaser.Math.Angle.Wrap(targetJoystickAngle - currentMoveAngle);
        // Heavy dampening here prevents sharp turns, forcing gorgeous wide arcs
        currentMoveAngle += diff * 0.08; 
      }
      
      this.physics.velocityFromRotation(currentMoveAngle, BASE_SPEED * powerUpSpeedMult, (head.body as Phaser.Physics.Arcade.Body).velocity);
      head.rotation = currentMoveAngle + VISUAL_OFFSET;

      // 🟢 FRAME-PERFECT HISTORY (Every single frame is recorded for the body to perfectly follow)
      pathHistory.unshift({ x: head.x, y: head.y, angle: currentMoveAngle });
      // Keep array size capped to save memory
      if (pathHistory.length > snakeBody.length * SPACING_FRAMES + 20) {
        pathHistory.pop();
      }

      const snoutDist = HEAD_SIZE * 0.45; 
      const totalDist = snoutDist + tongueOffset;
      tongue.setPosition(
          head.x + Math.cos(currentMoveAngle) * totalDist,
          head.y + Math.sin(currentMoveAngle) * totalDist
      );
      tongue.rotation = currentMoveAngle + VISUAL_OFFSET;

      const foodDistance = Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y);

      if (foodDistance < 250 && foodDistance > 60) {
        if (!isFlicking && Math.random() < 0.1) flickTongue(this);
      }
      if (Math.random() < 0.005) flickTongue(this);

      if (foodDistance < magnetRange && !isEating) {
        const pullAngle = Phaser.Math.Angle.Between(food.x, food.y, head.x, head.y);
        food.x += Math.cos(pullAngle) * (magnetRange === 500 ? 15 : 9); 
        food.y += Math.sin(pullAngle) * (magnetRange === 500 ? 15 : 9);
      }

      if (foodDistance < 30 && !isEating) eatFood(this);

      // 🟢 FRAME-PERFECT BODY POSITIONING
      const totalSegments = snakeBody.length;
      for (let i = 0; i < totalSegments; i++) {
        // Find the exact frame in history that this segment belongs to
        const historyIndex = (i + 1) * SPACING_FRAMES;
        const targetPos = pathHistory[historyIndex];

        if (targetPos) {
          snakeBody[i].setPosition(targetPos.x, targetPos.y);
          snakeBody[i].rotation = targetPos.angle + VISUAL_OFFSET; 

          // AAA Tail Tapering
          const taperStart = totalSegments - 8;
          let currentBodySize = BODY_SIZE;

          if (i > taperStart) {
            const ratio = (i - taperStart) / 8;
            currentBodySize = BODY_SIZE - (ratio * (BODY_SIZE - 10)); 
          }

          if (powerUpSpeedMult > 1) {
             snakeBody[i].setDisplaySize(currentBodySize * 0.85, currentBodySize * 1.15); // Stretch
          } else {
             snakeBody[i].setDisplaySize(currentBodySize, currentBodySize);
          }

          // 💀 Accurate Death Physics (Wait until segment 15 so neck doesn't kill you)
          if (i > 15 && !isDead && !isShielded) {
            const bodyDist = Phaser.Math.Distance.Between(head.x, head.y, snakeBody[i].x, snakeBody[i].y);
            if (bodyDist < COLLISION_RADIUS) {
              triggerDeath(this);
            }
          }
        }
      }

      if (isEpicFood) {
        foodTimer -= delta;
        food.setDisplaySize(40 + Math.sin(time / 150) * 8, 40 + Math.sin(time / 150) * 8);
        if (foodTimer < 1500) food.alpha = Math.floor(time / 100) % 2 === 0 ? 0.3 : 1;
        if (foodTimer <= 0) spawnFood(this); 
      }

      // Smooth Segment Spawning
      if (pendingGrowth > 0 && time % 5 == 0) {
        const lastSegment = snakeBody[snakeBody.length - 1];
        const newTail = this.add.sprite(lastSegment.x, lastSegment.y, 'video_body');
        newTail.setDepth(lastSegment.depth - 1);
        newTail.setDisplaySize(BODY_SIZE, BODY_SIZE);
        if (isShielded) newTail.setTint(0x60a5fa);
        snakeBody.push(newTail);
        pendingGrowth--;
      }

      if (head.x <= 20 || head.x >= 2980 || head.y <= 20 || head.y >= 2980) {
        if (!isShielded) triggerDeath(this);
        else {
          targetJoystickAngle = currentMoveAngle + Math.PI;
        }
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
        food.setDisplaySize(45, 45);
        scene.tweens.add({ targets: food, scale: 1.2, duration: 400, ease: 'Back.out' });
        sfx.playEpicSpawn();
      } else {
        food.setTexture('food_normal');
        food.alpha = 1;
        food.setDisplaySize(28, 28); 
      }
    }

    function eatFood(scene: Phaser.Scene) {
      if (isEating || isDead) return;
      isEating = true;
      sfx.playEat();

      const points = isEpicFood ? 45 : 15;

      const popup = scene.add.text(head.x, head.y - 40, `+${points}`, {
        fontSize: '44px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#4ade80', fontStyle: '900', stroke: '#000000', strokeThickness: 8
      }).setOrigin(0.5).setDepth(2500);

      scene.tweens.add({
        targets: popup, y: popup.y - 120, alpha: 0, duration: 1000, ease: 'Cubic.out', onComplete: () => popup.destroy()
      });

      scene.tweens.add({ targets: head, scaleX: 0.30, scaleY: 0.20, duration: 80, yoyo: true });

      scene.add.particles(food.x, food.y, 'foodSpark', {
        speed: { min: 80, max: 250 }, lifespan: 400, quantity: 15, scale: { start: 0.5, end: 0 }
      });

      scene.tweens.add({
        targets: food, scale: 0, alpha: 0, duration: 100,
        onComplete: () => {
          pendingGrowth += isEpicFood ? 12 : 4; 
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
      
      head.setVelocity(0, 0); 
      tongue.setVisible(false);
      
      scene.add.particles(head.x, head.y, 'foodSpark', {
        speed: { min: 50, max: 300 }, lifespan: 800, quantity: 40, scale: { start: 0.8, end: 0 }
      });

      head.setVisible(false);
      snakeBody.forEach(s => s.setVisible(false));

      scene.cameras.main.shake(600, 0.04);

      scene.time.delayedCall(1000, () => {
        window.dispatchEvent(new CustomEvent('showGameOver', { detail: { score, kills: 0 } }));
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
      <div ref={gameRef} className="absolute inset-0 w-full h-full" />

      {/* 💀 GAME OVER OVERLAY 💀 */}
      {gameOverData && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 animate-fade-in pointer-events-auto">
           <h2 className="text-5xl font-black text-white italic drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] mb-2 text-center tracking-tighter">
              GAME OVER
           </h2>
           <div className="bg-[#111722] border border-white/10 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#84cc16] to-[#22c55e]"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1 mt-2">Total Yield</p>
              <p className="text-6xl font-black text-[#4ade80] mb-8 drop-shadow-md">{gameOverData.score}</p>
              <div className="w-full flex justify-between px-6 pb-2">
                <div className="flex flex-col items-center">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Kills</p>
                  <p className="text-2xl font-black text-white">{gameOverData.kills}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Rank</p>
                  <p className="text-2xl font-black text-yellow-400">#3</p>
                </div>
              </div>
           </div>
           <div className="flex flex-col gap-3 w-full max-w-sm">
              <button onClick={handlePlayAgain} className="w-full bg-gradient-to-b from-[#a3e635] to-[#65a30d] text-black rounded-xl py-4 font-black text-lg shadow-[0_4px_0_#3f6212] active:shadow-[0_0px_0_#3f6212] active:translate-y-1 transition-all uppercase tracking-wider">
                PLAY AGAIN
              </button>
              <button onClick={() => onGameOverRef.current?.(gameOverData.score)} className="w-full bg-[#1A1F2E] border border-white/10 text-white rounded-xl py-4 font-black text-sm active:bg-white/5 transition-all uppercase tracking-wider">
                RETURN HOME
              </button>
           </div>
        </div>
      )}

      {/* 🎮 IN-GAME HUD */}
      {!gameOverData && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          <div className="flex justify-between items-start w-full mt-2">
            <button onClick={() => onGameOverRef.current?.(currentScore)} className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex flex-col items-center">
               <div className="text-[42px] font-black text-white drop-shadow-md leading-none">{currentScore}</div>
               <div className="text-sm font-bold text-gray-300 mt-1 drop-shadow-md">Kills: <span className="text-white">{currentKills}</span></div>
            </div>
            <div className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-2 w-[110px] text-white shadow-lg text-[10px]">
              <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/10 text-yellow-400 font-bold">
                <span>🏆 Rank</span><span>Pts</span>
              </div>
              <div className="flex flex-col gap-1 font-bold">
                 <div className="flex justify-between"><span className="text-gray-400 truncate w-12">1. Pgem</span><span className="text-yellow-400">1299</span></div>
                 <div className="flex justify-between"><span className="text-gray-400 truncate w-12">2. Sil</span><span className="text-gray-300">855</span></div>
                 <div className="flex justify-between text-[#4ade80] mt-1"><span className="truncate w-12">3. You</span><span>{currentScore}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-end w-full pb-6 pr-2">
             <div className="flex gap-3 pointer-events-auto">
                <button onClick={() => handleUsePowerup('speed')} className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-yellow-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-90 transition-all p-2.5">
                  <img src="/assets/powerup_speed.png" alt="Speed" className={`w-full h-full object-contain ${inventoryBalances.speed === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                  <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">{inventoryBalances.speed}</span>
                </button>
                <button onClick={() => handleUsePowerup('shield')} className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-blue-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-90 transition-all p-2.5">
                  <img src="/assets/powerup_shield.png" alt="Shield" className={`w-full h-full object-contain ${inventoryBalances.shield === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                  <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">{inventoryBalances.shield}</span>
                </button>
                <button onClick={() => handleUsePowerup('magnet')} className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-purple-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-90 transition-all p-2.5">
                  <img src="/assets/powerup_magnet.png" alt="Magnet" className={`w-full h-full object-contain ${inventoryBalances.magnet === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                  <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">{inventoryBalances.magnet}</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
