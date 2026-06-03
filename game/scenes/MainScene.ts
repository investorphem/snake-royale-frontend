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
  private positionHistory: { x: number, y: number, rotation: number }[] = [];
  
  // Categorized structural asset mapping groups
  private foodGroup: { [id: string]: Phaser.GameObjects.Sprite } = {};
  private walletAddress: string = "";
  private arenaTheme: string = "classic";
  
  private baseSpeed: number = 200;
  private speedMultiplier: number = 1.0;
  private historySpacing: number = 12;

  // Window Event Signal Hooks Cache
  private _powerUpListener?: (e: Event) => void;

  constructor() { super('MainScene'); }

  preload() {
    // Preloads uniform head and trailing body asset rows
    this.load.image('classic_head', '/assets/classic_head.svg');
    this.load.image('classic_body', '/assets/classic_body.svg');
    
    // Categorized food drop variants mapping parameters
    this.load.image('food_normal', '/assets/food_normal.svg');
    this.load.image('food_epic', '/assets/food_epic.svg');
    
    // Premium map tile modifications cache
    this.load.image('arena_cyber', '/assets/arena_cyber.svg');
    this.load.image('arena_magma', '/assets/arena_magma.svg');
    this.load.image('arena_toxic', '/assets/arena_toxic.svg');
    this.load.image('arena_void', '/assets/arena_void.svg');
    this.load.image('arena_temple', '/assets/arena_temple.svg');

    // Dynamic asset loading error recovery fallbacks
    this.load.on('loaderror', (fileObj: any) => {
      const g = this.add.graphics();
      if (fileObj.key.includes('head')) { g.fillStyle(0x22c55e); g.fillCircle(15, 15, 15); }
      else if (fileObj.key.includes('body')) { g.fillStyle(0x16a34a); g.fillCircle(12, 12, 12); }
      else { g.fillStyle(0x4ade80); g.fillCircle(10, 10, 10); } 
      g.generateTexture(fileObj.key, 30, 30); g.destroy();
    });
  }

  init(data: { walletAddress: string; arenaTheme?: string }) { 
    this.walletAddress = data.walletAddress || "0xGuest";
    this.arenaTheme = data.arenaTheme || "classic";
  }

  create() {
    // 1. EXTEND SPATIAL GRID BOUNDS TO MATCH UNIFIED 2000X2000 METRICS
    this.physics.world.setBounds(0, 0, 2000, 2000);
    
    if (this.arenaTheme !== 'classic') {
      this.add.tileSprite(1000, 1000, 2000, 2000, this.arenaTheme);
    } else {
      this.add.grid(1000, 1000, 2000, 2000, 50, 50, 0x0B0F17, 1, 0xffffff, 0.05);
    }

    // 2. SOCKET INTERFACE PACKAGING ROUTINES
    this.socket = io('https://snake-royale-backend.onrender.com');
    this.socket.emit('joinArena', { walletAddress: this.walletAddress, arenaTheme: this.arenaTheme });

    this.socket.on('currentPlayers', (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) this.createMySnake(players[id]);
        else this.createEnemySnake(players[id]);
      });
    });

    this.socket.on('newPlayer', (playerInfo: any) => this.createEnemySnake(playerInfo));

    // MULTI-FOOD TYPE SYNCHRONIZATION LEDGER HANDLERS
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
          
          if (foodData.type === 'toxic') {
            foodSprite.setTint(0x4ade80); // Sludge mutation coloring marker
            foodSprite.setScale(0.8);
          }
          this.foodGroup[id] = foodSprite;
        } else {
          // Adjust positions continuously for vacuum draw simulations
          this.foodGroup[id].setPosition(foodData.x, foodData.y);
        }
      });
    });

    this.socket.on('playerMoved', (playerInfo: any) => {
      const enemy = this.otherPlayers[playerInfo.id];
      if (enemy) {
        enemy.head.setPosition(playerInfo.x, playerInfo.y);
        enemy.head.setRotation(playerInfo.angle);

        for (let i = 0; i < playerInfo.body.length; i++) {
          if (enemy.body[i]) {
            enemy.body[i].setPosition(playerInfo.body[i].x, playerInfo.body[i].y);
          } else {
            enemy.body.push(this.add.sprite(playerInfo.body[i].x, playerInfo.body[i].y, 'classic_body'));
          }
        }
      }
    });

    this.socket.on('playerScoreUpdate', (data: { id: string; scoreValue: number }) => {
      if (data.id === this.socket.id) {
        this.bodySegments.push(this.add.sprite(-100, -100, 'classic_body'));
      }
    });

    // POISON HAZARD TRIGGER DEDUCTION
    this.socket.on('playerHitByPoison', (data: { id: string }) => {
      if (data.id === this.socket.id && this.bodySegments.length > 3) {
        const removedSegment = this.bodySegments.pop();
        removedSegment?.destroy();
        this.cameras.main.shake(150, 0.01);
      }
    });

    // MULTIPLAYER POWERUP VISUAL MODIFIER SYNC
    this.socket.on('playerPowerUpActivated', (data: { id: string; type: string }) => {
      if (data.id === this.socket.id) {
        if (data.type === 'speed') this.speedMultiplier = 2.0;
        if (data.type === 'shield') this.head.setTint(0x60a5fa);
      } else if (this.otherPlayers[data.id]) {
        if (data.type === 'shield') this.otherPlayers[data.id].head.setTint(0x60a5fa);
      }
    });

    this.socket.on('playerPowerUpExpired', (data: { id: string; type: string }) => {
      if (data.id === this.socket.id) {
        if (data.type === 'speed') this.speedMultiplier = 1.0;
        if (data.type === 'shield') this.head.clearTint();
      } else if (this.otherPlayers[data.id]) {
        if (data.type === 'shield') this.otherPlayers[data.id].head.clearTint();
      }
    });

    // GLOBAL LOBBY HAZARD CLOCK DISPATCH
    this.socket.on('arenaEvent', (data: { type: string; duration: number }) => {
      if (data.type === 'ERUPTION') {
        this.cameras.main.shake(data.duration, 0.02);
      }
    });

    this.socket.on('playerDied', (id: string) => {
      if (id === this.socket.id) {
        this.socket.disconnect();
        // Redirect logic handled gracefully on game-over component overlays
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

    // 3. LISTEN FOR INTERACTIVE HUD COMPONENT BUTTON CLICK TRIPS
    this._powerUpListener = (e: Event) => {
      const type = (e as CustomEvent).detail;
      this.socket.emit('usePowerUp', type);
    };
    window.addEventListener('ACTIVATE_POWERUP_MODIFIER', this._powerUpListener);
  }

  private createMySnake(playerInfo: any) {
    this.head = this.physics.add.sprite(playerInfo.x, playerInfo.y, 'classic_head');
    this.head.setDepth(10);
    
    // Bind camera tracking arrays to support wide exploration parameters
    this.cameras.main.startFollow(this.head, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    for (let i = 0; i < 3; i++) {
      this.bodySegments.push(this.add.sprite(playerInfo.x, playerInfo.y, 'classic_body'));
    }
  }

  private createEnemySnake(playerInfo: any) {
    if (this.otherPlayers[playerInfo.id]) return;
    const enemyHead = this.add.sprite(playerInfo.x, playerInfo.y, 'classic_head').setTint(playerInfo.color).setDepth(9);
    this.otherPlayers[playerInfo.id] = { head: enemyHead, body: [], isShielded: false };
  }

  update(time: number, delta: number) {
    if (!this.head || !this.head.body) return;
    
    const pointer = this.input.activePointer;
    let targetAngle = Phaser.Math.Angle.Between(this.head.x, this.head.y, pointer.worldX, pointer.worldY);
    
    // VOID MAP SLOW CENTER DRAWS VELOCITY FORMULAS
    if (this.arenaTheme === 'arena_void') {
      const distToCenter = Phaser.Math.Distance.Between(this.head.x, this.head.y, 1000, 1000);
      if (distToCenter < 700) {
        const angleToCenter = Phaser.Math.Angle.Between(this.head.x, this.head.y, 1000, 1000);
        targetAngle = Phaser.Math.Angle.RotateTo(targetAngle, angleToCenter, 0.05);
      }
    }

    // Process heading physics vectors
    this.head.rotation = Phaser.Math.Angle.RotateTo(this.head.rotation, targetAngle, 0.1 * (delta / 16));
    
    const headBody = this.head.body as Phaser.Physics.Arcade.Body;
    this.physics.velocityFromRotation(this.head.rotation, this.baseSpeed * this.speedMultiplier, headBody.velocity);

    // Apply winds elements
    if (this.arenaTheme === 'arena_temple') {
      headBody.velocity.x += 50; 
    }

    // Trailing body segment interpolation loops
    this.positionHistory.unshift({ x: this.head.x, y: this.head.y, rotation: this.head.rotation });
    if (this.positionHistory.length > this.bodySegments.length * this.historySpacing + 1) this.positionHistory.pop();

    for (let i = 0; i < this.bodySegments.length; i++) {
      const historyIndex = (i + 1) * this.historySpacing;
      if (this.positionHistory[historyIndex]) {
        this.bodySegments[i].setPosition(this.positionHistory[historyIndex].x, this.positionHistory[historyIndex].y);
      }
    }

    // Transmit location records safely to the server ledger
    const bodyCoordinates = this.bodySegments.map(seg => ({ x: seg.x, y: seg.y }));
    this.socket.emit('playerMovement', { x: this.head.x, y: this.head.y, angle: this.head.rotation, body: bodyCoordinates });
  }

  // Release memory pointers on clean system shutdowns
  destroy() {
    if (this._powerUpListener) {
      window.removeEventListener('ACTIVATE_POWERUP_MODIFIER', this._powerUpListener);
    }
    if (this.socket) this.socket.disconnect();
  }
}