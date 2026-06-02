import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

export default class MainScene extends Phaser.Scene {
  private socket!: Socket;
  private otherPlayers: { [id: string]: { head: Phaser.GameObjects.Image, body: Phaser.GameObjects.Image[] } } = {};
  
  private head!: Phaser.GameObjects.Image;
  private bodySegments: Phaser.GameObjects.Image[] = [];
  private positionHistory: { x: number, y: number }[] = [];
  
  // Upgraded to hold multiple food orbs simultaneously
  private foodGroup: { [id: string]: Phaser.GameObjects.Image } = {};
  private walletAddress: string = "";
  
  private speed: number = 4;
  private historySpacing: number = 6;

  constructor() { super('MainScene'); }

  preload() {
    this.load.svg('head', '/head.svg', { width: 40, height: 40 });
    this.load.svg('body', '/body.svg', { width: 30, height: 30 });
    this.load.svg('food', '/orb.svg', { width: 30, height: 30 });
  }

  init(data: { walletAddress: string }) { this.walletAddress = data.walletAddress || "0xGuest"; }

  create() {
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x22c55e, 0.15);
    for (let x = 0; x <= 800; x += 40) gridGraphics.lineBetween(x, 0, x, 600);
    for (let y = 0; y <= 600; y += 40) gridGraphics.lineBetween(0, y, 800, y);

    this.socket = io('https://snake-royale-backend.onrender.com');
    this.socket.emit('joinArena', this.walletAddress);

    this.socket.on('currentPlayers', (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) this.createMySnake(players[id]);
        else this.createEnemySnake(players[id]);
      });
    });

    this.socket.on('newPlayer', (playerInfo: any) => this.createEnemySnake(playerInfo));

    // MULTI-FOOD SYNC LOGIC
    this.socket.on('foodUpdate', (serverFoods: any) => {
      // 1. Destroy local foods that were eaten
      Object.keys(this.foodGroup).forEach(id => {
        if (!serverFoods[id]) {
          this.foodGroup[id].destroy();
          delete this.foodGroup[id];
        }
      });
      // 2. Add new foods that spawned
      Object.keys(serverFoods).forEach(id => {
        if (!this.foodGroup[id]) {
          this.foodGroup[id] = this.add.image(serverFoods[id].x, serverFoods[id].y, 'food');
        }
      });
    });

    this.socket.on('playerMoved', (playerInfo: any) => {
      const enemy = this.otherPlayers[playerInfo.id];
      if (enemy) {
        enemy.head.setPosition(playerInfo.x, playerInfo.y);
        enemy.head.setRotation(playerInfo.angle);

        for (let i = 0; i < playerInfo.body.length; i++) {
          if (enemy.body[i]) enemy.body[i].setPosition(playerInfo.body[i].x, playerInfo.body[i].y);
          else enemy.body.push(this.add.image(playerInfo.body[i].x, playerInfo.body[i].y, 'body'));
        }
      }
    });

    this.socket.on('playerScoreUpdate', (playerInfo: any) => {
      if (playerInfo.id === this.socket.id) {
        this.bodySegments.push(this.add.image(-100, -100, 'body'));
      }
    });

    // DEATH LISTENER: Explode the enemy graphically when they hit a tail
    this.socket.on('playerDied', (id: string) => {
      if (id === this.socket.id) {
        this.scene.pause();
        this.add.text(400, 300, "YOU DIED", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5);
      } else if (this.otherPlayers[id]) {
        this.otherPlayers[id].head.destroy();
        this.otherPlayers[id].body.forEach(seg => seg.destroy());
        delete this.otherPlayers[id];
      }
    });

    this.socket.on('gameOver', (data: { winnerWallet: string }) => {
      this.scene.pause();
      const statusText = data.winnerWallet === this.walletAddress ? "VICTORY!" : "GAME OVER";
      this.add.text(400, 300, statusText, { fontSize: '64px', color: '#ffffff', fontStyle: 'bold', stroke: '#22c55e', strokeThickness: 8 }).setOrigin(0.5);
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
    this.head = this.add.image(playerInfo.x, playerInfo.y, 'head').setDepth(10);
    for (let i = 0; i < 3; i++) this.bodySegments.push(this.add.image(playerInfo.x, playerInfo.y, 'body'));
  }

  private createEnemySnake(playerInfo: any) {
    const enemyHead = this.add.image(playerInfo.x, playerInfo.y, 'head').setTint(playerInfo.color).setDepth(9);
    this.otherPlayers[playerInfo.id] = { head: enemyHead, body: [] };
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
    if (this.positionHistory.length > this.bodySegments.length * this.historySpacing + 1) this.positionHistory.pop();

    for (let i = 0; i < this.bodySegments.length; i++) {
      const historyIndex = (i + 1) * this.historySpacing;
      if (this.positionHistory[historyIndex]) this.bodySegments[i].setPosition(this.positionHistory[historyIndex].x, this.positionHistory[historyIndex].y);
    }

    const bodyCoordinates = this.bodySegments.map(seg => ({ x: seg.x, y: seg.y }));
    this.socket.emit('playerMovement', { x: this.head.x, y: this.head.y, angle: targetAngle, body: bodyCoordinates });
  }
}