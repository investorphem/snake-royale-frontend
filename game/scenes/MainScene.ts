import Phaser from 'undefined';
import { io, Socket } from 'socket.io-client';

export default class MainScene extends Phaser.Scene {
  private socket!: Socket;
  private otherPlayers: { [id: string]: Phaser.GameObjects.Group } = {};
  private mySnake!: Phaser.GameObjects.Group;
  private food!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gridSize = 20;
  private walletAddress: string = "";
  private currentDirection: { x: number, y: number } = { x: 0, y: -this.gridSize };
  private moveTimer: number = 0;
  private moveInterval: number = 100; // Snake speed (lower is faster)

  constructor() {
    super('MainScene');
  }

  init(data: { walletAddress: string }) {
    // Receive the wallet address from the Next.js wrapper
    this.walletAddress = data.walletAddress || "0xGuest";
  }

  create() {
    // Setup keyboard inputs
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Spawn hidden food initially until the server provides the true coordinate
    this.food = this.add.rectangle(-100, -100, this.gridSize - 2, this.gridSize - 2, 0xff00ff);
    
    // 🌐 Connect to your LIVE Node.js Multiplayer Server
    this.socket = io('https://snake-royale-backend.onrender.com');

    // Tell the server we joined and pass our wallet address for the smart contract
    this.socket.emit('joinArena', this.walletAddress);

    // Listen for current players in the room
    this.socket.on('currentPlayers', (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) {
          this.createPlayerSnake(players[id]);
        } else {
          this.createOtherPlayer(players[id]);
        }
      });
    });

    // Listen for new players joining
    this.socket.on('newPlayer', (playerInfo: any) => {
      this.createOtherPlayer(playerInfo);
    });

    // Listen for other players moving
    this.socket.on('playerMoved', (playerInfo: any) => {
      if (this.otherPlayers[playerInfo.id]) {
        this.updateSnakeBody(this.otherPlayers[playerInfo.id], playerInfo.body, playerInfo.color);
      }
    });

    // Listen for players disconnecting
    this.socket.on('playerDisconnected', (playerId: string) => {
      if (this.otherPlayers[playerId]) {
        this.otherPlayers[playerId].destroy(true, true);
        delete this.otherPlayers[playerId];
      }
    });

    // Listen for food spawns
    this.socket.on('foodLocation', (foodLocation: { x: number, y: number }) => {
      this.food.setPosition(foodLocation.x, foodLocation.y);
    });

    // Listen for score/growth updates
    this.socket.on('playerScoreUpdate', (playerInfo: any) => {
      if (playerInfo.id === this.socket.id) {
        // Our snake grew
        this.updateSnakeBody(this.mySnake, playerInfo.body, 0x00ff00);
      } else if (this.otherPlayers[playerInfo.id]) {
        // Someone else's snake grew
        this.updateSnakeBody(this.otherPlayers[playerInfo.id], playerInfo.body, 0x00ffff);
      }
    });

    // Listen for game over / smart contract settlement
    this.socket.on('gameOver', (data: { winnerWallet: string }) => {
      this.add.text(400, 300, `GAME OVER\nWinner: ${data.winnerWallet.substring(0, 6)}...`, {
        fontSize: '48px',
        color: '#ff0000',
        align: 'center'
      }).setOrigin(0.5);
      
      this.scene.pause();
    });
  }

  update(time: number, delta: number) {
    if (!this.mySnake) return;

    // Handle Input for Direction (Prevent 180-degree self-collisions)
    if (this.cursors.left.isDown && this.currentDirection.x === 0) {
      this.currentDirection = { x: -this.gridSize, y: 0 };
    } else if (this.cursors.right.isDown && this.currentDirection.x === 0) {
      this.currentDirection = { x: this.gridSize, y: 0 };
    } else if (this.cursors.up.isDown && this.currentDirection.y === 0) {
      this.currentDirection = { x: 0, y: -this.gridSize };
    } else if (this.cursors.down.isDown && this.currentDirection.y === 0) {
      this.currentDirection = { x: 0, y: this.gridSize };
    }

    // Grid-based movement logic controlled by moveInterval
    this.moveTimer += delta;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;

      const head = this.mySnake.getChildren()[0] as Phaser.GameObjects.Rectangle;
      let newX = head.x + this.currentDirection.x;
      let newY = head.y + this.currentDirection.y;

      // Screen Wrap Logic
      if (newX < 0) newX = 800 - this.gridSize;
      if (newX >= 800) newX = 0;
      if (newY < 0) newY = 600 - this.gridSize;
      if (newY >= 600) newY = 0;

      // Move body segments forward
      const children = this.mySnake.getChildren() as Phaser.GameObjects.Rectangle[];
      for (let i = children.length - 1; i > 0; i--) {
        children[i].setPosition(children[i - 1].x, children[i - 1].y);
      }
      
      // Move head
      head.setPosition(newX, newY);

      // Extract new body coordinates to send to server
      const bodyData = children.map(segment => ({ x: segment.x, y: segment.y }));

      // Send our new position to the server
      this.socket.emit('playerMovement', { x: newX, y: newY, body: bodyData });
    }
  }

  // --- Helper Functions ---

  private createPlayerSnake(playerInfo: any) {
    this.mySnake = this.add.group();
    playerInfo.body.forEach((segment: {x: number, y: number}) => {
      const rect = this.add.rectangle(segment.x, segment.y, this.gridSize - 2, this.gridSize - 2, 0x00ff00);
      this.mySnake.add(rect);
    });
  }

  private createOtherPlayer(playerInfo: any) {
    const snakeGroup = this.add.group();
    playerInfo.body.forEach((segment: {x: number, y: number}) => {
      const rect = this.add.rectangle(segment.x, segment.y, this.gridSize - 2, this.gridSize - 2, playerInfo.color || 0x00ffff);
      snakeGroup.add(rect);
    });
    this.otherPlayers[playerInfo.id] = snakeGroup;
  }

  private updateSnakeBody(snakeGroup: Phaser.GameObjects.Group, bodyData: {x: number, y: number}[], color: number) {
    snakeGroup.clear(true, true);
    bodyData.forEach((segment) => {
      const rect = this.add.rectangle(segment.x, segment.y, this.gridSize - 2, this.gridSize - 2, color);
      snakeGroup.add(rect);
    });
  }
}