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

  // Keep the ref updated so Phaser always has the latest callback without restarting the game
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 450,
      parent: gameRef.current,
      backgroundColor: '#0B0F17',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };

    let snake: Phaser.GameObjects.Rectangle[] = [];
    let food: Phaser.GameObjects.Rectangle;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let direction = 'RIGHT';
    let nextDirection = 'RIGHT';
    let score = 0;
    let scoreText: Phaser.GameObjects.Text;
    
    const gridSize = 15;
    let moveTimer = 0;
    const moveInterval = 100; 

    function preload(this: Phaser.Scene) {}

    function create(this: Phaser.Scene) {
      this.add.grid(400, 225, 800, 450, gridSize, gridSize, 0x0B0F17, 1, 0xffffff, 0.05);
      
      const head = this.add.rectangle(400, 225, gridSize, gridSize, 0x84cc16);
      this.physics.add.existing(head);
      snake.push(head);

      food = this.add.rectangle(200, 200, gridSize, gridSize, 0xef4444);
      this.physics.add.existing(food);
      repositionFood();

      if (this.input.keyboard) cursors = this.input.keyboard.createCursorKeys();

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const x = pointer.x - 400;
        const y = pointer.y - 225;
        if (Math.abs(x) > Math.abs(y)) {
          nextDirection = x > 0 && direction !== 'LEFT' ? 'RIGHT' : 'LEFT';
        } else {
          nextDirection = y > 0 && direction !== 'UP' ? 'DOWN' : 'UP';
        }
      });

      scoreText = this.add.text(16, 16, 'YIELD: 0', { fontSize: '18px', color: '#84cc16', fontStyle: 'bold' });
      scoreText.setDepth(10);
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (cursors.left.isDown && direction !== 'RIGHT') nextDirection = 'LEFT';
      else if (cursors.right.isDown && direction !== 'LEFT') nextDirection = 'RIGHT';
      else if (cursors.up.isDown && direction !== 'DOWN') nextDirection = 'UP';
      else if (cursors.down.isDown && direction !== 'UP') nextDirection = 'DOWN';

      moveTimer += delta;

      if (moveTimer >= moveInterval) {
        moveTimer = 0;
        direction = nextDirection;

        const head = snake[0];
        let nextX = head.x;
        let nextY = head.y;

        if (direction === 'LEFT') nextX -= gridSize;
        else if (direction === 'RIGHT') nextX += gridSize;
        else if (direction === 'UP') nextY -= gridSize;
        else if (direction === 'DOWN') nextY += gridSize;

        // Collision Check
        let isDead = false;
        if (nextX < 0 || nextX > 800 || nextY < 0 || nextY > 450) isDead = true;
        for (let i = 1; i < snake.length; i++) {
          if (nextX === snake[i].x && nextY === snake[i].y) isDead = true;
        }

        if (isDead) {
          resetGame(this);
          return;
        }

        for (let i = snake.length - 1; i > 0; i--) {
          snake[i].setPosition(snake[i - 1].x, snake[i - 1].y);
        }
        head.setPosition(nextX, nextY);

        if (Phaser.Geom.Intersects.RectangleToRectangle(head.getBounds(), food.getBounds())) {
          eatFood(this);
        }
      }
    }

    function eatFood(scene: Phaser.Scene) {
      const tail = snake[snake.length - 1];
      const newSegment = scene.add.rectangle(tail.x, tail.y, gridSize, gridSize, 0x22c55e);
      snake.push(newSegment);
      score += 5;
      scoreText.setText(`YIELD: ${score}`);
      repositionFood();
    }

    function repositionFood() {
      const x = Phaser.Math.Between(1, (800 / gridSize) - 1) * gridSize;
      const y = Phaser.Math.Between(1, (450 / gridSize) - 1) * gridSize;
      food.setPosition(x, y);
    }

    function resetGame(scene: Phaser.Scene) {
      // FIRE THE TELEMETRY EVENT TO REACT BEFORE RESETTING
      if (score > 0) {
        onGameOverRef.current?.(score);
      }

      for (let i = 1; i < snake.length; i++) snake[i].destroy();
      snake = [snake[0]];
      snake[0].setPosition(400, 225);
      direction = 'RIGHT';
      nextDirection = 'RIGHT';
      score = 0;
      scoreText.setText('YIELD: 0');
      repositionFood();
    }

    phaserInstance.current = new Phaser.Game(config);

    return () => {
      phaserInstance.current?.destroy(true);
      phaserInstance.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div ref={gameRef} className="rounded-xl overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)]" />
    </div>
  );
}