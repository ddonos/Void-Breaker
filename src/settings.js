export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;
export const FPS_TARGET = 60;
export const TITLE = 'VOID BREAKER';

export const COLORS = {
  BG: '#08061A',
  PLAYER: '#64DCFF',
  BULLET: '#FFF050',
  ENEMY: '#DC5050',
  ELITE: '#C850DC',
  BOSS: '#FF8C28',
  CRYSTAL: '#50DCA0',
  HUD: '#B4AAFF',
  HP: '#3CC878',
  SHIELD: '#50A0FF',
  XP: '#A064FF',
  STAR: '#FFFFFF',
  DIM: '#444444',
  HIGHLIGHT: '#FFFFFF',
  WARNING: '#FF4444',
};

export const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

export const GAME_STATES = {
  MENU: 'MENU',
  DIFFICULTY: 'DIFFICULTY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  SHOP: 'SHOP',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  BOSS_WARNING: 'BOSS_WARNING',
  GAME_OVER: 'GAME_OVER',
  LEADERBOARD: 'LEADERBOARD',
  ENTER_INITIALS: 'ENTER_INITIALS',
};

export const PLAYER_MARGIN = 32;
export const PLAYER_HIT_INVINCIBLE = 0.5;
export const SHIELD_REGEN_COOLDOWN = 3;
export const OVERDRIVE_COOLDOWN = 12;
export const OVERDRIVE_DAMAGE_MULT = 2;
export const PLASMA_COOLDOWN = 2.5;
export const MIN_WAVE_DURATION = 45;
export const SHOT_DAMAGE_MULT = 1.2;
export const ATTACKER_COUNT_MULT = 0.9;

export const SCORE_VALUES = {
  DRIFTER: 50,
  BOMBER: 120,
  HUNTER: 100,
  ELITE: 250,
  BOSS_VOID: 2000,
  BOSS_TITAN: 2000,
  BOSS_PHANTOM: 2000,
};

export const BOSS_WAVES = new Set([5, 10, 15, 20, 25, 30]);
export const INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const POWERUP_CAP = 3;

export const DIFFICULTIES = {
  cadet: {
    label: 'CADET',
    enemySpeedMult: 0.65,
    enemyHpMult: 0.7,
    enemyDamageMult: 0.6,
    enemyFireRateMult: 0.65,
    crystalMult: 1.5,
    playerHpMult: 1.3,
    spawnRateMult: 0.75,
    bossHpMult: 0.65,
    color: COLORS.HP,
    subtitle: 'Learning the ropes',
    detail: 'Enemies slower · More HP · Crystals ×1.5',
  },
  pilot: {
    label: 'PILOT',
    enemySpeedMult: 1,
    enemyHpMult: 1,
    enemyDamageMult: 1,
    enemyFireRateMult: 1,
    crystalMult: 1,
    playerHpMult: 1,
    spawnRateMult: 1,
    bossHpMult: 1,
    color: COLORS.HUD,
    subtitle: 'Standard challenge',
    detail: 'Balanced — as originally designed',
  },
  commander: {
    label: 'COMMANDER',
    enemySpeedMult: 1.35,
    enemyHpMult: 1.3,
    enemyDamageMult: 1.4,
    enemyFireRateMult: 1.4,
    crystalMult: 0.8,
    playerHpMult: 0.85,
    spawnRateMult: 1.25,
    bossHpMult: 1.4,
    color: COLORS.BOSS,
    subtitle: 'Now it gets serious',
    detail: 'Enemies faster · Less HP · Crystal drop -20%',
  },
  voidlord: {
    label: 'VOID LORD',
    enemySpeedMult: 1.75,
    enemyHpMult: 1.6,
    enemyDamageMult: 1.8,
    enemyFireRateMult: 1.8,
    crystalMult: 0.6,
    playerHpMult: 0.7,
    spawnRateMult: 1.6,
    bossHpMult: 1.8,
    eliteShieldRegen: true,
    bossEnrageAt: 0.4,
    noInvincibilityFrames: true,
    color: COLORS.ENEMY,
    subtitle: 'Pure punishment',
    detail: 'Maximum aggression · No mercy',
  },
};

export let currentDifficulty = 'pilot';

export function setCurrentDifficulty(nextDifficulty) {
  currentDifficulty = DIFFICULTIES[nextDifficulty] ? nextDifficulty : 'pilot';
}

export function getCurrentDifficultyConfig() {
  return DIFFICULTIES[currentDifficulty] || DIFFICULTIES.pilot;
}
