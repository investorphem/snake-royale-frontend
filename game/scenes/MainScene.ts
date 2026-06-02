import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

export default class MainScene extends Phaser.Scene {
  private socket!: Socket;
  private otherPlayers: { [id: string]: { head: Phaser.GameObjects.Rectangle, body: Phaser.GameObjects.Arc[] } } = {};
  
  // Local Player Objects
  private head!: Phaser.GameObjects.Rectangle;
  private bodySegments: Phaser.GameObjects.Arc[] = [];
  private positionHistory: { x: number, y: number }[] = [];
  
  // Game Objects
  private food!: Phaser.GameObjects.Arc;
  private walletAddress: string = "";
  
  // 360-Degree Movement Parameters
  private speed: number = 4;
  private historySpacing: number = 6;

  constructor() {
    super('MainScene');
  }

  // WE ARE LOADING ZERO FILES TO PREVENT CRASHES
  preload() {}

  init(data: { walletAddress: string }) {
    this.walletAddress = data.walletAddress || "0xGuest";
  }

  create() {
    // 1. Procedural Grid Background
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x22c55e, 0.15);
    for (let x = 0; x <= 800; x += 40) gridGraphics.lineBetween(x, 0, x, 600);
    for (let y = 0; y <= 600; y += 40) gridGraphics.lineBetween(0, y, 800, y);

    // 2. Draw Food (Yellow Circle) instead of loading an image
    this.food = this.add.circle(-100, -100, 12, 0xeab308);

    // 3. Connect to Render Backend
    this.socket = io('https://snake-royale-backend.onrender.com');
    this.socket.emit('joinArena', this.walletAddress);

    this.socket.on('currentPlayers', (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) this.createMySnake(players[id]);
        else this.createEnemySnake(players[id]);
      });
    });

    this.socket.on('newPlayer', (playerInfo: any) => this.createEnemySnake(playerInfo));

    this.socket.on('foodLocation', (loc: { x: number, y: number }) => this.food.setPosition(loc.x, loc.y));

    this.socket.on('playerMoved', (playerInfo: any) => {
      const enemy = this.otherPlayers[playerInfo.id];
      if (enemy) {
        enemy.head.setPosition(playerInfo.x, playerInfo.y);
        enemy.head.setRotation(playerInfo.angle);

        for (let i = 0; i < playerInfo.body.length; i++) {
          if (enemy.body[i]) {
            enemy.body[i].setPosition(playerInfo.body[i].x, playerInfo.body[i].y);
          } else {
            // Draw Enemy Body (Cyan Circles)
            const newSegment = this.add.circle(playerInfo.body[i].x, playerInfo.body[i].y, 10, 0x06b6d4);
            enemy.body.push(newSegment);
          }
        }
      }
    });

    this.socket.on('playerScoreUpdate', (playerInfo: any) => {
      if (playerInfo.id === this.socket.id) {
        // Draw My New Body Segment (Green Circle)
        const newSegment = this.add.circle(-100, -100, 10, 0x22c55e);
        this.bodySegments.push(newSegment);
      }
    });

    this.socket.on('gameOver', (data: { winnerWallet: string }) => {
      this.scene.pause();
      const statusText = data.winnerWallet === this.walletAddress ? "VICTORY!" : "GAME OVER";
      this.add.text(400, 300, statusText, {
        fontSize: '64px', color: '#ffffff', fontStyle: 'bold', stroke: '#22c55e', strokeThickness: 8
      }).setOrigin(0.5);
    });

    this.socket.on('playerDisconnected', (id: string) => {
      if (this.otherPlayers[id]) {
        this.otherPlayers[id].head.destroy();
        this.otherPlayers[id].body.forEach(seg => seg.destroy());
        delete this.otherPlayers[id];
      }
    });
  }

  private createMySnake(playerInfo: any) {
    // Draw My Head (Green Rectangle so you can see it rotate)
    this.head = this.add.rectangle(playerInfo.x, playerInfo.y, 24, 24, 0x22c55e);
    this.head.setDepth(10);
    
    for (let i = 0; i < 3; i++) {
      // Draw My Body (Green Circles)
      this.bodySegments.push(this.add.circle(playerInfo.x, playerInfo.y, 10, 0x22c55e));
    }
  }

  private createEnemySnake(playerInfo: any) {
    // Draw Enemy Head (Cyan Rectangle)
    const enemyHead = this.add.rectangle(playerInfo.x, playerInfo.y, 24, 24, 0x06b6d4);
    enemyHead.setDepth(9);

    const enemyBody: Phaser.GameObjects.Arc[] = [];
    this.otherPlayers[playerInfo.id] = { head: enemyHead, body: enemyBody };
  }

  update() {
    if (!this.head) return;

    const pointer = this.input.activePointer;
    const targetAngle = Phaser.Math.Angle.Between(this.head.x, this.head.y, pointer.worldX, pointer.worldY);
    
    if (pointer.isDown || Phaser.Math.Distance.Between(this.head.x, this.head.y, pointer.worldX, pointer.worldY) > 10) {
      this.head.x += Math.cos(targetAngle) * this.speed;
      this.head.y += Math.sin(targetAngle) * this.speed;
      this.head.setRotation(targetAngle);
    }

    this.positionHistory.unshift({ x: this.head.x, y: this.head.y });
    if (this.positionHistory.length > this.bodySegments.length * this.historySpacing + 1) {
      this.positionHistory.pop();
    }

    for (let i = 0; i < this.bodySegments.length; i++) {
      const historyIndex = (i + 1) * this.historySpacing;
      if (this.positionHistory[historyIndex]) {
        this.bodySegments[i].setPosition(this.positionHistory[historyIndex].x, this.positionHistory[historyIndex].y);
      }
    }

    const bodyCoordinates = this.bodySegments.map(seg => ({ x: seg.x, y: seg.y }));
    this.socket.emit('playerMovement', { x: this.head.x, y: this.head.y, angle: targetAngle, body: bodyCoordinates });
  }
}