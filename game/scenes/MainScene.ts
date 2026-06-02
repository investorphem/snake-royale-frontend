import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

export default class MainScene extends Phaser.Scene {
  private socket!: Socket;
  private otherPlayers: { [id: string]: { head: Phaser.GameObjects.Image, body: Phaser.GameObjects.Image[] } } = {};
  
  // Local Player Objects
  private head!: Phaser.GameObjects.Image;
  private bodySegments: Phaser.GameObjects.Image[] = [];
  private positionHistory: { x: number, y: number }[] = [];
  
  // Game Objects
  private food!: Phaser.GameObjects.Image;
  private walletAddress: string = "";
  
  // 360-Degree Movement Parameters
  private speed: number = 4;          // Move velocity per tick
  private historySpacing: number = 6; // Controls how tightly the tail segments follow each other

  constructor() {
    super('MainScene');
  }

  preload() {
    // 1. Load Custom SVG Vectors from the public directory
    this.load.svg('head', '/head.svg', { width: 40, height: 40 });
    this.load.svg('body', '/body.svg', { width: 30, height: 30 });
    this.load.svg('food', '/orb.svg', { width: 30, height: 30 });
    
    // Notice: We are no longer loading hex-bg.jpg here!
  }

  init(data: { walletAddress: string }) {
    this.walletAddress = data.walletAddress || "0xGuest";
  }

  create() {
    // 1. Generate a procedural grid background automatically
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x22c55e, 0.15); // Thin, subtle neon green lines

    const gridSize = 40;
    const mapWidth = 800;
    const mapHeight = 600;

    // Draw vertical grid lines
    for (let x = 0; x <= mapWidth; x += gridSize) {
      gridGraphics.lineBetween(x, 0, x, mapHeight);
    }
    // Draw horizontal grid lines
    for (let y = 0; y <= mapHeight; y += gridSize) {
      gridGraphics.lineBetween(0, y, mapWidth, y);
    }

    // 2. Render the authoritative token food orb
    this.food = this.add.image(-100, -100, 'food');

    // 3. Establish dynamic WebSocket bridge with Render engine
    this.socket = io('https://snake-royale-backend.onrender.com');

    // Register room entry lifecycle event
    this.socket.emit('joinArena', this.walletAddress);

    // Server Handshake: Instantiate current active players
    this.socket.on('currentPlayers', (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) {
          this.createMySnake(players[id]);
        } else {
          this.createEnemySnake(players[id]);
        }
      });
    });

    // Handle new enemy entry events
    this.socket.on('newPlayer', (playerInfo: any) => {
      this.createEnemySnake(playerInfo);
    });

    // Handle authoritative food displacement synchronized by backend
    this.socket.on('foodLocation', (loc: { x: number, y: number }) => {
      this.food.setPosition(loc.x, loc.y);
    });

    // Synchronize remote player motion coordinates 
    this.socket.on('playerMoved', (playerInfo: any) => {
      const enemy = this.otherPlayers[playerInfo.id];
      if (enemy) {
        enemy.head.setPosition(playerInfo.x, playerInfo.y);
        enemy.head.setRotation(playerInfo.angle);

        // Instantly align enemy body segments to positions broadcasted by server
        for (let i = 0; i < playerInfo.body.length; i++) {
          if (enemy.body[i]) {
            enemy.body[i].setPosition(playerInfo.body[i].x, playerInfo.body[i].y);
          } else {
            // Append missing segment if enemy grew on server
            const newSegment = this.add.image(playerInfo.body[i].x, playerInfo.body[i].y, 'body');
            enemy.body.push(newSegment);
          }
        }
      }
    });

    // Handle growth events
    this.socket.on('playerScoreUpdate', (playerInfo: any) => {
      if (playerInfo.id === this.socket.id) {
        // Append physical SVG body link to segment map
        const newSegment = this.add.image(-100, -100, 'body');
        this.bodySegments.push(newSegment);
      }
    });

    // Handle game completion signal 
    this.socket.on('gameOver', (data: { winnerWallet: string }) => {
      this.scene.pause(); // Cleanly freeze the engine loop without crashing
      const statusText = data.winnerWallet === this.walletAddress ? "VICTORY!" : "GAME OVER";
      
      this.add.text(400, 300, statusText, {
        fontSize: '64px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#22c55e',
        strokeThickness: 8
      }).setOrigin(0.5);
    });

    // Handle player dropouts
    this.socket.on('playerDisconnected', (id: string) => {
      if (this.otherPlayers[id]) {
        this.otherPlayers[id].head.destroy();
        this.otherPlayers[id].body.forEach(seg => seg.destroy());
        delete this.otherPlayers[id];
      }
    });
  }

  // Create your own controllable snake
  private createMySnake(playerInfo: any) {
    this.head = this.add.image(playerInfo.x, playerInfo.y, 'head');
    this.head.setDepth(10); // Keeps head layer layered structurally over body segments
    
    // Spawn initial tail lengths
    for (let i = 0; i < 3; i++) {
      this.bodySegments.push(this.add.image(playerInfo.x, playerInfo.y, 'body'));
    }
  }

  // Create standard remote enemy representation
  private createEnemySnake(playerInfo: any) {
    const enemyHead = this.add.image(playerInfo.x, playerInfo.y, 'head');
    enemyHead.setTint(playerInfo.color); // Give enemies a distinct skin variation
    enemyHead.setDepth(9);

    const enemyBody: Phaser.GameObjects.Image[] = [];
    
    this.otherPlayers[playerInfo.id] = {
      head: enemyHead,
      body: enemyBody
    };
  }

  update() {
    // Block loop operations if local entity hasn't handshake initialized
    if (!this.head) return;

    // 1. Trace vector mapping angle pointing toward cursor/touch target
    const pointer = this.input.activePointer;
    const targetAngle = Phaser.Math.Angle.Between(this.head.x, this.head.y, pointer.worldX, pointer.worldY);
    
    // 2. Perform smooth 360-degree vector shift 
    if (pointer.isDown || Phaser.Math.Distance.Between(this.head.x, this.head.y, pointer.worldX, pointer.worldY) > 10) {
      this.head.x += Math.cos(targetAngle) * this.speed;
      this.head.y += Math.sin(targetAngle) * this.speed;
      this.head.setRotation(targetAngle); // Rotate vector SVG head artwork smoothly to face path
    }

    // 3. Document coordinate map trajectory footprint history
    this.positionHistory.unshift({ x: this.head.x, y: this.head.y });
    if (this.positionHistory.length > this.bodySegments.length * this.historySpacing + 1) {
      this.positionHistory.pop();
    }

    // 4. Smoothly interpolate tail nodes down the vector history path
    for (let i = 0; i < this.bodySegments.length; i++) {
      const historyIndex = (i + 1) * this.historySpacing;
      if (this.positionHistory[historyIndex]) {
        this.bodySegments[i].setPosition(this.positionHistory[historyIndex].x, this.positionHistory[historyIndex].y);
      }
    }

    // 5. Broadcast spatial state telemetry arrays upstream to backend
    const bodyCoordinates = this.bodySegments.map(seg => ({ x: seg.x, y: seg.y }));
    this.socket.emit('playerMovement', { 
      x: this.head.x, 
      y: this.head.y, 
      angle: targetAngle, 
      body: bodyCoordinates 
    });
  }
}