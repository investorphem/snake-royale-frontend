'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';

// ============================================================
// AUDIO SYNTH
// ============================================================
class AudioSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  playHiss() {
    if (!this.enabled) return;
    this.init(); const ctx = this.ctx; if (!ctx) return;
    const bufferSize = ctx.sampleRate * 0.3; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const bandpass = ctx.createBiquadFilter(); bandpass.type = 'bandpass'; bandpass.frequency.value = 4000; bandpass.Q.value = 1.0;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    noise.connect(bandpass); bandpass.connect(gain); gain.connect(ctx.destination); noise.start();
  }
  playEat() {
    if (!this.enabled) return;
    this.init(); const ctx = this.ctx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
  }
  playEpicSpawn() {
    if (!this.enabled) return;
    this.init(); const ctx = this.ctx; if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04); gain.gain.setValueAtTime(0.15, now + i * 0.04); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now + i * 0.04); osc.stop(now + 0.4);
    });
  }
  playDie() {
    if (!this.enabled) return;
    this.init(); const ctx = this.ctx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4);
  }
  playPowerup() {
    if (!this.enabled) return;
    this.init(); const ctx = this.ctx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.3);
  }
}
const sfx = new AudioSynth();

export interface UserDatabaseSettings {
  username: string;
  selectedSkin: string;
  audioEnabled: boolean;
  inventory: { speed: number; shield: number; magnet: number };
}

interface PhaserGameProps {
  walletAddress?: string;
  onGameOver?: (score: number) => void;
  onSettingsChange?: (newSettings: UserDatabaseSettings) => void;
}

export default function PhaserGame({ walletAddress, onGameOver, onSettingsChange }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);

  const [currentScore, setCurrentScore] = useState(0);
  const [currentKills, setCurrentKills] = useState(0);
  const [gameOverData, setGameOverData] = useState<{ score: number; kills: number } | null>(null);

  const [dbSettings, setDbSettings] = useState<UserDatabaseSettings>({
    username: 'Player',
    selectedSkin: 'default',
    audioEnabled: true,
    inventory: { speed: 3, shield: 2, magnet: 3 }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);
  useEffect(() => { sfx.enabled = dbSettings.audioEnabled; }, [dbSettings.audioEnabled]);

  useEffect(() => {
    if (!walletAddress) { setIsLoading(false); return; }
    const fetchUserData = async () => {
      try {
        const response = await fetch(`/api/user/profile?wallet=${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          const loadedSettings = {
            username: data.username || 'Player',
            selectedSkin: data.skin || 'default',
            audioEnabled: data.audio_enabled !== undefined ? data.audio_enabled : true,
            inventory: data.inventory || { speed: 3, shield: 2, magnet: 3 }
          };
          setDbSettings(loadedSettings);
          if (onSettingsChange) onSettingsChange(loadedSettings);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [walletAddress]);

  const updateSettingInDatabase = async (newSettings: Partial<UserDatabaseSettings>) => {
    if (!walletAddress) return;
    const updatedState = { ...dbSettings, ...newSettings };
    setDbSettings(updatedState);
    if (onSettingsChange) onSettingsChange(updatedState);

    try {
      await fetch('/api/user/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, ...updatedState }),
      });
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  };

  const handleSaveUsername = () => { setIsEditingUsername(false); updateSettingInDatabase({ username: tempUsername }); };
  const toggleAudio = () => updateSettingInDatabase({ audioEnabled: !dbSettings.audioEnabled });
  const changeSkin = (skinName: string) => updateSettingInDatabase({ selectedSkin: skinName });

  const handleUsePowerup = (type: 'speed' | 'shield' | 'magnet') => {
    if (dbSettings.inventory[type] > 0 && !gameOverData) {
      const nextInventory = { ...dbSettings.inventory, [type]: dbSettings.inventory[type] - 1 };
      updateSettingInDatabase({ inventory: nextInventory });
      window.dispatchEvent(new CustomEvent('activatePowerup', { detail: type }));
      sfx.playPowerup();
    }
  };

  useEffect(() => {
    const handleScoreUpdate = (e: any) => setCurrentScore(e.detail);
    const handleGameOverUI = (e: any) => setGameOverData(e.detail);
    window.addEventListener('updatePhaserScore', handleScoreUpdate);
    window.addEventListener('showGameOver', handleGameOverUI);
    return () => {
      window.removeEventListener('updatePhaserScore', handleScoreUpdate);
      window.removeEventListener('showGameOver', handleGameOverUI);
    };
  }, []);

  const handlePlayAgain = () => {
    setGameOverData(null);
    setCurrentScore(0);
    window.dispatchEvent(new CustomEvent('restartGame'));
  };

  // ============================================================
  // PHASER GAME ENGINE - "PREMIUM" SLITHER UPDATE
  // ============================================================
  useEffect(() => {
    if (!gameRef.current || phaserInstance.current || isLoading) return;

    const BASE_SPEED = 240;
    const BODY_CANVAS = 80; const SEG_DISPLAY = 60;
    const HEAD_CANVAS_W = 110; const HEAD_CANVAS_H = 130;
    const HEAD_DISPLAY_W = 85; const HEAD_DISPLAY_H = 100;
    
    // VISUAL_OFFSET rotates the drawn textures so 0 degrees points forward
    const VISUAL_OFFSET = Math.PI / 2;

    // HISTORY BUFFER: This tracks exactly where the head has been
    let pathHistory: { x: number, y: number, angle: number }[] = [];
    const HISTORY_SPACING = 6; // How tightly the segments overlap

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: { mode: Phaser.Scale.RESIZE, parent: gameRef.current, width: '100%', height: '100%' },
      backgroundColor: '#06090E',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update },
    };

    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    let food: Phaser.Physics.Arcade.Sprite;
    let tongue: Phaser.GameObjects.Sprite;
    let tongueOffset = 0; let isFlicking = false;
    let trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    let joystickBase: Phaser.GameObjects.Arc; let joystickThumb: Phaser.GameObjects.Arc;
    let isJoystickActive = false; let targetJoystickAngle = -Math.PI / 2; let currentMoveAngle = -Math.PI / 2;
    let score = 0; let isEpicFood = false; let foodTimer = 0; let pendingGrowth = 0;
    let isEating = false; let isDead = false; let powerUpSpeedMult = 1;
    let magnetRange = 150; let isShielded = false;

    function preload(this: Phaser.Scene) {
      this.load.image('arena_default', '/assets/arena_default.png');
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 3000, 3000);
      const grid = this.add.tileSprite(1500, 1500, 3000, 3000, 'arena_default').setDepth(0);
      grid.setAlpha(0.4);

      // PERFECT PREMIUM COLORS
      let colorDarkBorder = 0x215410;   // Outer dark green ridge
      let colorBaseGreen  = 0x6ac523;   // Main vibrant green
      let colorHighlight  = 0x9be044;   // Inner specular glow
      
      if (dbSettings.selectedSkin === 'fire') {
        colorDarkBorder = 0x7a110d; colorBaseGreen = 0xdc3522; colorHighlight = 0xff7b54;
      } else if (dbSettings.selectedSkin === 'neon') {
        colorDarkBorder = 0x221354; colorBaseGreen = 0x5b32d4; colorHighlight = 0xa37cf6;
      }

      // 1. GENERATE PERFECT BODY SEGMENT (Circles with glowing crescent edge)
      {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        const cx = BODY_CANVAS / 2; const cy = BODY_CANVAS / 2; const r = 32;
        
        // Dark outer border
        g.fillStyle(colorDarkBorder, 1); g.fillCircle(cx, cy, r);
        // Base color
        g.fillStyle(colorBaseGreen, 1); g.fillCircle(cx, cy, r - 4);
        
        // Glossy Top-Left Crescent Highlight (Exactly like the image)
        g.lineStyle(6, colorHighlight, 1);
        g.beginPath();
        g.arc(cx, cy, r - 9, Math.PI * 0.9, Math.PI * 1.7);
        g.strokePath();

        g.generateTexture('snake_body', BODY_CANVAS, BODY_CANVAS);
        g.destroy();
      }

      // 2. GENERATE PERFECT HEAD & CROWN
      {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        
        // Base Head Shape
        g.fillStyle(colorDarkBorder, 1); g.fillEllipse(55, 80, 76, 74);
        g.fillStyle(colorBaseGreen, 1); g.fillEllipse(55, 80, 68, 66);
        
        // Crown Base & Spikes
        g.fillStyle(0xcc8400, 1); // Dark gold edge
        g.fillRect(23, 28, 64, 10);
        g.fillStyle(0xffb800, 1); // Bright Gold
        g.beginPath(); g.moveTo(23, 38); g.lineTo(29, 10); g.lineTo(41, 30); g.closePath(); g.fillPath(); // Left
        g.beginPath(); g.moveTo(41, 38); g.lineTo(55, 4); g.lineTo(69, 38); g.closePath(); g.fillPath(); // Center
        g.beginPath(); g.moveTo(69, 38); g.lineTo(81, 10); g.lineTo(87, 38); g.closePath(); g.fillPath(); // Right
        g.fillStyle(0xffd233, 1); g.fillRect(23, 30, 64, 12);
        
        // Crown Jewels
        g.fillStyle(0xeb1c24, 1); g.fillCircle(55, 34, 5); // Red ruby
        g.fillStyle(0x3399ff, 1); g.fillCircle(33, 35, 3);
        g.fillStyle(0x3399ff, 1); g.fillCircle(77, 35, 3);

        // Eyes
        g.fillStyle(0xffffff, 1); g.fillCircle(33, 72, 12); g.fillCircle(77, 72, 12);
        g.fillStyle(0x000000, 1); g.fillCircle(33, 70, 7);  g.fillCircle(77, 70, 7);
        g.fillStyle(0xffffff, 1); g.fillCircle(30, 67, 2.5);g.fillCircle(74, 67, 2.5); // Pupil shine

        // Snout
        g.fillStyle(colorDarkBorder, 0.4); g.fillEllipse(55, 100, 36, 22);
        g.fillStyle(0x000000, 0.6); g.fillCircle(47, 98, 3.5); g.fillCircle(63, 98, 3.5);

        g.generateTexture('snake_head', HEAD_CANVAS_W, HEAD_CANVAS_H);
        g.destroy();
      }

      // 3. GENERATE TAIL TIP
      {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(colorDarkBorder, 1); g.fillEllipse(20, 20, 38, 30);
        g.fillStyle(colorBaseGreen, 1); g.fillEllipse(20, 20, 30, 22);
        g.generateTexture('snake_tail', 40, 40);
        g.destroy();
      }

      // 4. GENERATE TONGUE
      {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.lineStyle(4, 0xeb1c24, 1); g.beginPath(); g.moveTo(15, 50); g.lineTo(15, 20); g.strokePath();
        g.lineStyle(3, 0xeb1c24, 1); g.beginPath(); g.moveTo(15, 20); g.lineTo(5, 2); g.strokePath();
        g.beginPath(); g.moveTo(15, 20); g.lineTo(25, 2); g.strokePath();
        g.generateTexture('snake_tongue', 30, 52);
        g.destroy();
      }

      // FOOD TEXTURES
      {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0x3b82f6, 0.3); g.fillCircle(16, 16, 16);
        g.fillStyle(0x60a5fa, 0.7); g.fillCircle(16, 16, 10);
        g.fillStyle(0xffffff, 1);   g.fillCircle(16, 16, 4);
        g.generateTexture('premium_food', 32, 32);
        g.destroy();
      }
      {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xa855f7, 0.4); g.fillCircle(24, 24, 24);
        g.fillStyle(0xd946ef, 0.8); g.fillCircle(24, 24, 14);
        g.fillStyle(0xfef08a, 1);   g.fillCircle(24, 24, 6);
        g.generateTexture('premium_food_epic', 48, 48);
        g.destroy();
      }
      {
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xffffff); g.fillCircle(4, 4, 4);
        g.generateTexture('foodSpark', 8, 8);
        g.destroy();
      }

      // INITIALIZE SNAKE
      head = this.physics.add.sprite(1500, 1500, 'snake_head');
      head.setDepth(1000); head.setOrigin(0.5, 0.5);
      head.setDisplaySize(HEAD_DISPLAY_W, HEAD_DISPLAY_H);
      head.setCollideWorldBounds(true);

      tongue = this.add.sprite(1500, 1500, 'snake_tongue');
      tongue.setDepth(999); tongue.setOrigin(0.5, 1); tongue.setVisible(false);

      // Pre-fill history so it spawns fully extended
      for(let i=0; i<300; i++) {
        pathHistory.push({ x: 1500, y: 1500 + i * 4, angle: -Math.PI / 2 });
      }

      const spawnSegment = (scene: Phaser.Scene, depth: number, index: number, total: number) => {
        const isLast = index === total - 1;
        const seg = scene.add.sprite(1500, 1500, isLast ? 'snake_tail' : 'snake_body');
        seg.setOrigin(0.5, 0.5); seg.setDepth(depth);
        return seg;
      };

      // Spawn initial 15 body segments
      for (let i = 0; i < 15; i++) {
        snakeBody.push(spawnSegment(this, 998 - i, i, 15));
      }

      food = this.physics.add.sprite(0, 0, 'premium_food'); food.setDepth(5);
      trailEmitter = this.add.particles(0, 0, 'foodSpark', { scale: { start: 0.6, end: 0 }, alpha: { start: 0.5, end: 0 }, lifespan: 400, tint: colorBaseGreen, blendMode: 'ADD' });
      trailEmitter.stop();
      spawnFood(this);

      // Mobile Scale config
      const isMobile = this.scale.width < 600;
      this.cameras.main.startFollow(head, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, 3000, 3000); 
      this.cameras.main.setZoom(isMobile ? 0.75 : 1.3);
      grid.setTileScale(isMobile ? 0.7 : 1.0);

      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);

      // RESTART EVENT
      window.addEventListener('restartGame', () => {
        isDead = false; score = 0; pendingGrowth = 0; tongueOffset = 0;
        head.setPosition(1500, 1500); currentMoveAngle = -Math.PI / 2; targetJoystickAngle = -Math.PI / 2;
        head.rotation = currentMoveAngle + VISUAL_OFFSET; head.setVisible(true);
        head.clearTint();
        
        pathHistory = [];
        for(let i=0; i<300; i++) pathHistory.push({ x: 1500, y: 1500 + i * 4, angle: -Math.PI / 2 });
        
        snakeBody.forEach(s => s.destroy()); snakeBody = [];
        for (let i = 0; i < 15; i++) {
          snakeBody.push(spawnSegment(this, 998 - i, i, 15));
        }
        window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));
        spawnFood(this);
      });

      // POWERUPS
      const handlePowerupEvent = (e: any) => {
        if (isDead) return;
        const type = e.detail;
        let popupText = '';
        if (type === 'speed') { powerUpSpeedMult = 1.8; popupText = '⚡ SPEED BOOST!'; setTimeout(() => (powerUpSpeedMult = 1), 5000); }
        if (type === 'magnet') { magnetRange = 500; popupText = '🧲 MAGNET ACTIVE!'; setTimeout(() => (magnetRange = 150), 8000); }
        if (type === 'shield') {
          isShielded = true; popupText = '🛡️ SHIELDED!';
          head.setTint(0x60a5fa); snakeBody.forEach(s => s.setTint(0x60a5fa));
          setTimeout(() => { isShielded = false; head.clearTint(); snakeBody.forEach(s => s.clearTint()); }, 8000);
        }
        const popup = this.add.text(head.x, head.y - 60, popupText, {
          fontSize: '32px', fontFamily: 'Arial', color: '#ffffff', fontStyle: '900', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(3000);
        this.tweens.add({ targets: popup, y: popup.y - 100, alpha: 0, duration: 1500, onComplete: () => popup.destroy() });
      };
      window.addEventListener('activatePowerup', handlePowerupEvent);
      this.events.on('destroy', () => window.removeEventListener('activatePowerup', handlePowerupEvent));

      // JOYSTICK CONTROLS
      this.input.addPointer(2);
      joystickBase = this.add.circle(0, 0, 70, 0xffffff, 0.15).setScrollFactor(0).setDepth(3000).setVisible(false);
      joystickThumb = this.add.circle(0, 0, 35, 0xffffff, 0.4).setScrollFactor(0).setDepth(3000).setVisible(false);
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.x > this.cameras.main.width * 0.7 || isDead) return;
        isJoystickActive = true;
        joystickBase.setPosition(p.x, p.y).setVisible(true);
        joystickThumb.setPosition(p.x, p.y).setVisible(true);
      });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (!isJoystickActive || !p.isDown || isDead) return;
        const angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, p.x, p.y);
        const dist = Math.min(Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, p.x, p.y), 45);
        joystickThumb.setPosition(joystickBase.x + Math.cos(angle) * dist, joystickBase.y + Math.sin(angle) * dist);
        targetJoystickAngle = angle;
      });
      this.input.on('pointerup', () => {
        isJoystickActive = false; joystickBase.setVisible(false); joystickThumb.setVisible(false);
      });
    }

    function flickTongue(scene: Phaser.Scene) {
      if (isFlicking || isEating || isDead) return;
      isFlicking = true; sfx.playHiss(); tongue.setVisible(true);
      scene.tweens.add({
        targets: { offset: 0 }, offset: HEAD_DISPLAY_H * 0.35, duration: 140, yoyo: true,
        onUpdate: (tween) => { tongueOffset = Number(tween.getValue()) || 0; },
        onComplete: () => {
          tongueOffset = 0; tongue.setVisible(false);
          scene.time.delayedCall(900, () => (isFlicking = false));
        },
      });
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      if (!head || !head.body || isDead) return;

      if (isJoystickActive) {
        const diff = Phaser.Math.Angle.Wrap(targetJoystickAngle - currentMoveAngle);
        currentMoveAngle += diff * 0.15;
      }

      // ===================================================================
      // THE ZIGZAG MAGIC (Organic Sine-Wave Slither)
      // This applies a gentle oscillation to the head angle as it moves!
      // ===================================================================
      const SLITHER_INTENSITY = 0.22; // How wide the zigzag is
      const SLITHER_SPEED = 0.007;   // How fast it wiggles
      const slitherOffset = Math.sin(time * SLITHER_SPEED) * SLITHER_INTENSITY;
      
      const finalHeadAngle = currentMoveAngle + slitherOffset;

      this.physics.velocityFromRotation(finalHeadAngle, BASE_SPEED * powerUpSpeedMult, (head.body as Phaser.Physics.Arcade.Body).velocity);
      head.rotation = finalHeadAngle + VISUAL_OFFSET;

      // ===================================================================
      // RECORD PATH HISTORY
      // ===================================================================
      pathHistory.unshift({ x: head.x, y: head.y, angle: head.rotation });
      if (pathHistory.length > 2000) pathHistory.pop(); // Keep memory clean

      if (!isEating && powerUpSpeedMult > 1) {
        const tail = snakeBody[snakeBody.length - 1];
        if (tail) trailEmitter.emitParticleAt(tail.x, tail.y);
      }

      const snoutDist = HEAD_DISPLAY_H * 0.44 + tongueOffset;
      tongue.setPosition(head.x + Math.cos(finalHeadAngle) * snoutDist, head.y + Math.sin(finalHeadAngle) * snoutDist);
      tongue.rotation = finalHeadAngle + VISUAL_OFFSET;

      const foodDist = Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y);
      if (foodDist < 260 && foodDist > 50 && !isFlicking && Math.random() < 0.08) flickTongue(this);
      if (Math.random() < 0.004) flickTongue(this);
      if (foodDist < magnetRange && !isEating) {
        const pa = Phaser.Math.Angle.Between(food.x, food.y, head.x, head.y);
        const ps = magnetRange === 500 ? 14 : 8;
        food.x += Math.cos(pa) * ps; food.y += Math.sin(pa) * ps;
      }
      if (foodDist < 30 && !isEating) eatFood(this);

      // ===================================================================
      // PERFECT BODY FOLLOW (Reads from the exact path the head took)
      // ===================================================================
      const total = snakeBody.length;
      for (let i = 0; i < total; i++) {
        // Multiply by spacing to push segments further back along the path
        const historyIndex = (i + 1) * HISTORY_SPACING; 
        
        if (historyIndex < pathHistory.length) {
          const pastPoint = pathHistory[historyIndex];
          snakeBody[i].setPosition(pastPoint.x, pastPoint.y);
          snakeBody[i].setRotation(pastPoint.angle);
        }

        // Taper the last few segments down to a tiny tail
        const taperStart = total - 8; 
        const isLast = i === total - 1;
        let displaySize = SEG_DISPLAY;
        if (i >= taperStart) {
          const ratio = (i - taperStart) / 8;
          displaySize = Phaser.Math.Linear(SEG_DISPLAY, isLast ? 16 : 26, ratio);
        }
        
        // Stretch effect during speed boost
        const stretch = powerUpSpeedMult > 1 ? 1.08 : 1;
        snakeBody[i].setDisplaySize(displaySize * (1 / stretch), displaySize * stretch);

        // Self-collision (death)
        if (i > 15 && !isDead && !isShielded) {
          if (Phaser.Math.Distance.Between(head.x, head.y, snakeBody[i].x, snakeBody[i].y) < COLLISION_RADIUS) {
            triggerDeath(this);
          }
        }
      }

      if (isEpicFood) {
        foodTimer -= delta;
        food.setDisplaySize(40 + Math.sin(time / 150) * 8, 40 + Math.sin(time / 150) * 8);
        if (foodTimer < 1500) food.alpha = Math.floor(time / 100) % 2 === 0 ? 0.3 : 1;
        if (foodTimer <= 0) spawnFood(this);
      }

      // Grow body dynamically
      if (pendingGrowth > 0 && time % 10 < 3) {
        const last = snakeBody[snakeBody.length - 1];
        last.setTexture('snake_body'); last.setDisplaySize(26, 26);
        const newTail = this.add.sprite(last.x, last.y, 'snake_tail');
        newTail.setOrigin(0.5, 0.5); newTail.setDepth(last.depth - 1); newTail.setDisplaySize(16, 16);
        if (isShielded) newTail.setTint(0x60a5fa);
        snakeBody.push(newTail); 
        pendingGrowth--;
      }

      if (head.x <= 20 || head.x >= 2980 || head.y <= 20 || head.y >= 2980) {
        if (!isShielded) triggerDeath(this);
        else targetJoystickAngle = currentMoveAngle + Math.PI;
      }
    }

    function spawnFood(scene: Phaser.Scene) {
      food.setPosition(Phaser.Math.Between(200, 2800), Phaser.Math.Between(200, 2800));
      isEpicFood = Math.random() < 0.2;
      if (isEpicFood) {
        food.setTexture('premium_food_epic'); foodTimer = 5000; food.alpha = 1; food.setDisplaySize(45, 45);
        scene.tweens.add({ targets: food, scale: 1.2, duration: 400, ease: 'Back.out' });
        sfx.playEpicSpawn();
      } else {
        food.setTexture('premium_food'); food.alpha = 1; food.setDisplaySize(28, 28);
      }
    }

    function eatFood(scene: Phaser.Scene) {
      if (isEating || isDead) return;
      isEating = true; sfx.playEat();
      const points = isEpicFood ? 45 : 15;
      const popup = scene.add.text(head.x, head.y - 40, `+${points}`, {
        fontSize: '44px', fontFamily: 'system-ui', color: '#4ade80', fontStyle: '900', stroke: '#000000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(2500);
      scene.tweens.add({ targets: popup, y: popup.y - 120, alpha: 0, duration: 1000, ease: 'Cubic.out', onComplete: () => popup.destroy() });
      scene.tweens.add({ targets: head, scaleX: 1.25, scaleY: 0.85, duration: 80, yoyo: true });
      scene.add.particles(food.x, food.y, 'foodSpark', { speed: { min: 80, max: 250 }, lifespan: 400, quantity: 15, scale: { start: 0.5, end: 0 }});
      scene.tweens.add({
        targets: food, scale: 0, alpha: 0, duration: 100,
        onComplete: () => {
          pendingGrowth += isEpicFood ? 6 : 2;
          score += points;
          window.dispatchEvent(new CustomEvent('updatePhaserScore', { detail: score }));
          spawnFood(scene); isEating = false;
        },
      });
    }

    function triggerDeath(scene: Phaser.Scene) {
      if (isDead) return;
      isDead = true; sfx.playDie();
      head.setVelocity(0, 0); tongue.setVisible(false);
      scene.add.particles(head.x, head.y, 'foodSpark', { speed: { min: 50, max: 300 }, lifespan: 800, quantity: 40, scale: { start: 0.8, end: 0 }});
      head.setVisible(false); snakeBody.forEach(s => s.setVisible(false));
      scene.cameras.main.shake(600, 0.04);
      scene.time.delayedCall(1000, () => {
        window.dispatchEvent(new CustomEvent('showGameOver', { detail: { score, kills: 0 } }));
      });
    }

    phaserInstance.current = new Phaser.Game(config);
    return () => {
      phaserInstance.current?.destroy(true); phaserInstance.current = null;
      if (gameRef.current) gameRef.current.innerHTML = '';
    };
  }, [isLoading, dbSettings.selectedSkin]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#06090E] z-[9999] overflow-hidden select-none touch-none">
      <div ref={gameRef} className="absolute inset-0 w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[999999] flex items-center justify-center text-emerald-400 font-black text-2xl uppercase tracking-widest animate-pulse">
          Syncing Database...
        </div>
      )}

      {gameOverData && !isLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 animate-fade-in pointer-events-auto">
          <h2 className="text-5xl font-black text-white italic drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] mb-2 text-center tracking-tighter">GAME OVER</h2>
          <div className="bg-[#111722] border border-white/10 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#84cc16] to-[#22c55e]" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1 mt-2">Total Yield</p>
            <p className="text-6xl font-black text-[#4ade80] mb-8 drop-shadow-md">{gameOverData.score}</p>
            <div className="w-full flex justify-between px-6 pb-2">
              <div className="flex flex-col items-center">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Kills</p>
                <p className="text-2xl font-black text-white">{gameOverData.kills}</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Rank</p>
                <p className="text-2xl font-black text-yellow-400">#3</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button onClick={handlePlayAgain} className="w-full bg-gradient-to-b from-[#a3e635] to-[#65a30d] text-black rounded-xl py-4 font-black text-lg shadow-[0_4px_0_#3f6212] active:shadow-none active:translate-y-1 transition-all uppercase tracking-wider">PLAY AGAIN</button>
            <button onClick={() => onGameOverRef.current?.(gameOverData.score)} className="w-full bg-[#1A1F2E] border border-white/10 text-white rounded-xl py-4 font-black text-sm active:bg-white/5 transition-all uppercase tracking-wider">RETURN HOME</button>
          </div>
        </div>
      )}

      {!gameOverData && !isLoading && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          <div className="flex justify-between items-start w-full mt-2">
            
            <div className="pointer-events-auto flex flex-col gap-2 bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-xl text-white">
              {isEditingUsername ? (
                <div className="flex gap-1.5">
                  <input type="text" defaultValue={dbSettings.username} onChange={(e) => setTempUsername(e.target.value)} className="bg-black/60 border border-white/20 rounded-md px-2 py-0.5 text-xs text-white outline-none w-24 font-bold" />
                  <button onClick={handleSaveUsername} className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>👤 {dbSettings.username}</span>
                  <button onClick={() => { setTempUsername(dbSettings.username); setIsEditingUsername(true); }} className="text-[10px] text-gray-400 hover:text-white">✏️</button>
                </div>
              )}

              <button onClick={toggleAudio} className="text-left text-xs font-bold text-gray-300 hover:text-white flex justify-between items-center w-full mt-1 border-t border-white/10 pt-2">
                <span>Audio</span>
                <span>{dbSettings.audioEnabled ? '🔊 ON' : '🔇 OFF'}</span>
              </button>
              
              <div className="flex justify-between items-center text-xs font-bold w-full mt-1 border-t border-white/10 pt-2 text-gray-300">
                <span>Skin</span>
                <div className="flex gap-1">
                  <button onClick={() => changeSkin('default')} className={`w-4 h-4 rounded-full bg-green-500 ${dbSettings.selectedSkin === 'default' ? 'ring-1 ring-white' : 'opacity-50'}`}></button>
                  <button onClick={() => changeSkin('fire')} className={`w-4 h-4 rounded-full bg-red-500 ${dbSettings.selectedSkin === 'fire' ? 'ring-1 ring-white' : 'opacity-50'}`}></button>
                  <button onClick={() => changeSkin('neon')} className={`w-4 h-4 rounded-full bg-purple-500 ${dbSettings.selectedSkin === 'neon' ? 'ring-1 ring-white' : 'opacity-50'}`}></button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[42px] font-black text-white drop-shadow-md leading-none">{currentScore}</div>
              <div className="text-sm font-bold text-gray-300 mt-1 drop-shadow-md">Kills: <span className="text-white">{currentKills}</span></div>
            </div>
            
            <div className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-2 w-[110px] text-white shadow-lg text-[10px]">
              <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/10 text-yellow-400 font-bold"><span>🏆 Rank</span><span>Pts</span></div>
              <div className="flex flex-col gap-1 font-bold">
                <div className="flex justify-between"><span className="text-gray-400 truncate w-12">1. Alpha</span><span className="text-yellow-400">1299</span></div>
                <div className="flex justify-between text-[#4ade80] mt-1"><span className="truncate w-12">2. {dbSettings.username}</span><span>{currentScore}</span></div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end items-end w-full pb-6 pr-2">
            <div className="flex gap-3 pointer-events-auto">
              <button onClick={() => handleUsePowerup('speed')} className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-yellow-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-90 transition-all p-2.5">
                <img src="/assets/powerup_speed.png" alt="Speed" className={`w-full h-full object-contain ${dbSettings.inventory.speed === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">{dbSettings.inventory.speed}</span>
              </button>
              <button onClick={() => handleUsePowerup('shield')} className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-blue-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-90 transition-all p-2.5">
                <img src="/assets/powerup_shield.png" alt="Shield" className={`w-full h-full object-contain ${dbSettings.inventory.shield === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">{dbSettings.inventory.shield}</span>
              </button>
              <button onClick={() => handleUsePowerup('magnet')} className="relative w-[52px] h-[52px] rounded-full bg-black/60 backdrop-blur-md border-2 border-purple-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-90 transition-all p-2.5">
                <img src="/assets/powerup_magnet.png" alt="Magnet" className={`w-full h-full object-contain ${dbSettings.inventory.magnet === 0 ? 'opacity-30 grayscale' : 'drop-shadow-md'}`} />
                <span className="absolute -top-1 -right-1 bg-black border border-white/20 text-white text-[9px] w-[22px] h-[22px] rounded-full flex items-center justify-center font-black shadow-lg">{dbSettings.inventory.magnet}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
