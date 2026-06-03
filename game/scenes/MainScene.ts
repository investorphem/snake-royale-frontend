import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

export default class MainScene extends Phaser.Scene {
  private socket!: Socket;
  private otherPlayers: { 
    [id: string]: { 
      head: Phaser.GameObjects.Sprite, 
      body: Phaser.GameObjects.Sprite[], 
      isShielded: boolean 
    } 
  } = {};

  private head!: Phaser.Physics.Arcade.Sprite;
  private bodySegments: Phaser.GameObjects.Sprite[] = [];
  private positionHistory: { x: number, y: number, moveAngle: number }[] = [];

  private foodGroup: { [id: string]: Phaser.GameObjects.Sprite } = {};
  private walletAddress: string = "";
  private arenaTheme: string = "arena_default";

  // =====================================
  // CORE PREMIUM PHYSICS SETTINGS
  // =====================================
  private baseSpeed: number = 250;
  private speedMultiplier: number = 1.0;
  private historySpacing: number = 5; // Tighter spacing for seamless tube
  private HEAD_SCALE: number = 0.08; 
  private BODY_SCALE: number = 0.07; 
  private visualOffset: number = Math.PI / 2; // +90 Degrees to fix AI images facing UP

  private _powerUpListener?: (e: Event) => void;

  constructor() { super('MainScene'); }

  preload() {
    // 1. UPGRADED TO PREMIUM 3D PNG ASSETS
    this.load.image('classic_head', '/assets/classic_head.png');
    this.load.image('classic_body', '/assets/classic_body.png');
    this.load.image('classic_tail', '/assets/classic_tail.png'); // Added the Tail!

    this.load.image('food_normal', '/assets/food_normal.png');
    this.load.image('food_epic', '/assets/food_epic.png');

    // Make sure your arena files are .png in the public folder!
    this.load.image('arena_default', '/assets/arena_default.png');
    this.load.image('arena_cyber', '/assets/arena_cyber.png');
    this.load.image('arena_magma', '/assets/arena_magma.png');
    this.load.image('arena_toxic', '/assets/arena_toxic.png');
    this.load.image('arena_void', '/assets/arena_void.png');

    this.load.on('loaderror', (fileObj: any) => {
      const g = this.add.graphics();
      if (fileObj.key.includes('head')) { g.fillStyle(0x22c55e); g.fillCircle(15, 15, 15); }
      else if (fileObj.key.includes('body')) { g.fillStyle(0x16a34a); g.fillCircle(12, 12, 12); }
      else if (fileObj.key.includes('tail')) { g.fillStyle(0x16a34a); g.fillTriangle(0, 0, 30, 15, 0, 30); }
      else { g.fillStyle(0x4ade80); g.fillCircle(10, 10, 10); } 
      g.generateTexture(fileObj.key, 30, 30); g.destroy();
    });
  }

  init(data: { walletAddress: string; arenaTheme?: string }) { 
    this.walletAddress = data.walletAddress || "0xGuest";
    this.arenaTheme = data.arenaTheme || "arena_default";
  }

  create() {
    this.physics.world.setBounds(0, 0, 2000, 2000);

    const grid = this.add.tileSprite(1000, 1000, 2000, 2000, this.arenaTheme);
    grid.setAlpha(0.6); // Dimmed for a premium feel

    this.socket = io('https://snake-royale-backend.onrender.com');
    this.socket.emit('joinArena', { walletAddress: this.walletAddress, arenaTheme: this.arenaTheme });

    this.socket.on('currentPlayers', (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) this.createMySnake(players[id]);
        else this.createEnemySnake(players[id]);
      });
    });

    this.socket.on('newPlayer', (playerInfo: any) => this.createEnemySnake(playerInfo));

    this.socket.on('foodUpdate', (serverFoods: any) => {
      Object.keys(this.foodGroup).forEach(id => {
        if (!serverFoods[id]) {
          this.foodGroup[id].destroy();
          delete this.foodGroup[id];
        }
      });

      Object.keys(serverFoods).forEach(id => {
        const foodData = serverFoods[id];
        if (!this.foodGroup[id]) {
          const textureKey = foodData.type === 'epic' ? 'food_epic' : 'food_normal';
          const foodSprite = this.add.sprite(foodData.x, foodData.y, textureKey);
          
          foodSprite.setScale(foodData.type === 'epic' ? 0.15 : 0.12);

          if (foodData.type === 'toxic') {
            foodSprite.setTint(0x4ade80); 
          }
          this.foodGroup[id] = foodSprite;
        } else {
          this.foodGroup[id].setPosition(foodData.x, foodData.y);
        }
      });
    });

    this.socket.on('playerMoved', (playerInfo: any) => {
      const enemy = this.otherPlayers[playerInfo.id];
      if (enemy) {
        enemy.head.setPosition(playerInfo.x, playerInfo.y);
        
        // APPLY VISUAL OFFSET TO ENEMIES TOO
        enemy.head.setRotation(playerInfo.angle + this.visualOffset);

        for (let i = 0; i < playerInfo.body.length; i++) {
          if (enemy.body[i]) {
            enemy.body[i].setPosition(playerInfo.body[i].x, playerInfo.body[i].y);
            
            // Enemy fluid body rotation
            const frontSegment = i === 0 ? enemy.head : enemy.body[i - 1];
            const angleToFront = Phaser.Math.Angle.Between(enemy.body[i].x, enemy.body[i].y, frontSegment.x, frontSegment.y);
            enemy.body[i].rotation = angleToFront + this.visualOffset;

            // Enemy Tapering Tail Effect
            const isTail = i === playerInfo.body.length - 1;
            enemy.body[i].setTexture(isTail ? 'classic_tail' : 'classic_body');
            
            const taperStart = playerInfo.body.length - 8;
            if (i > taperStart) {
               const scaleDown = this.BODY_SCALE - ((i - taperStart) * 0.005);
               enemy.body[i].setScale(Math.max(scaleDown, 0.02)); 
            }

          } else {
            const newSeg = this.add.sprite(playerInfo.body[i].x, playerInfo.body[i].y, 'classic_body');
            newSeg.setScale(this.BODY_SCALE);
            enemy.body.push(newSeg);
          }
        }
      }
    });

    this.socket.on('playerScoreUpdate', (data: { id: string; scoreValue: number }) => {
      if (data.id === this.socket.id) {
        // Grow by 3 tightly packed segments per food
        for(let i=0; i<3; i++) {
          const newSeg = this.add.sprite(-100, -100, 'classic_body');
          newSeg.setScale(this.BODY_SCALE);
          this.bodySegments.push(newSeg);
        }
      }
    });

    // ... (Keep existing socket hazard/powerup/disconnect listeners)
    this.socket.on('playerDied', (id: string) => {
      if (id === this.socket.id) {
        this.socket.disconnect();
      } else if (this.otherPlayers[id]) {
        this.otherPlayers[id].head.destroy();
        this.otherPlayers[id].body.forEach(seg => seg.destroy());
        delete this.otherPlayers[id];
      }
    });

    this.socket.on('playerDisconnected', (id: string) => {
      if (this.otherPlayers[id]) {
        this.otherPlayers[id].head.destroy();
        this.otherPlayers[id].body.forEach(seg => seg.destroy());
        delete this.otherPlayers[id];
      }
    });

    this._powerUpListener = (e: Event) => {
      const type = (e as CustomEvent).detail;
      this.socket.emit('usePowerUp', type);
    };
    window.addEventListener('ACTIVATE_POWERUP_MODIFIER', this._powerUpListener);
  }

  private createMySnake(playerInfo: any) {
    this.head = this.physics.add.sprite(playerInfo.x, playerInfo.y, 'classic_head');
    this.head.setDepth(100);
    this.head.setScale(this.HEAD_SCALE);
    this.head.setData('moveAngle', 0);

    this.cameras.main.startFollow(this.head, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    for (let i = 0; i < 15; i++) {
      const seg = this.add.sprite(playerInfo.x, playerInfo.y, 'classic_body');
      seg.setScale(this.BODY_SCALE);
      seg.setDepth(99 - i);
      this.bodySegments.push(seg);
    }
  }

  private createEnemySnake(playerInfo: any) {
    if (this.otherPlayers[playerInfo.id]) return;
    const enemyHead = this.add.sprite(playerInfo.x, playerInfo.y, 'classic_head').setTint(playerInfo.color).setDepth(90);
    enemyHead.setScale(this.HEAD_SCALE);
    this.otherPlayers[playerInfo.id] = { head: enemyHead, body: [], isShielded: false };
  }

  update(time: number, delta: number) {
    if (!this.head || !this.head.body) return;

    const pointer = this.input.activePointer;
    let targetAngle = Phaser.Math.Angle.Between(this.head.x, this.head.y, pointer.worldX, pointer.worldY);

    if (this.arenaTheme === 'arena_void') {
      const distToCenter = Phaser.Math.Distance.Between(this.head.x, this.head.y, 1000, 1000);
      if (distToCenter < 700) {
        const angleToCenter = Phaser.Math.Angle.Between(this.head.x, this.head.y, 1000, 1000);
        targetAngle = Phaser.Math.Angle.RotateTo(targetAngle, angleToCenter, 0.05);
      }
    }

    let currentMoveAngle = this.head.getData('moveAngle') || 0;

    // Only steer if user is touching/clicking
    if (this.input.activePointer.isDown) {
      currentMoveAngle = Phaser.Math.Angle.RotateTo(currentMoveAngle, targetAngle, 0.15 * (delta / 16));
    }
    this.head.setData('moveAngle', currentMoveAngle);

    const headBody = this.head.body as Phaser.Physics.Arcade.Body;
    this.physics.velocityFromRotation(currentMoveAngle, this.baseSpeed * this.speedMultiplier, headBody.velocity);

    // APPLY VISUAL OFFSET TO HEAD
    this.head.rotation = currentMoveAngle + this.visualOffset;

    if (this.arenaTheme === 'arena_temple') headBody.velocity.x += 50; 

    // Trailing body segment interpolation
    this.positionHistory.unshift({ x: this.head.x, y: this.head.y, moveAngle: currentMoveAngle });
    if (this.positionHistory.length > this.bodySegments.length * this.historySpacing + 10) this.positionHistory.pop();

    for (let i = 0; i < this.bodySegments.length; i++) {
      const historyIndex = (i + 1) * this.historySpacing;
      
      if (this.positionHistory[historyIndex]) {
        this.bodySegments[i].setPosition(this.positionHistory[historyIndex].x, this.positionHistory[historyIndex].y);
        
        // TRUE SLITHER.IO PHYSICS
        const frontSegment = i === 0 ? this.head : this.bodySegments[i - 1];
        const angleToFront = Phaser.Math.Angle.Between(this.bodySegments[i].x, this.bodySegments[i].y, frontSegment.x, frontSegment.y);
        this.bodySegments[i].rotation = angleToFront + this.visualOffset;

        // TAIL TAPERING & TEXTURE
        const isTail = i === this.bodySegments.length - 1;
        this.bodySegments[i].setTexture(isTail ? 'classic_tail' : 'classic_body');

        const taperStart = this.bodySegments.length - 8;
        if (i > taperStart) {
          const scaleDown = this.BODY_SCALE - ((i - taperStart) * 0.005);
          this.bodySegments[i].setScale(Math.max(scaleDown, 0.02)); 
        } else {
          this.bodySegments[i].setScale(this.BODY_SCALE); 
        }
      }
    }

    const bodyCoordinates = this.bodySegments.map(seg => ({ x: seg.x, y: seg.y }));
    this.socket.emit('playerMovement', { x: this.head.x, y: this.head.y, angle: currentMoveAngle, body: bodyCoordinates });
  }

  destroy() {
    if (this._powerUpListener) window.removeEventListener('ACTIVATE_POWERUP_MODIFIER', this._powerUpListener);
    if (this.socket) this.socket.disconnect();
  }
}
