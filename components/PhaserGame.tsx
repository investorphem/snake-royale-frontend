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
      width: 800,
      height: 460, 
      parent: gameRef.current,
      backgroundColor: '#06090E',
      scene: { preload, create, update }
    };

    // Engine State
    const gridSize = 20;
    let snake: Phaser.GameObjects.Sprite[] = [];
    let food: Phaser.GameObjects.Sprite;
    let foodGlow: Phaser.GameObjects.Sprite;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // UPDATED FOR PHASER 3.60+
    let particles: Phaser.GameObjects.Particles.ParticleEmitter;
    
    // Logic State
    let direction = 'RIGHT';
    let nextDirection = 'RIGHT';
    let score = 0;
    let scoreText: Phaser.GameObjects.Text;
    let moveTimer = 0;
    const moveInterval = 90; 
    
    // Dynamic Food State
    let isEpicFood = false;
    let foodTimer = 0;
    const EPIC_LIFESPAN = 5000; 

    function preload(this: Phaser.Scene) {
      const graphics = this.add.graphics();
      
      graphics.fillStyle(0x22c55e, 1);
      graphics.fillCircle(10, 10, 8);
      graphics.generateTexture('food_normal', 20, 20);
      graphics.clear();

      graphics.fillStyle(0xeab308, 1);
      graphics.fillCircle(10, 10, 10);
      graphics.generateTexture('food_epic', 20, 20);
      graphics.clear();

      graphics.fillStyle(0xffffff, 0.4);
      graphics.fillCircle(15, 15, 15);
      graphics.generateTexture('glow', 30, 30);
      graphics.clear();

      graphics.fillStyle(0x16a34a, 1);
      graphics.fillRoundedRect(1, 1, 18, 18, 4);
      graphics.generateTexture('snake_body', 20, 20);
      graphics.clear();

      graphics.fillStyle(0x4ade80, 1);
      graphics.fillRoundedRect(0, 0, 20, 20, 6);
      graphics.fillStyle(0x06090e, 1); 
      graphics.fillCircle(14, 6, 2.5); 
      graphics.fillCircle(14, 14, 2.5); 
      graphics.generateTexture('snake_head', 20, 20);
      graphics.destroy();
    }

    function create(this: Phaser.Scene) {
      this.add.grid(400, 230, 800, 460, gridSize, gridSize, 0x0B0F17, 1, 0xffffff, 0.03);

      // UPDATED FOR PHASER 3.60+ (Setup emitter once, tell it not to auto-emit)
      particles = this.add.particles(0, 0, 'food_normal', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        emitting: false
      });
      particles.setDepth(5);

      const head = this.add.sprite(400, 220, 'snake_head');
      snake.push(head);

      foodGlow = this.add.sprite(0, 0, 'glow');
      foodGlow.setBlendMode(Phaser.BlendModes.ADD);
      food = this.add.sprite(0, 0, 'food_normal');
      
      this.tweens.add({
        targets: foodGlow,
        scale: 1.5,
        alpha: 0.1,
        duration: 800,
        yoyo: true,
        repeat: -1
      });

      spawnFood(this);

      if (this.input.keyboard) cursors = this.input.keyboard.createCursorKeys();

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const x = pointer.x - snake[0].x;
        const y = pointer.y - snake[0].y;
        if (Math.abs(x) > Math.abs(y)) {
          if (x > 0 && direction !== 'LEFT') nextDirection = 'RIGHT';
          else if (x < 0 && direction !== 'RIGHT') nextDirection = 'LEFT';
        } else {
          if (y > 0 && direction !== 'UP') nextDirection = 'DOWN';
          else if (y < 0 && direction !== 'DOWN') nextDirection = 'UP';
        }
      });

      scoreText = this.add.text(16, 16, 'YIELD: 0 cUSD', { 
        fontSize: '20px', 
        fontFamily: 'monospace',
        color: '#4ade80', 
        fontStyle: 'bold' 
      }).setShadow(0, 0, '#22c55e', 10, false, true);
      scoreText.setDepth(10);
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (cursors.left.isDown && direction !== 'RIGHT') nextDirection = 'LEFT';
      else if (cursors.right.isDown && direction !== 'LEFT') nextDirection = 'RIGHT';
      else if (cursors.up.isDown && direction !== 'DOWN') nextDirection = 'UP';
      else if (cursors.down.isDown && direction !== 'UP') nextDirection = 'DOWN';

      if (isEpicFood) {
        foodTimer -= delta;
        food.alpha = foodTimer < 1500 ? (Math.floor(time / 100) % 2 === 0 ? 0.3 : 1) : 1;
        
        if (foodTimer <= 0) {
          spawnFood(this); 
        }
      }

      moveTimer += delta;

      if (moveTimer >= moveInterval) {
        moveTimer = 0;
        direction = nextDirection;

        const head = snake[0];
        let nextX = head.x;
        let nextY = head.y;

        if (direction === 'LEFT') { nextX -= gridSize; head.setAngle(180); }
        else if (direction === 'RIGHT') { nextX += gridSize; head.setAngle(0); }
        else if (direction === 'UP') { nextY -= gridSize; head.setAngle(-90); }
        else if (direction === 'DOWN') { nextY += gridSize; head.setAngle(90); }

        if (nextX < 0 || nextX >= 800 || nextY < 0 || nextY >= 460) {
          triggerDeath(this);
          return;
        }

        for (let i = 1; i < snake.length; i++) {
          if (nextX === snake[i].x && nextY === snake[i].y) {
            triggerDeath(this);
            return;
          }
        }

        for (let i = snake.length - 1; i > 0; i--) {
          snake[i].setPosition(snake[i - 1].x, snake[i - 1].y);
        }
        
        head.setPosition(nextX, nextY);

        if (Math.abs(head.x - food.x) < 2 && Math.abs(head.y - food.y) < 2) {
          eatFood(this);
        }
      }
    }

    function spawnFood(scene: Phaser.Scene) {
      let randomX = Math.floor(Math.random() * (800 / gridSize)) * gridSize + (gridSize / 2);
      let randomY = Math.floor(Math.random() * (460 / gridSize)) * gridSize + (gridSize / 2);
      
      while (snake.some(segment => segment.x === randomX && segment.y === randomY)) {
        randomX = Math.floor(Math.random() * (800 / gridSize)) * gridSize + (gridSize / 2);
        randomY = Math.floor(Math.random() * (460 / gridSize)) * gridSize + (gridSize / 2);
      }

      food.setPosition(randomX, randomY);
      foodGlow.setPosition(randomX, randomY);
      
      isEpicFood = Math.random() < 0.2;
      
      if (isEpicFood) {
        food.setTexture('food_epic');
        foodGlow.setTint(0xeab308); 
        foodTimer = EPIC_LIFESPAN;
        food.alpha = 1;
        scene.tweens.add({ targets: food, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.out' });
      } else {
        food.setTexture('food_normal');
        foodGlow.setTint(0xffffff); 
        food.alpha = 1;
        food.setScale(1);
      }
    }

    function eatFood(scene: Phaser.Scene) {
      // UPDATED FOR PHASER 3.60+ (Trigger the pre-configured emitter)
      particles.setPosition(food.x, food.y);
      particles.explode(10);

      const tail = snake[snake.length - 1];
      const newSegment = scene.add.sprite(tail.x, tail.y, 'snake_body');
      snake.push(newSegment);

      const yieldGain = isEpicFood ? 20 : 5;
      score += yieldGain;
      scoreText.setText(`YIELD: ${score} cUSD`);
      
      scene.tweens.add({
        targets: scoreText,
        scale: { from: 1.2, to: 1 },
        duration: 200
      });

      spawnFood(scene);
    }

    function triggerDeath(scene: Phaser.Scene) {
      if (score > 0) {
        onGameOverRef.current?.(score);
      }

      scene.cameras.main.shake(300, 0.02);
      
      scene.time.delayedCall(300, () => {
        for (let i = 1; i < snake.length; i++) snake[i].destroy();
        snake = [snake[0]];
        snake[0].setPosition(400, 220);
        snake[0].setAngle(0);
        
        direction = 'RIGHT';
        nextDirection = 'RIGHT';
        score = 0;
        scoreText.setText('YIELD: 0 cUSD');
        spawnFood(scene);
      });
    }

    phaserInstance.current = new Phaser.Game(config);

    return () => {
      phaserInstance.current?.destroy(true);
      phaserInstance.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div ref={gameRef} className="rounded-xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)]" />
    </div>
  );
}