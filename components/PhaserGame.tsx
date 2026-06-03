'use client';

import { useEffect, useRef } from 'react';
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
// GAME ENGINE
// ==========================================
interface PhaserGameProps {
  walletAddress?: string;
  onGameOver?: (score: number) => void;
}

export default function PhaserGame({ walletAddress, onGameOver }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    // ---------------------------------------------------------
    // 🛠️ PREMIUM SNAKE TUNING & CALIBRATION 🛠️
    // ---------------------------------------------------------
    const HEAD_SCALE = 0.25;  
    const BODY_SCALE = 0.22;  
    const VISUAL_OFFSET = Math.PI; // Fixes the Upside-Down AI Image!
    
    const SPEED = 280; 
    const RECORD_DISTANCE = 2; // Ultra Smooth Recording
    const SPACING_INDEX = 10;  
    // ---------------------------------------------------------

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth < 800 ? window.innerWidth - 32 : 800,
      height: 450,
      parent: gameRef.current,
      backgroundColor: '#06090E',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };

    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    let pathHistory: { x: number, y: number, moveAngle: number }[] = [];

    let food: Phaser.Physics.Arcade.Sprite;
    let scoreText: Phaser.GameObjects.Text;
    let score = 0;

    let targetX = 1500;
    let targetY = 1500;
    let isTouching = false;
    let isEpicFood = false;
    let foodTimer = 0;
    
    // YOUR NEW MECHANICS!
    let pendingGrowth = 0;
    let isEating = false;

    function preload(this: Phaser.Scene) {
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

      // Dimmed grid to make the bright snake pop!
      const grid = this.add.tileSprite(1500, 1500, 3000, 3000, 'arena_default').setDepth(0);
      grid.setAlpha(0.3);

      head = this.physics.add.sprite(1500, 1500, 'classic_head');
      head.setDepth(1000); 
      head.setScale(HEAD_SCALE); 
      head.setCollideWorldBounds(true);
      head.setData('moveAngle', -Math.PI / 2); 

      // Pre-fill history to prevent bunching
      for (let i = 0; i <= 25 * SPACING_INDEX + 10; i++) {
        pathHistory.push({ 
          x: 1500, 
          y: 1500 + (i * RECORD_DISTANCE), 
          moveAngle: -Math.PI / 2 
        });
      }

      for(let i=0; i<20; i++) {
        const texture = i === 19 ? 'classic_tail' : 'classic_body';
        const bodyPart = this.add.sprite(1500, 1500, texture);
        bodyPart.setDepth(999 - i);
        bodyPart.setScale(BODY_SCALE); 
        snakeBody.push(bodyPart);
      }

      food = this.physics.add.sprite(0, 0, 'food_normal');
      food.setDepth(5);

      // YOUR PARTICLE GENERATOR
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('foodSpark', 8, 8);
      gfx.destroy();

      spawnFood(this);

      this.cameras.main.startFollow(head, true, 0.08, 0.08); 
      this.cameras.main.setBounds(0, 0, 3000, 3000);
      this.cameras.main.setZoom(0.85);

      // PREMIUM UI SCORE TEXT
      scoreText = this.add.text(30, 30, '💎 YIELD: 0 cUSD', { 
        fontSize: '28px', 
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        color: '#ffffff', 
        fontStyle: '900',
        stroke: '#000000',
        strokeThickness: 5,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 4, fill: true }
      }).setScrollFactor(0).setDepth(2000);

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { isTouching = true; targetX = pointer.worldX; targetY = pointer.worldY; });
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (isTouching || pointer.isDown) { targetX = pointer.worldX; targetY = pointer.worldY; } });
      this.input.on('pointerup', () => { isTouching = false; });
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (!head || !head.body) return;

      const targetAngle = Phaser.Math.Angle.Between(head.x, head.y, targetX, targetY);
      let currentMoveAngle = head.getData('moveAngle');

      if (isTouching || this.input.activePointer.isDown) {
         currentMoveAngle = Phaser.Math.Angle.RotateTo(currentMoveAngle, targetAngle, 0.15 * (delta / 16));
      }
      head.setData('moveAngle', currentMoveAngle);
      this.physics.velocityFromRotation(currentMoveAngle, SPEED, (head.body as Phaser.Physics.Arcade.Body).velocity);

      // CALIBRATED ROTATION
      head.rotation = currentMoveAngle + VISUAL_OFFSET;

      // YOUR MAGNETIC VACUUM EFFECT!
      const foodDistance = Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y);

      if (foodDistance < 140 && !isEating) {
        const pullAngle = Phaser.Math.Angle.Between(food.x, food.y, head.x, head.y);
        food.x += Math.cos(pullAngle) * 8;
        food.y += Math.sin(pullAngle) * 8;
      }

      if (foodDistance < 28 && !isEating) {
        eatFood(this);
      }

      // LINEAR INTERPOLATION (Stops "String of Beads" lag issues)
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

          // Seamless Tail Tapering
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

      // YOUR GRADUAL GROWTH QUEUE!
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

    // YOUR PREMIUM ANIMATED EATING FUNCTION!
    function eatFood(scene: Phaser.Scene) {
      if (isEating) return;
      isEating = true;
      sfx.playEat();

      // Head gulp animation
      scene.tweens.add({
        targets: head,
        scale: HEAD_SCALE * 1.25,
        duration: 80,
        yoyo: true
      });

      // Food sparks explosion
      scene.add.particles(food.x, food.y, 'foodSpark', {
        speed: { min: 60, max: 220 },
        lifespan: 350,
        quantity: 12,
        scale: { start: 0.4, end: 0 }
      });

      // Vacuum shrink animation
      scene.tweens.add({
        targets: food,
        scale: 0,
        alpha: 0,
        duration: 120,
        ease: 'Back.in',
        onComplete: () => {
          pendingGrowth += isEpicFood ? 12 : 6;

          score += isEpicFood ? 20 : 5;
          scoreText.setText(`💎 YIELD: ${score} cUSD`);

          scene.tweens.add({
            targets: scoreText,
            scale: 1.2,
            duration: 100,
            yoyo: true
          });

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
        scoreText.setText('💎 YIELD: 0 cUSD');
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

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#06090E] relative">
      <div ref={gameRef} className="rounded-xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)] w-full max-w-[800px]" />
      <div className="absolute top-4 right-4 pointer-events-none opacity-50 bg-black/50 px-3 py-1 rounded-full text-xs font-bold text-white/70 tracking-widest border border-white/10">
        DRAG TO STEER
      </div>
    </div>
  );
}
