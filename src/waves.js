import { ATTACKER_COUNT_MULT, getCurrentDifficultyConfig, LOGICAL_W, MIN_WAVE_DURATION } from './settings.js';
import { EnemyFactory } from './enemies.js';

function randomSpawnX() {
  return 80 + Math.random() * (LOGICAL_W - 160);
}

export class WaveManager {
  constructor() {
    this.currentWave = 0;
    this.maxWaves = 30;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.allSpawned = false;
    this.bossRepeatCount = 0;
    this.waveElapsed = 0;
    this.currentWaveType = 'normal';
  }

  startWave(waveNumber, enemies) {
    const difficulty = getCurrentDifficultyConfig();
    this.currentWave = waveNumber;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.allSpawned = false;
    this.waveElapsed = 0;
    const def = this.getWaveDefinition(waveNumber);
    this.currentWaveType = def.type;

    if (def.type === 'boss') {
      const bossOptions = { ...(def.options || {}) };
      if (def.enemyType === 'BOSS_PHANTOM') bossOptions.repeatCount = def.repeatCount ?? 1;
      bossOptions.bossTier = Math.ceil(waveNumber / 5);
      this.spawnQueue.push({ enemyType: def.enemyType, x: 960, y: -120, options: bossOptions, delayAfter: 0 });
      enemies.length = 0;
      return def;
    }

    let totalDuration = 0;
    let cycle = 0;
    while (totalDuration < MIN_WAVE_DURATION) {
      for (const group of def.spawns) {
        for (let i = 0; i < group.count; i += 1) {
          const delayAfter = (i === group.count - 1 ? group.delay : 0.3) / difficulty.spawnRateMult;
          this.spawnQueue.push({
            enemyType: group.enemyType,
            x: randomSpawnX(),
            y: -80 - Math.random() * 48 - cycle * 6,
            options: group.options || {},
            delayAfter,
          });
          totalDuration += delayAfter;
        }
      }
      cycle += 1;
      if (cycle > 16) break;
    }

    const trimmedLength = Math.max(def.spawns.length, Math.round(this.spawnQueue.length * ATTACKER_COUNT_MULT));
    if (trimmedLength < this.spawnQueue.length) {
      const trimmedQueue = [];
      for (let i = 0; i < trimmedLength; i += 1) {
        trimmedQueue.push(this.spawnQueue[Math.floor(i * this.spawnQueue.length / trimmedLength)]);
      }
      this.spawnQueue = trimmedQueue;
      totalDuration = this.spawnQueue.reduce((sum, entry) => sum + entry.delayAfter, 0);
    }

    if (totalDuration > 0) {
      const delayScale = MIN_WAVE_DURATION / totalDuration;
      this.spawnQueue = this.spawnQueue.map((entry) => ({ ...entry, delayAfter: entry.delayAfter * delayScale }));
    }
    return def;
  }

  update(dt, enemies) {
    this.waveElapsed += dt;
    if (this.allSpawned) return;
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.spawnQueue.length) {
      const entry = this.spawnQueue.shift();
      enemies.push(EnemyFactory.create(entry.enemyType, entry.x, entry.y, entry.options));
      this.spawnTimer += entry.delayAfter;
    }
    if (!this.spawnQueue.length) this.allSpawned = true;
  }

  isWaveClear(enemies) {
    if (this.currentWaveType === 'boss') return this.allSpawned && enemies.length === 0;
    return this.waveElapsed >= MIN_WAVE_DURATION && this.allSpawned && enemies.length === 0;
  }

  getWaveDefinition(n) {
    const normal = (spawns) => ({ type: 'normal', spawns });
    const boss = (enemyType, options = {}) => ({ type: 'boss', enemyType, ...options });

    const defs = {
      1: normal([{ enemyType: 'DRIFTER', count: 6, delay: 0.8 }]),
      2: normal([{ enemyType: 'DRIFTER', count: 8, delay: 0.7 }, { enemyType: 'BOMBER', count: 1, delay: 2.0 }]),
      3: normal([{ enemyType: 'DRIFTER', count: 6, delay: 0.7 }, { enemyType: 'BOMBER', count: 2, delay: 1.5 }, { enemyType: 'HUNTER', count: 2, delay: 1.5 }]),
      4: normal([{ enemyType: 'DRIFTER', count: 10, delay: 0.6 }, { enemyType: 'HUNTER', count: 4, delay: 1.0 }, { enemyType: 'BOMBER', count: 2, delay: 1.5 }]),
      5: boss('BOSS_VOID'),
      6: normal([{ enemyType: 'DRIFTER', count: 8, delay: 0.7 }, { enemyType: 'HUNTER', count: 4, delay: 1.0 }, { enemyType: 'ELITE', count: 1, delay: 3.0 }]),
      7: normal([{ enemyType: 'BOMBER', count: 4, delay: 1.0 }, { enemyType: 'HUNTER', count: 6, delay: 0.8 }, { enemyType: 'ELITE', count: 1, delay: 3.0 }]),
      8: normal([{ enemyType: 'DRIFTER', count: 12, delay: 0.5 }, { enemyType: 'ELITE', count: 2, delay: 2.5 }, { enemyType: 'HUNTER', count: 4, delay: 0.8 }]),
      9: normal([{ enemyType: 'DRIFTER', count: 8, delay: 0.5 }, { enemyType: 'BOMBER', count: 3, delay: 1.0 }, { enemyType: 'HUNTER', count: 4, delay: 0.8 }, { enemyType: 'ELITE', count: 2, delay: 2.0 }]),
      10: boss('BOSS_TITAN'),
      11: normal([{ enemyType: 'DRIFTER', count: 10, delay: 0.45 }, { enemyType: 'HUNTER', count: 6, delay: 0.7 }, { enemyType: 'ELITE', count: 2, delay: 1.8 }]),
      12: normal([{ enemyType: 'BOMBER', count: 4, delay: 0.9 }, { enemyType: 'HUNTER', count: 7, delay: 0.7 }, { enemyType: 'ELITE', count: 3, delay: 1.5 }]),
      13: normal([{ enemyType: 'DRIFTER', count: 14, delay: 0.4 }, { enemyType: 'ELITE', count: 3, delay: 1.5 }, { enemyType: 'HUNTER', count: 8, delay: 0.6 }]),
      14: normal([{ enemyType: 'BOMBER', count: 5, delay: 0.8 }, { enemyType: 'ELITE', count: 4, delay: 1.3 }, { enemyType: 'HUNTER', count: 8, delay: 0.6 }]),
      15: boss('BOSS_PHANTOM', { repeatCount: 1 }),
      16: normal([{ enemyType: 'DRIFTER', count: 15, delay: 0.35 }, { enemyType: 'BOMBER', count: 5, delay: 0.75 }, { enemyType: 'HUNTER', count: 8, delay: 0.55 }, { enemyType: 'ELITE', count: 3, delay: 1.2 }]),
      17: normal([{ enemyType: 'DRIFTER', count: 12, delay: 0.35 }, { enemyType: 'HUNTER', count: 12, delay: 0.45 }, { enemyType: 'ELITE', count: 4, delay: 1.1 }]),
      18: normal([{ enemyType: 'BOMBER', count: 6, delay: 0.7 }, { enemyType: 'HUNTER', count: 10, delay: 0.5 }, { enemyType: 'ELITE', count: 4, delay: 1.0 }]),
      19: normal([{ enemyType: 'DRIFTER', count: 18, delay: 0.3 }, { enemyType: 'BOMBER', count: 6, delay: 0.65 }, { enemyType: 'ELITE', count: 5, delay: 0.95 }]),
      20: boss('BOSS_VOID', { options: { hp: 2400, bulletSpeed: 100, phaseThreshold: 1200 } }),
      21: normal([{ enemyType: 'HUNTER', count: 14, delay: 0.4 }, { enemyType: 'ELITE', count: 6, delay: 0.9 }, { enemyType: 'BOMBER', count: 6, delay: 0.7 }]),
      22: normal([{ enemyType: 'DRIFTER', count: 20, delay: 0.28 }, { enemyType: 'HUNTER', count: 12, delay: 0.42 }, { enemyType: 'ELITE', count: 6, delay: 0.85 }]),
      23: normal([{ enemyType: 'BOMBER', count: 8, delay: 0.55 }, { enemyType: 'HUNTER', count: 14, delay: 0.38 }, { enemyType: 'ELITE', count: 7, delay: 0.8 }]),
      24: normal([{ enemyType: 'HUNTER', count: 16, delay: 0.35 }, { enemyType: 'ELITE', count: 8, delay: 0.75 }, { enemyType: 'DRIFTER', count: 14, delay: 0.3 }]),
      25: boss('BOSS_TITAN', { options: { hp: 4500, fireInterval: 1.0 } }),
      26: normal([{ enemyType: 'ELITE', count: 8, delay: 0.6 }, { enemyType: 'HUNTER', count: 18, delay: 0.32 }, { enemyType: 'DRIFTER', count: 10, delay: 0.25 }]),
      27: normal([{ enemyType: 'ELITE', count: 9, delay: 0.55 }, { enemyType: 'HUNTER', count: 20, delay: 0.28 }, { enemyType: 'BOMBER', count: 7, delay: 0.52 }]),
      28: normal([{ enemyType: 'ELITE', count: 10, delay: 0.52 }, { enemyType: 'HUNTER', count: 22, delay: 0.26 }, { enemyType: 'DRIFTER', count: 12, delay: 0.24 }]),
      29: normal([{ enemyType: 'ELITE', count: 12, delay: 0.48 }, { enemyType: 'HUNTER', count: 24, delay: 0.24 }, { enemyType: 'BOMBER', count: 8, delay: 0.48 }]),
      30: boss('BOSS_PHANTOM', { repeatCount: 3 }),
    };

    return defs[n] || normal([{ enemyType: 'DRIFTER', count: 12, delay: 0.5 }]);
  }
}
