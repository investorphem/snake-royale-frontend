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
      height: 460, // Adjusted to exactly fit a 20px grid (40x23)
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
    let particles: Phaser.GameObjects.Particles.ParticleEmitterManager;
    
    // Logic State
    let direction = 'RIGHT';
    let nextDirection = 'RIGHT';
    let score = 0;
    let scoreText: Phaser.GameObjects.Text;
    let moveTimer = 0;
    const moveInterval = 90; // Speed of the snake
    
    // Dynamic Food State
    let isEpicFood = false;
    let foodTimer = 0;
    const EPIC_LIFESPAN = 5000; // 5 seconds in ms

    function preload(this: Phaser.Scene) {
      // Generate High-Fidelity Textures via Code (No external assets needed)
      const graphics = this.add.graphics();
      
      // 1. Normal Food (Green Glowing Orb)
      graphics.fillStyle(0x22c55e, 1);
      graphics.fillCircle(10, 10, 8);
      graphics.generateTexture('food_normal', 20, 20);
      graphics.clear();

      // 2. Epic Food (Gold Pulsing Orb)
      graphics.fillStyle(0xeab308, 1);
      graphics.fillCircle(10, 10, 10);
      graphics.generateTexture('food_epic', 20, 20);
      graphics.clear();

      // 3. Food Glow Effect
      graphics.fillStyle(0xffffff, 0.4);
      graphics.fillCircle(15, 15, 15);
      graphics.generateTexture('glow', 30, 30);
      graphics.clear();

      // 4. Snake Body (Rounded Cyber-Rectangle)
      graphics.fillStyle(0x16a34a, 1);
      graphics.fillRoundedRect(1, 1, 18, 18, 4);
      graphics.generateTexture('snake_body', 20, 20);
      graphics.clear();

      // 5. Snake Head (Lighter Green with "Eyes")
      graphics.fillStyle(0x4ade80, 1);
      graphics.fillRoundedRect(0, 0, 20, 20, 6);
      graphics.fillStyle(0x06090e, 1); // Dark eyes
      graphics.fillCircle(14, 6, 2.5); // Right eye
      graphics.fillCircle(14, 14, 2.5); // Left eye
      graphics.generateTexture('snake_head', 20, 20);
      graphics.destroy();
    }

    function create(this: Phaser.Scene) {
      // High-Tech Grid Background
      this.add.grid(400, 230, 800, 460, gridSize, gridSize, 0x0B0F17, 1, 0xffffff, 0.03);

      // Particle Emitter for satisfying "Eating" effect
      particles = this.add.particles('food_normal');

      // Initialize Snake
      const head = this.add.sprite(400, 220, 'snake_head');
      snake.push(head);

      // Initialize Food Objects
      foodGlow = this.add.sprite(0, 0, 'glow');
      foodGlow.setBlendMode(Phaser.BlendModes.ADD);
      food = this.add.sprite(0, 0, 'food_normal');
      
      // Idle animation for the glow
      this.tweens.add({
        targets: foodGlow,
        scale: 1.5,
        alpha: 0.1,
        duration: 800,
        yoyo: true,
        repeat: -1
      });

      spawnFood(this);

      // Controls
      if (this.input.keyboard) cursors = this.input.keyboard.createCursorKeys();

      // Mobile Touch Quadrant Controls
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

      // UI
      scoreText = this.add.text(16, 16, 'YIELD: 0 cUSD', { 
        fontSize: '20px', 
        fontFamily: 'monospace',
        color: '#4ade80', 
        fontStyle: 'bold' 
      }).setShadow(0, 0, '#22c55e', 10, false, true);
      scoreText.setDepth(10);
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      // Input Queueing
      if (cursors.left.isDown && direction !== 'RIGHT') nextDirection = 'LEFT';
      else if (cursors.right.isDown && direction !== 'LEFT') nextDirection = 'RIGHT';
      else if (cursors.up.isDown && direction !== 'DOWN') nextDirection = 'UP';
      else if (cursors.down.isDown && direction !== 'UP') nextDirection = 'DOWN';

      // Dynamic Food Timer Logic
      if (isEpicFood) {
        foodTimer -= delta;
        // Make it blink faster as it runs out of time
        food.alpha = foodTimer < 1500 ? (Math.floor(time / 100) % 2 === 0 ? 0.3 : 1) : 1;
        
        if (foodTimer <= 0) {
          spawnFood(this); // Vanish and respawn normal food
        }
      }

      moveTimer += delta;

      // Lock movement to the grid interval
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

        // 1. Wall Collision Check
        if (nextX < 0 || nextX >= 800 || nextY < 0 || nextY >= 460) {
          triggerDeath(this);
          return;
        }

        // 2. Self Collision Check
        for (let i = 1; i < snake.length; i++) {
          if (nextX === snake[i].x && nextY === snake[i].y) {
            triggerDeath(this);
            return;
          }
        }

        // 3. Move Body Segments
        for (let i = snake.length - 1; i > 0; i--) {
          snake[i].setPosition(snake[i - 1].x, snake[i - 1].y);
        }
        
        // Move Head
        head.setPosition(nextX, nextY);

        // 4. Pixel-Perfect Food Collision
        if (Math.abs(head.x - food.x) < 2 && Math.abs(head.y - food.y) < 2) {
          eatFood(this);
        }
      }
    }

    function spawnFood(scene: Phaser.Scene) {
      // Calculate random grid positions
      let randomX = Math.floor(Math.random() * (800 / gridSize)) * gridSize + (gridSize / 2);
      let randomY = Math.floor(Math.random() * (460 / gridSize)) * gridSize + (gridSize / 2);
      
      // Ensure food doesn't spawn inside the snake
      while (snake.some(segment => segment.x === randomX && segment.y === randomY)) {
        randomX = Math.floor(Math.random() * (800 / gridSize)) * gridSize + (gridSize / 2);
        randomY = Math.floor(Math.random() * (460 / gridSize)) * gridSize + (gridSize / 2);
      }

      food.setPosition(randomX, randomY);
      foodGlow.setPosition(randomX, randomY);
      
      // 20% Chance for Dynamic Epic Food
      isEpicFood = Math.random() < 0.2;
      
      if (isEpicFood) {
        food.setTexture('food_epic');
        foodGlow.setTint(0xeab308); // Gold glow
        foodTimer = EPIC_LIFESPAN;
        food.alpha = 1;
        // Add pop-in animation
        scene.tweens.add({ targets: food, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.out' });
      } else {
        food.setTexture('food_normal');
        foodGlow.setTint(0xffffff); // White/Green glow
        food.alpha = 1;
        food.setScale(1);
      }
    }

    function eatFood(scene: Phaser.Scene) {
      // 1. Particle Explosion Effect
      const emitter = particles.createEmitter({
        x: food.x, y: food.y,
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        quantity: 10
      });
      // Clean up emitter after explosion
      scene.time.delayedCall(500, () => { emitter.stop(); emitter.remove(); });

      // 2. Grow Snake
      const tail = snake[snake.length - 1];
      const newSegment = scene.add.sprite(tail.x, tail.y, 'snake_body');
      snake.push(newSegment);

      // 3. Update Yield
      const yieldGain = isEpicFood ? 20 : 5;
      score += yieldGain;
      scoreText.setText(`YIELD: ${score} cUSD`);
      
      // Make text pop
      scene.tweens.add({
        targets: scoreText,
        scale: { from: 1.2, to: 1 },
        duration: 200
      });

      // 4. Respawn Target
      spawnFood(scene);
    }

    function triggerDeath(scene: Phaser.Scene) {
      // Fire Telemetry to React backend
      if (score > 0) {
        onGameOverRef.current?.(score);
      }

      // Camera Shake Effect on Death
      scene.cameras.main.shake(300, 0.02);
      
      scene.time.delayedCall(300, () => {
        // Destroy all segments except head
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