'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { supabase } from '@/lib/supabaseClient';

// ==========================================
// PREMIUM ZERO-LATENCY AUDIO SYNTHESIZER
// ==========================================
class AudioSynth {
  private ctx: AudioContext | null = null;
  private init() {
    if (!this.ctx && typeof window !== 'undefined') this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  playEat() { this.init(); if (!this.ctx) return; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(587.33, this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08); g.gain.setValueAtTime(0.3, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + 0.1); }
  playEpicSpawn() { this.init(); if (!this.ctx) return; const n = this.ctx.currentTime; const notes = [523.25, 659.25, 783.99, 1046.50]; notes.forEach((f, index) => { const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, n + (index * 0.04)); g.gain.setValueAtTime(0.15, n + (index * 0.04)); g.gain.exponentialRampToValueAtTime(0.001, n + 0.4); o.connect(g); g.connect(this.ctx!.destination); o.start(n + (index * 0.04)); o.stop(n + 0.4); }); }
  playDie() { this.init(); if (!this.ctx) return; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, this.ctx.currentTime); o.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.4); g.gain.setValueAtTime(0.4, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + 0.4); }
  playPowerUp() { this.init(); if (!this.ctx) return; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(300, this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2); g.gain.setValueAtTime(0.2, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + 0.25); }
  playPoison() { this.init(); if (!this.ctx) return; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(200, this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3); g.gain.setValueAtTime(0.3, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + 0.3); }
}
const sfx = new AudioSynth();

interface PhaserGameProps {
  walletAddress?: string;
  arenaTheme?: 'classic' | 'arena_cyber' | 'arena_magma' | 'arena_toxic' | 'arena_void' | 'arena_temple';
  onGameOver?: (score: number) => void;
}

export default function PhaserGame({ walletAddress, arenaTheme = 'classic', onGameOver }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);
  
  const [inventory, setInventory] = useState({ speed: 0, shield: 0, magnet: 0 });
  const [activeEffects, setActiveEffects] = useState({ speed: false, shield: false, magnet: false });

  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  useEffect(() => {
    const fetchUserInventoryData = async () => {
      if (!walletAddress) return;
      const { data } = await supabase.from('inventory_items').select('speed, shield, magnet').eq('wallet_address', walletAddress.toLowerCase()).single();
      if (data) setInventory({ speed: data.speed || 0, shield: data.shield || 0, magnet: data.magnet || 0 });
    };
    fetchUserInventoryData();
  }, [walletAddress]);

  const handleUsePowerUpModifier = async (type: 'speed' | 'shield' | 'magnet') => {
    if (inventory[type] <= 0 || activeEffects[type]) return;
    setInventory(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    setActiveEffects(prev => ({ ...prev, [type]: true }));
    sfx.playPowerUp();
    window.dispatchEvent(new CustomEvent('ACTIVATE_POWERUP_MODIFIER', { detail: type }));
    const cooldownDuration = type === 'magnet' ? 10000 : 5000;
    setTimeout(() => setActiveEffects(prev => ({ ...prev, [type]: false })), cooldownDuration);
    if (walletAddress) fetch('/api/shop/consume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress, itemType: type }) });
  };

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth < 800 ? window.innerWidth - 32 : 800,
      height: 450,
      parent: gameRef.current,
      backgroundColor: '#06090E',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };

    let head: Phaser.Physics.Arcade.Sprite;
    let snakeBody: Phaser.GameObjects.Sprite[] = [];
    let pathHistory: { x: number, y: number, rotation: number }[] = [];
    let food: Phaser.Physics.Arcade.Sprite;
    
    let scoreText: Phaser.GameObjects.Text;
    let score = 0;
    const baseSpeed = 200; 
    let speedMultiplier = 1; 
    const spacing = 12; 
    
    let isShieldActive = false;
    let isMagnetActive = false;
    
    let isEpicFood = false;
    let isToxicFood = false; // For Toxic Arena
    let foodTimer = 0;
    
    let arenaTimer = 0; // For Magma Eruptions

    function preload(this: Phaser.Scene) {
      this.load.image('classic_head', '/assets/classic_head.svg');
      this.load.image('classic_body', '/assets/classic_body.svg');
      this.load.image('food_normal', '/assets/food_normal.svg');
      this.load.image('food_epic', '/assets/food_epic.svg');
      this.load.image('food_blue', '/assets/food_blue.svg');
      this.load.image('food_purple', '/assets/food_purple.svg');
      this.load.image('food_red', '/assets/food_red.svg');
      
      this.load.image('arena_cyber', '/assets/arena_cyber.svg');
      this.load.image('arena_magma', '/assets/arena_magma.svg');
      this.load.image('arena_toxic', '/assets/arena_toxic.svg');
      this.load.image('arena_void', '/assets/arena_void.svg');
      this.load.image('arena_temple', '/assets/arena_temple.svg');

      this.load.on('loaderror', (fileObj: any) => {
        const g = this.add.graphics();
        if (fileObj.key.includes('head')) { g.fillStyle(0x22c55e); g.fillCircle(15, 15, 15); }
        else if (fileObj.key.includes('body')) { g.fillStyle(0x16a34a); g.fillCircle(12, 12, 12); }
        else if (fileObj.key.includes('arena')) { g.fillStyle(0x06090E); g.fillRect(0,0,256,256); }
        else { g.fillStyle(0x4ade80); g.fillCircle(10, 10, 10); } 
        g.generateTexture(fileObj.key, 30, 30); g.destroy();
      });
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, 2000, 2000);
      
      if (arenaTheme !== 'classic') {
        this.add.tileSprite(1000, 1000, 2000, 2000, arenaTheme);
      } else {
        this.add.grid(1000, 1000, 2000, 2000, 50, 50, 0x0B0F17, 1, 0xffffff, 0.05);
      }

      head = this.physics.add.sprite(1000, 1000, 'classic_head');
      head.setDepth(10);
      
      for(let i=0; i<3; i++) {
        const bodyPart = this.add.sprite(1000, 1000, 'classic_body');
        bodyPart.setDepth(9 - i);
        snakeBody.push(bodyPart);
      }

      food = this.physics.add.sprite(0, 0, 'food_normal');
      food.setDepth(5);
      spawnFood(this);

      this.cameras.main.startFollow(head, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, 2000, 2000);

      scoreText = this.add.text(20, 20, 'YIELD: 0 cUSD', { fontSize: '24px', fontFamily: 'sans-serif', color: '#ffffff', fontStyle: 'bold' }).setScrollFactor(0);
      scoreText.setDepth(100);

      this.physics.add.overlap(head, food, () => eatFood(this), undefined, this);

      const handlePowerUpSignal = (e: Event) => {
        const type = (e as CustomEvent).detail;
        if (type === 'speed') {
          speedMultiplier = 2.0; this.time.delayedCall(5000, () => speedMultiplier = 1.0);
        } else if (type === 'shield') {
          isShieldActive = true; head.setTint(0x60a5fa);
          this.time.delayedCall(5000, () => { isShieldActive = false; head.clearTint(); });
        } else if (type === 'magnet') {
          isMagnetActive = true; this.time.delayedCall(10000, () => { isMagnetActive = false; if(food.body) food.setVelocity(0, 0); });
        }
      };
      window.addEventListener('ACTIVATE_POWERUP_MODIFIER', handlePowerUpSignal);
      (this as any)._powerUpListener = handlePowerUpSignal;
    }

    function update(this: Phaser.Scene, time: number, delta: number) {
      arenaTimer += delta;
      
      // =====================================
      // 1. ARENA-SPECIFIC PHYSICS INJECTIONS
      // =====================================
      let driftX = 0;
      let driftY = 0;
      let targetAngle = Phaser.Math.Angle.Between(head.x, head.y, this.input.activePointer.worldX, this.input.activePointer.worldY);

      if (arenaTheme === 'arena_void') {
        const distToCenter = Phaser.Math.Distance.Between(head.x, head.y, 1000, 1000);
        if (distToCenter < 700) {
          const angleToCenter = Phaser.Math.Angle.Between(head.x, head.y, 1000, 1000);
          targetAngle = Phaser.Math.Angle.RotateTo(targetAngle, angleToCenter, 0.05);
        }
      }

      if (arenaTheme === 'arena_temple') {
        driftX = 50; 
      }

      if (arenaTheme === 'arena_magma' && arenaTimer > 10000) {
        arenaTimer = 0;
        this.cameras.main.shake(1000, 0.02); 
        speedMultiplier = 1.8; 
        head.setTint(0xf87171); 
        this.time.delayedCall(2000, () => { 
          if (!activeEffects.speed) speedMultiplier = 1.0; 
          head.clearTint(); 
        });
      }

      // 2. Base Movement with Drifts
      head.rotation = Phaser.Math.Angle.RotateTo(head.rotation, targetAngle, 0.1 * (delta / 16));
      this.physics.velocityFromRotation(head.rotation, baseSpeed * speedMultiplier, head.body.velocity);
      
      if (driftX !== 0) head.body.velocity.x += driftX;
      if (driftY !== 0) head.body.velocity.y += driftY;

      // 3. Trailing Mechanics
      pathHistory.unshift({ x: head.x, y: head.y, rotation: head.rotation });
      if (pathHistory.length > snakeBody.length * spacing) pathHistory.pop();
      for (let i = 0; i < snakeBody.length; i++) {
        const targetPos = pathHistory[(i + 1) * spacing];
        if (targetPos) snakeBody[i].setPosition(targetPos.x, targetPos.y);
      }

      // 4. Magnet Power-Up
      if (isMagnetActive && food && food.body && !isToxicFood) { 
        if (Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y) < 250) {
          this.physics.moveToObject(food, head, 420);
        } else {
          food.setVelocity(0, 0);
        }
      }

      if (isEpicFood) {
        foodTimer -= delta;
        if (foodTimer < 1500) food.alpha = Math.floor(time / 100) % 2 === 0 ? 0.3 : 1;
        if (foodTimer <= 0) spawnFood(this);
      }

      // =====================================
      // 5. BOUNDARY LOGIC
      // =====================================
      if (arenaTheme === 'arena_cyber') {
        if (head.x < 0) head.x = 2000;
        else if (head.x > 2000) head.x = 0;
        if (head.y < 0) head.y = 2000;
        else if (head.y > 2000) head.y = 0;
      } else {
        if (head.x <= 15 || head.x >= 1985 || head.y <= 15 || head.y >= 1985) {
          if (isShieldActive) {
            head.rotation += Math.PI;
            head.x = Phaser.Math.Clamp(head.x, 25, 1975);
            head.y = Phaser.Math.Clamp(head.y, 25, 1975);
          } else {
            triggerDeath(this);
          }
        }
      }
    }

    function spawnFood(scene: Phaser.Scene) {
      const randomX = Phaser.Math.Between(100, 1900);
      const randomY = Phaser.Math.Between(100, 1900);
      food.setPosition(randomX, randomY);
      if (food.body) food.setVelocity(0, 0);
      food.clearTint();
      isToxicFood = false;
      
      isEpicFood = Math.random() < 0.15; 
      
      if (arenaTheme === 'arena_toxic' && !isEpicFood && Math.random() < 0.25) {
        isToxicFood = true; 
      }
      
      if (isEpicFood) {
        food.setTexture('food_epic');
        foodTimer = 5000; food.alpha = 1; food.setScale(0);
        scene.tweens.add({ targets: food, scale: 1.5, duration: 400, ease: 'Back.out' });
        sfx.playEpicSpawn();
      } else if (isToxicFood) {
        food.setTexture('food_normal');
        food.setTint(0x4ade80); 
        food.alpha = 0.8; food.setScale(0.8); 
      } else {
        const standardFoods = ['food_normal', 'food_blue', 'food_purple', 'food_red'];
        food.setTexture(Phaser.Math.RND.pick(standardFoods));
        food.alpha = 1; food.setScale(1);
      }
    }

    function eatFood(scene: Phaser.Scene) {
      if (isToxicFood) {
        sfx.playPoison();
        score = Math.max(0, score - 10);
        scene.cameras.main.shake(150, 0.01);
        scoreText.setText(`YIELD: ${score} cUSD`);
        scoreText.setColor('#ef4444'); 
        scene.time.delayedCall(500, () => scoreText.setColor('#ffffff'));
        
        if (snakeBody.length > 3) {
          const popped = snakeBody.pop();
          popped?.destroy();
        }
      } else {
        sfx.playEat();
        const tail = snakeBody[snakeBody.length - 1];
        const newSegment = scene.add.sprite(tail.x, tail.y, 'classic_body');
        newSegment.setDepth(tail.depth - 1);
        snakeBody.push(newSegment);

        score += isEpicFood ? 20 : 5;
        scoreText.setText(`YIELD: ${score} cUSD`);
        scene.tweens.add({ targets: scoreText, scale: 1.2, duration: 100, yoyo: true });
      }
      spawnFood(scene);
    }

    function triggerDeath(scene: Phaser.Scene) {
      sfx.playDie();
      
      if (score > 0) {
        // Trigger React Callback
        onGameOverRef.current?.(score);
        
        // --- TOURNAMENT LEADERBOARD SYNC ---
        // Instantly checks the DB and updates the high score if the player is in the tournament!
        if (walletAddress) {
          (async () => {
            try {
              const lowerAddress = walletAddress.toLowerCase();
              const { data, error } = await supabase
                .from('tournament_entries')
                .select('highest_score, has_paid')
                .eq('wallet_address', lowerAddress)
                .single();

              if (!error && data && data.has_paid && score > (data.highest_score || 0)) {
                await supabase
                  .from('tournament_entries')
                  .update({ highest_score: score })
                  .eq('wallet_address', lowerAddress);
                console.log("🏆 New Tournament High Score Synced!");
              }
            } catch (err) {
              console.error("Tournament Sync Error:", err);
            }
          })();
        }
        // -----------------------------------
      }

      scene.cameras.main.shake(400, 0.03);
      
      scene.time.delayedCall(400, () => {
        for (let i = 0; i < snakeBody.length; i++) snakeBody[i].destroy();
        snakeBody = []; pathHistory = [];
        head.setPosition(1000, 1000); head.setRotation(0); head.setVelocity(0, 0);
        for(let i=0; i<3; i++) {
          const bodyPart = scene.add.sprite(1000, 1000, 'classic_body');
          bodyPart.setDepth(9 - i); snakeBody.push(bodyPart);
        }
        score = 0; scoreText.setText('YIELD: 0 cUSD');
        spawnFood(scene);
      });
    }

    phaserInstance.current = new Phaser.Game(config);
    const activeSceneInstance = phaserInstance.current.scene.scenes[0];

    return () => {
      if (activeSceneInstance && (activeSceneInstance as any)._powerUpListener) {
        window.removeEventListener('ACTIVATE_POWERUP_MODIFIER', (activeSceneInstance as any)._powerUpListener);
      }
      phaserInstance.current?.destroy(true);
      phaserInstance.current = null;
      if (gameRef.current) gameRef.current.innerHTML = '';
    };
  }, [walletAddress, arenaTheme]); // Re-mount if theme changes

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#06090E] relative group">
      <div ref={gameRef} className="rounded-xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.15)] w-full max-w-[800px]" />
      
      {/* POWER-UP HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl z-40 transition-transform transform group-hover:scale-102">
        <button onClick={() => handleUsePowerUpModifier('speed')} disabled={inventory.speed <= 0 || activeEffects.speed} className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all border-2 ${activeEffects.speed ? 'border-yellow-400 bg-yellow-500/30 animate-pulse' : inventory.speed > 0 ? 'border-yellow-600/60 bg-yellow-600/10 hover:scale-110 cursor-pointer active:scale-95' : 'border-gray-800 bg-gray-900 opacity-40 grayscale scale-95 cursor-not-allowed'}`} title="Turbo">
          ⚡<span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">{inventory.speed}</span>
        </button>
        <button onClick={() => handleUsePowerUpModifier('shield')} disabled={inventory.shield <= 0 || activeEffects.shield} className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all border-2 ${activeEffects.shield ? 'border-blue-400 bg-blue-500/30 animate-pulse' : inventory.shield > 0 ? 'border-blue-600/60 bg-blue-600/10 hover:scale-110 cursor-pointer active:scale-95' : 'border-gray-800 bg-gray-900 opacity-40 grayscale scale-95 cursor-not-allowed'}`} title="Shield">
          🛡️<span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">{inventory.shield}</span>
        </button>
        <button onClick={() => handleUsePowerUpModifier('magnet')} disabled={inventory.magnet <= 0 || activeEffects.magnet} className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all border-2 ${activeEffects.magnet ? 'border-purple-400 bg-purple-500/30 animate-pulse' : inventory.magnet > 0 ? 'border-purple-600/60 bg-purple-600/10 hover:scale-110 cursor-pointer active:scale-95' : 'border-gray-800 bg-gray-900 opacity-40 grayscale scale-95 cursor-not-allowed'}`} title="Magnet">
          🧲<span className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">{inventory.magnet}</span>
        </button>
      </div>
    </div>
  );
}