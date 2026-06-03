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
    let pathHistory: { x: number, y: number }[] = [];
    let food: Phaser.Physics.Arcade.Sprite;

    let scoreText: Phaser.GameObjects.Text;
    let score = 0;
    
    // =====================================
    // CORE PREMIUM PHYSICS SETTINGS
    // =====================================
    const speed = 250; 
    const spacing = 5; // Distance between segments
    
    // Fixes 1024x1024 AI image resolutions!
    const HEAD_SCALE = 0.08; 
    const BODY_SCALE = 0.07; 
    
    // NOTE: If your snake faces DOWN instead of UP when moving, change this to -Math.PI / 2
    const visualOffset = Math.PI / 2; 

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
      this.load.image('food_blue', '/assets/food_blue.png');
      this.load.image('food_purple', '/assets/food_purple.png');
      this.load.image('food_red', '/assets/food_red.png');

      this.load.on('loaderror', (fileObj: any) => {
        const g = this.add.graphics();
        if (fileObj.key.includes('arena')) { g.fillStyle(0x0B0F17); g.fillRect(0, 0, 512, 512); }
        else if (fileObj.key.includes('head')) { g.fillStyle(0x22c55e); g.fillCircle(15, 15, 15); }
        else if (fileObj.key.includes('tail')) { g.fillStyle(0x16a34a); g.fillTriangle(0, 0, 30, 15, 0, 30); } 
        else if (fileObj.key.includes('body')) { g.fillStyle(0x16a34a); g.fillCircle(15, 15, 15); }
        else { g.fillStyle(0x4ade80); g.fillCircle(10, 10, 10); } 
        g.generateTexture(fileObj.key, fileObj.key.includes('arena') ? 512 : 30, fileObj.key.includes('arena') ? 512 : 30);
        g.destroy();
      });
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 2000, 2000);

      const grid = this.add.tileSprite(1000, 1000, 2000, 2000, 'arena_default').setDepth(0);
      grid.setAlpha(0.6);

      head = this.physics.add.sprite(1000, 1000, 'classic_head');
      head.setDepth(1000); 
      head.setScale(HEAD_SCALE); 
      head.setCollideWorldBounds(true);
      head.setData('moveAngle', 0);

      for(let i=0; i<15; i++) {
        const texture = i === 14 ? 'classic_tail' : 'classic_body';
        const bodyPart = this.add.sprite(1000, 1000, texture);
        bodyPart.setDepth(999 - i);
        bodyPart.setScale(BODY_SCALE); 
        snakeBody.push(bodyPart);
      }

      food = this.physics.add.sprite(0, 0, 'food_normal');
      food.setDepth(5);
      spawnFood(this);

      this.cameras.main.startFollow(head, true, 0.08, 0.08); 
      this.cameras.main.setBounds(0, 0, 2000, 2000);

      scoreText = this.add.text(20, 20, 'YIELD: 0 cUSD', { 
        fontSize: '24px', fontFamily: 'sans-serif', color: '#ffffff', fontStyle: 'bold' 
      }).setScrollFactor(0).setDepth(2000);

      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);

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

      this.physics.velocityFromRotation(currentMoveAngle, speed, (head.body as Phaser.Physics.Arcade.Body).velocity);

      // Rotate Head
      head.rotation = currentMoveAngle + visualOffset;

      pathHistory.unshift({ x: head.x, y: head.y });
      if (pathHistory.length > snakeBody.length * spacing + 10) pathHistory.pop();

      for (let i = 0; i < snakeBody.length; i++) {
        const historyIndex = (i + 1) * spacing;
        const targetPos = pathHistory[historyIndex];

        if (targetPos) {
          snakeBody[i].setPosition(targetPos.x, targetPos.y);

          // TRUE SLITHER.IO PHYSICS: Body segment points directly at the segment in front of it!
          const frontSegment = i === 0 ? head : snakeBody[i - 1];
          const angleToFront = Phaser.Math.Angle.Between(snakeBody[i].x, snakeBody[i].y, frontSegment.x, frontSegment.y);
          snakeBody[i].rotation = angleToFront + visualOffset;

          // Smooth Tapering Tail Effect
          const taperStart = snakeBody.length - 8;
          if (i > taperStart) {
            const scaleDown = BODY_SCALE - ((i - taperStart) * 0.005);
            snakeBody[i].setScale(Math.max(scaleDown, 0.02)); 
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

      if (head.x <= 5 || head.x >= 1995 || head.y <= 5 || head.y >= 1995) triggerDeath(this);
    }

    function spawnFood(scene: Phaser.Scene) {
      const randomX = Phaser.Math.Between(100, 1900);
      const randomY = Phaser.Math.Between(100, 1900);
      food.setPosition(randomX, randomY);
      isEpicFood = Math.random() < 0.2;

      if (isEpicFood) {
        food.setTexture('food_epic');
        foodTimer = 5000;
        food.alpha = 1;
        food.setScale(0);
        scene.tweens.add({ targets: food, scale: 0.15, duration: 400, ease: 'Back.out' });
        sfx.playEpicSpawn();
      } else {
        const standardFoods = ['food_normal', 'food_blue', 'food_purple', 'food_red'];
        food.setTexture(Phaser.Math.RND.pick(standardFoods));
        food.alpha = 1;
        food.setScale(0.12); 
      }
    }

    function eatFood(scene: Phaser.Scene) {
      sfx.playEat();
      for(let i=0; i<3; i++) { // Grow by 3 segments to keep it tight
        const lastSegment = snakeBody[snakeBody.length - 1];
        lastSegment.setTexture('classic_body');
        const newTail = scene.add.sprite(lastSegment.x, lastSegment.y, 'classic_tail');
        newTail.setDepth(lastSegment.depth - 1);
        newTail.setScale(0.02); 
        snakeBody.push(newTail);
      }
      score += isEpicFood ? 20 : 5;
      scoreText.setText(`YIELD: ${score} cUSD`);
      scene.tweens.add({ targets: scoreText, scale: 1.2, duration: 100, yoyo: true });
      spawnFood(scene);
    }

    function triggerDeath(scene: Phaser.Scene) {
      sfx.playDie();
      if (score > 0) onGameOverRef.current?.(score);
      scene.cameras.main.shake(400, 0.03);
      scene.time.delayedCall(400, () => {
        for (let i = 0; i < snakeBody.length; i++) snakeBody[i].destroy();
        snakeBody = [];
        pathHistory = [];
        head.setPosition(1000, 1000);
        head.setData('moveAngle', 0);
        head.setVelocity(0, 0);

        for(let i=0; i<15; i++) {
          const texture = i === 14 ? 'classic_tail' : 'classic_body';
          const bodyPart = scene.add.sprite(1000, 1000, texture);
          bodyPart.setDepth(999 - i);
          bodyPart.setScale(BODY_SCALE); 
          snakeBody.push(bodyPart);
        }
        score = 0;
        scoreText.setText('YIELD: 0 cUSD');
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
