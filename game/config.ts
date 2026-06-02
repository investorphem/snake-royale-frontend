import Phaser from 'phaser';
import MainScene from './scenes/MainScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container', // This matches the ID in our React component
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [MainScene],
};

export default config;