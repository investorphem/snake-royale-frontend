'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';

interface PhaserGameProps {
  walletAddress?: string;
  onGameOver?: (score: number) => void;
}

export default function PhaserGame({ walletAddress, onGameOver }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

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

    // Engine Variables
    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    let pathHistory: { x: number, y: number, rotation: number }[] = [];
    let food: Phaser.Physics.Arcade.Sprite;
    
    // Game State
    let scoreText: Phaser.GameObjects.Text;
    let score = 0;
    const speed = 200; // Snake movement speed
    const spacing = 12; // Distance between body segments
    
    // Dynamic Time-Bomb Food
    let isEpicFood = false;
    let foodTimer = 0;
    const EPIC_LIFESPAN = 5000;

    function preload(this: Phaser.Scene) {
      // 1. Load Audio
      this.load.audio('eat', '/sounds/eat.mp3');
      this.load.audio('die', '/sounds/die.mp3');
      this.load.audio('epic_spawn', '/sounds/epic_spawn.mp3');

      // 2. Load Premium Images
      this.load.image('classic_head', '/assets/classic_head.png');
      this.load.image('classic_body', '/assets/classic_body.png');
      this.load.image('food_normal', '/assets/food_normal.png');
      this.load.image('food_epic', '/assets/food_epic.png');

      // 3. Fallback Graphics (In case images are missing, prevents crashes)
      this.load.on('loaderror', (fileObj: any) => {
        console.warn('Missing asset, using fallback for:', fileObj.key);
        const g = this.add.graphics();
        if (fileObj.key.includes('head')) { g.fillStyle(0x22c55e); g.fillCircle(15, 15, 15); }
        else if (fileObj.key.includes('body')) { g.fillStyle(0x16a34a); g.fillCircle(12, 12, 12); }
        else if (fileObj.key.includes('epic')) { g.fillStyle(0xeab308); g.fillCircle(15, 15, 15); }
        else { g.fillStyle(0x3b82f6); g.fillCircle(10, 10, 10); }
        g.generateTexture(fileObj.key, 30, 30);
        g.destroy();
      });
    }

    function create(this: Phaser.Scene) {
      // Create a massive arena (2000x2000)
      this.physics.world.setBounds(0, 0, 2000, 2000);
      
      // Draw background grid pattern for depth perception
      this.add.grid(1000, 1000, 2000, 2000, 50, 50, 0x0B0F17, 1, 0xffffff, 0.05);

      // Initialize Head
      head = this.physics.add.sprite(1000, 1000, 'classic_head');
      head.setDepth(10);
      head.setCollideWorldBounds(true);
      
      // Seed initial body segments
      for(let i=0; i<3; i++) {
        const bodyPart = this.add.sprite(1000, 1000, 'classic_body');
        bodyPart.setDepth(9 - i);
        snakeBody.push(bodyPart);
      }

      // Initialize Food
      food = this.physics.add.sprite(0, 0, 'food_normal');
      food.setDepth(5);
      spawnFood(this);

      // Setup Camera to follow the snake
      this.cameras.main.startFollow(head, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, 2000, 2000);

      // UI (Fixed to Camera)
      scoreText = this.add.text(20, 20, 'LENGTH: 1,248', { 
        fontSize: '24px', 
        fontFamily: 'sans-serif',
        color: '#ffffff', 
        fontStyle: 'bold' 
      }).setScrollFactor(0);
      scoreText.setDepth(100);

      // Collision Detection
      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      // 1. 360-Degree Mouse/Touch Tracking
      const pointer = this.input.activePointer;
      
      // Calculate angle from snake head to the pointer in the world
      const targetAngle = Phaser.Math.Angle.Between(
        head.x, head.y, 
        pointer.worldX, pointer.worldY
      );

      // Smoothly rotate the head toward the pointer
      head.rotation = Phaser.Math.Angle.RotateTo(head.rotation, targetAngle, 0.1 * (delta / 16));
      
      // Move forward continuously based on rotation
      this.physics.velocityFromRotation(head.rotation, speed, head.body.velocity);

      // 2. Trailing Body Mechanics (History Buffer)
      pathHistory.unshift({ x: head.x, y: head.y, rotation: head.rotation });
      
      // Keep array memory clean
      if (pathHistory.length > snakeBody.length * spacing) {
        pathHistory.pop();
      }

      // Update body positions strictly based on the delayed path history
      for (let i = 0; i < snakeBody.length; i++) {
        const historyIndex = (i + 1) * spacing;
        const targetPos = pathHistory[historyIndex];
        
        if (targetPos) {
          snakeBody[i].setPosition(targetPos.x, targetPos.y);
          // Optional: snakeBody[i].rotation = targetPos.rotation;
        }
      }

      // 3. Dynamic Food Timer
      if (isEpicFood) {
        foodTimer -= delta;
        // Blink rapidly when time is running out
        if (foodTimer < 1500) {
          food.alpha = Math.floor(time / 100) % 2 === 0 ? 0.3 : 1;
        }
        
        if (foodTimer <= 0) {
          spawnFood(this); // Vanish
        }
      }

      // 4. World Bounds Death Check
      if (head.x <= 5 || head.x >= 1995 || head.y <= 5 || head.y >= 1995) {
        triggerDeath(this);
      }
    }

    function spawnFood(scene: Phaser.Scene) {
      const randomX = Phaser.Math.Between(100, 1900);
      const randomY = Phaser.Math.Between(100, 1900);
      food.setPosition(randomX, randomY);
      
      // 20% Chance for Epic Food (Timer)
      isEpicFood = Math.random() < 0.2;
      
      if (isEpicFood) {
        food.setTexture('food_epic');
        foodTimer = EPIC_LIFESPAN;
        food.alpha = 1;
        food.setScale(0);
        scene.tweens.add({ targets: food, scale: 1.5, duration: 400, ease: 'Back.out' });
        
        // Play spawn sound if loaded
        if (scene.cache.audio.exists('epic_spawn')) scene.sound.play('epic_spawn', { volume: 0.5 });
      } else {
        food.setTexture('food_normal');
        food.alpha = 1;
        food.setScale(1);
      }
    }

    function eatFood(scene: Phaser.Scene) {
      // Play Audio
      if (scene.cache.audio.exists('eat')) scene.sound.play('eat', { volume: 0.6 });

      // Grow Snake
      const tail = snakeBody[snakeBody.length - 1];
      const newSegment = scene.add.sprite(tail.x, tail.y, 'classic_body');
      newSegment.setDepth(tail.depth - 1);
      snakeBody.push(newSegment);

      // Increase Score
      const yieldGain = isEpicFood ? 20 : 5;
      score += yieldGain;
      scoreText.setText(`YIELD: ${score} cUSD`);

      // UI Pop
      scene.tweens.add({ targets: scoreText, scale: 1.2, duration: 100, yoyo: true });

      spawnFood(scene);
    }

    function triggerDeath(scene: Phaser.Scene) {
      if (scene.cache.audio.exists('die')) scene.sound.play('die');
      
      if (score > 0) {
        onGameOverRef.current?.(score);
      }

      scene.cameras.main.shake(400, 0.03);
      
      scene.time.delayedCall(400, () => {
        // Reset Logic
        for (let i = 0; i < snakeBody.length; i++) snakeBody[i].destroy();
        snakeBody = [];
        pathHistory = [];
        
        head.setPosition(1000, 1000);
        head.setRotation(0);
        head.setVelocity(0, 0);

        for(let i=0; i<3; i++) {
          const bodyPart = scene.add.sprite(1000, 1000, 'classic_body');
          bodyPart.setDepth(9 - i);
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
    <div className="w-full h-full flex items-center justify-center bg-[#06090E]">
      <div ref={gameRef} className="rounded-xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)] w-full max-w-[800px]" />
    </div>
  );
}