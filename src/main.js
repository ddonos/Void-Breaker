import { AudioManager } from './audio.js';
import { assets, AssetLoader } from './assets.js';
import { drawBossWarningOverlay, drawHud, drawPauseOverlay, drawWaveCompleteOverlay } from './hud.js';
import { consumeKey } from './input.js';
import { drawLeaderboard, InitialsEntry } from './leaderboard.js';
import { ParticleSystem, Crystal } from './particles.js';
import { Player } from './player.js';
import { PowerUp } from './powerups.js';
import { clearCanvas, drawBar, drawCircle, drawText, flashAlpha, ls, lx, ly } from './renderer.js';
import { loadSave, qualifiesForBoard, submitScore, writeSave } from './save.js';
import { ShopScreen, UPGRADES } from './shop.js';
import { BOSS_WAVES, COLORS, currentDifficulty, DIFFICULTIES, GAME_STATES, LOGICAL_H, LOGICAL_W, POWERUP_CAP, setCurrentDifficulty, TITLE, SCORE_VALUES } from './settings.js';
import { initTouchControls, isMobile, tapHandler, TapHandler, touchControls } from './touchcontrols.js';
import { explodeAt } from './utils.js';
import { WaveManager } from './waves.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
initTouchControls(canvas);
export { touchControls };
canvas.addEventListener('click', (event) => {
  if (!tapHandler) return;
  const dpr = window.devicePixelRatio || 1;
  const x = (event.clientX * dpr - window.OFFSET_X) / window.SCALE;
  const y = (event.clientY * dpr - window.OFFSET_Y) / window.SCALE;
  tapHandler.pendingTap = { x, y };
});
window.SCALE = 1;
window.OFFSET_X = 0;
window.OFFSET_Y = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const scaleX = window.innerWidth / LOGICAL_W;
  const scaleY = window.innerHeight / LOGICAL_H;

  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  window.SCALE = Math.min(scaleX, scaleY) * dpr;
  window.OFFSET_X = (canvas.width - LOGICAL_W * window.SCALE) / 2;
  window.OFFSET_Y = (canvas.height - LOGICAL_H * window.SCALE) / 2;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

export let currentState = GAME_STATES.MENU;
export function setState(nextState) {
  currentState = nextState;
  stateTime = 0;
}

const audioManager = new AudioManager();
const assetLoader = new AssetLoader();
window.addEventListener('keydown', () => audioManager.init(), { once: false });

let assetsReady = false;
assetLoader.loadAll().then(() => {
  assetsReady = true;
});

let saveData = loadSave();
let hiScore = getBestScoreForDifficulty();
let player = null;
let enemies = [];
let bullets = [];
let plasmaBolts = [];
let enemyBullets = [];
let crystals = [];
let powerUps = [];
let particles = new ParticleSystem();
let waveManager = new WaveManager();
let shop = new ShopScreen();
let initialsEntry = new InitialsEntry();
let stateTime = 0;
let worldTime = 0;
let currentWave = 0;
let bossWarningTimer = 0;
let pendingBossWave = 0;
let gameOverDelay = 0;
let latestScoreSignature = null;
let finalWaveReached = 0;
let victory = false;
let flashTimers = {};
let pauseSelection = 0;
let pauseConfirming = false;
let pausedFromState = GAME_STATES.PLAYING;
let waveReward = { crystals: 0, bonus: 0, wave: 0 };
let floatingTexts = [];
let drifterDeathTimes = [];
let difficultySelection = 1;
let areaEffects = [];
let shakeTimer = 0;
let shakeIntensity = 0;

export function triggerShake(duration, intensity) {
  shakeTimer = Math.max(shakeTimer, duration);
  shakeIntensity = Math.max(shakeIntensity, intensity);
}

const difficultyOrder = ['cadet', 'pilot', 'commander', 'voidlord'];

const starfield = createStarfield();
const backgroundPlanets = createBackgroundPlanets();

function createStarfield() {
  const stars = [];
  const addLayer = (count, size, speed, alpha) => {
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random() * LOGICAL_W,
        y: Math.random() * LOGICAL_H,
        speed,
        size,
        alpha,
      });
    }
  };
  addLayer(40, 2, 40, 0.4);
  addLayer(30, 2, 80, 0.6);
  addLayer(10, 6, 140, 0.9);
  return stars;
}

function createBackgroundPlanets() {
  return [
    { key: 'planet_blue', x: 1540, y: 180, speed: 3, alpha: 0.5, scale: 1.15 },
    { key: 'planet_red', x: 420, y: 640, speed: 4.5, alpha: 0.4, scale: 1.45 },
  ];
}

function updateStarfield(dt) {
  for (const star of starfield) {
    star.y += star.speed * dt;
    if (star.y > LOGICAL_H) {
      star.y = 0;
      star.x = Math.random() * LOGICAL_W;
    }
  }

  for (const planet of backgroundPlanets) {
    planet.y += planet.speed * dt;
    const image = assets[planet.key];
    const height = image ? image.height * planet.scale : 280 * planet.scale;
    if (planet.y - height / 2 > LOGICAL_H + 40) {
      planet.y = -height / 2;
    }
  }
}

function drawStarfield() {
  const sizeScale = Math.min(canvas.width / LOGICAL_W, canvas.height / LOGICAL_H);
  for (const star of starfield) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = COLORS.STAR;
    ctx.fillRect(
      (star.x / LOGICAL_W) * canvas.width,
      (star.y / LOGICAL_H) * canvas.height,
      star.size * sizeScale,
      star.size * sizeScale,
    );
  }
  ctx.globalAlpha = 1;
}

function drawBackgroundPlanets() {
  for (const planet of backgroundPlanets) {
    const image = assets[planet.key];
    if (image) {
      ctx.save();
      ctx.globalAlpha = planet.alpha;
      ctx.drawImage(
        image,
        lx(planet.x - (image.width * planet.scale) / 2),
        ly(planet.y - (image.height * planet.scale) / 2),
        ls(image.width * planet.scale),
        ls(image.height * planet.scale),
      );
      ctx.restore();
    } else {
      drawCircle(ctx, planet.x, planet.y, planet.key === 'planet_blue' ? 140 : 190, planet.key === 'planet_blue' ? '#224A8C' : '#7A241E', planet.alpha * 0.5);
    }
  }
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function startNewRun() {
  player = new Player();
  enemies = [];
  bullets = [];
  plasmaBolts = [];
  enemyBullets = [];
  crystals = [];
  powerUps = [];
  particles = new ParticleSystem();
  waveManager = new WaveManager();
  shop.reset();
  initialsEntry.reset();
  flashTimers = {};
  floatingTexts = [];
  drifterDeathTimes = [];
  areaEffects = [];
  shakeTimer = 0;
  shakeIntensity = 0;
  currentWave = 0;
  pendingBossWave = 0;
  bossWarningTimer = 0;
  finalWaveReached = 0;
  gameOverDelay = 1.5;
  victory = false;
  latestScoreSignature = null;
  pauseSelection = 0;
  pauseConfirming = false;
  worldTime = 0;
  waveReward = { crystals: 0, bonus: 0, wave: 0 };
  advanceToNextWave();
}

function beginWave(waveNumber) {
  currentWave = waveNumber;
  waveManager.startWave(waveNumber, enemies);
  waveReward = { crystals: 0, bonus: waveNumber * 200, wave: waveNumber };
  setState(GAME_STATES.PLAYING);
}

function advanceToNextWave() {
  const nextWave = currentWave + 1;
  if (nextWave > waveManager.maxWaves) {
    endRun(true);
    return;
  }
  if (BOSS_WAVES.has(nextWave)) {
    pendingBossWave = nextWave;
    bossWarningTimer = 3;
    audioManager.bossAlert();
    setState(GAME_STATES.BOSS_WARNING);
  } else {
    beginWave(nextWave);
  }
}

function endRun(didWin) {
  victory = didWin;
  finalWaveReached = currentWave;
  gameOverDelay = 1.5;
  setState(GAME_STATES.GAME_OVER);
}

function handleEnemyDeath(enemy) {
  particles.explode(enemy.x, enemy.y, enemy.isBoss ? COLORS.BOSS : COLORS.ENEMY);
  const crystalValues = getCrystalDropValues(enemy);
  crystalValues.forEach((value) => {
    crystals.push(new Crystal(enemy.x + (Math.random() - 0.5) * 48, enemy.y + (Math.random() - 0.5) * 48, value));
    waveReward.crystals += value;
  });

  if (!enemy.noRewards && enemy.hp <= 0) {
    player.score += Math.round((SCORE_VALUES[enemy.type] || 0) * player.multiplier);
    player.registerKill();
  }

  if (!enemy.noPowerUps) maybeDropPowerUps(enemy);

  if (enemy.isBoss && enemy.unlockKey) {
    saveData.unlocks[enemy.unlockKey] = true;
    writeSave(saveData);
  }

  if (enemy.isBoss) audioManager.explosion();
}

function spawnWaveClearBonus() {
  player.score += currentWave * 200;
}

function updatePlaying(dt) {
  const tap = tapHandler?.consume();
  if (tap && isPauseButtonTap(tap)) {
    pauseSelection = 0;
    pauseConfirming = false;
    pausedFromState = GAME_STATES.PLAYING;
    setState(GAME_STATES.PAUSED);
    return;
  }
  if (consumeKey('Escape')) {
    pauseSelection = 0;
    pauseConfirming = false;
    pausedFromState = GAME_STATES.PLAYING;
    setState(GAME_STATES.PAUSED);
    return;
  }
  if (touchControls?.active && touchControls.consumePause()) {
    tapHandler?.suppressNextTap();
    pauseSelection = 0;
    pauseConfirming = false;
    pausedFromState = GAME_STATES.PLAYING;
    setState(GAME_STATES.PAUSED);
    return;
  }

    waveManager.update(dt, enemies);
    worldTime += dt;
    updateStarfield(dt);
    player.update(dt, bullets, audioManager, plasmaBolts);
    particles.engineTrail(player.x, player.y + 32);
    const bossContext = { enemies, bullets, plasmaBolts, particles, handleEnemyDeath, triggerShake, addCenterText };
  
    for (const bullet of bullets) bullet.update(dt);
    for (const bolt of plasmaBolts) bolt.update(dt);
    for (const bullet of enemyBullets) bullet.update(dt, player);
    for (const enemy of enemies) {
      const result = enemy.update(dt, player, enemyBullets, bossContext);
      if (enemy.justEnraged) {
        enemy.justEnraged = false;
        particles.explode(enemy.x, enemy.y, COLORS.WARNING);
      particles.explode(enemy.x + 32, enemy.y - 20, '#FFD6A0');
      addCenterText('ENRAGED!', COLORS.WARNING, 1, 48);
    }
    if (enemy.type === 'BOSS_TITAN' && enemy.hp < enemy.maxHp * 0.5 && Math.random() < 0.25) {
      particles.emit(enemy.x + (Math.random() - 0.5) * 140, enemy.y - 40, {
        count: 1,
        colors: ['#D9D9D9', '#7B7B7B'],
        speed: [20, 50],
        size: [6, 10],
        lifetime: [0.35, 0.8],
      });
      }
      if (result === 'fired') audioManager.enemyShoot();
    }
    for (const enemy of enemies) enemy.affectPlayerProjectiles?.(bullets, plasmaBolts, player);
    for (const bullet of enemyBullets) {
      if (!bullet.pendingExplosion) continue;
      explodeAt(
        bullet.x,
        bullet.y,
        bullet.explosionRadius || 80,
        bullet.explosionDamage || 0,
        [],
        player,
        particles,
        areaEffects,
        { color: bullet.explosionColor || COLORS.BOSS },
      );
      if (bullet.sourceType?.includes('MORTAR') || bullet.sourceType?.includes('CARPET')) triggerShake(0.2, 5);
      bullet.pendingExplosion = false;
    }
  for (const crystal of crystals) crystal.update(dt, player, collectCrystal);
  for (const powerUp of powerUps) powerUp.update(dt, player, collectPowerUp);
  particles.update(dt);
  updateFloatingTexts(dt);
  drifterDeathTimes = drifterDeathTimes.filter((stamp) => worldTime - stamp <= 2);

  bullets = bullets.filter((bullet) => !bullet.dead);
  plasmaBolts = plasmaBolts.filter((bolt) => !bolt.dead);
  enemyBullets = enemyBullets.filter((bullet) => !bullet.dead);
  powerUps = powerUps.filter((powerUp) => !powerUp.dead);

    const playerBounds = player.getBounds();
  
    for (const bullet of bullets) {
      const bulletBounds = bullet.getBounds();
      let intercepted = false;
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        if (enemy.interceptPlayerProjectile?.(bullet)) {
          intercepted = true;
          break;
        }
      }
      if (intercepted || bullet.dead) continue;
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        if (rectOverlap(bulletBounds, enemy.getBounds())) {
        bullet.dead = true;
        enemy.takeDamage(getProjectileDamage(bullet) * player.getDamageMultiplier());
        particles.hit(bullet.x, bullet.y);
        if (enemy.dead) handleEnemyDeath(enemy);
        break;
      }
    }
  }
  
    for (const bolt of plasmaBolts) {
      const boltBounds = bolt.getBounds();
      let intercepted = false;
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        if (enemy.interceptPlayerProjectile?.(bolt)) {
          intercepted = true;
          break;
        }
      }
      if (intercepted || bolt.dead) continue;
      for (const enemy of enemies) {
        if (enemy.dead || bolt.hitIds.has(enemy.id)) continue;
        if (!rectOverlap(boltBounds, enemy.getBounds())) continue;
      bolt.hitIds.add(enemy.id);
      if (bolt.explodes) {
        triggerPlasmaExplosion(bolt.x, bolt.y, 60, 80);
        bolt.dead = true;
      } else {
        enemy.takeDamage(getProjectileDamage(bolt) * player.getDamageMultiplier());
        bolt.pierceCount -= 1;
        if (bolt.pierceCount <= 0) bolt.dead = true;
      }
      particles.explode(enemy.x, enemy.y, COLORS.BOSS);
      if (enemy.dead) handleEnemyDeath(enemy);
      if (bolt.dead) break;
    }
  }

  for (const bullet of enemyBullets) {
    if (bullet.dead) continue;
    if (rectOverlap(bullet.getBounds(), playerBounds)) {
      bullet.dead = true;
      if (player.takeDamage(getProjectileDamage(bullet))) {
        particles.hit(player.x, player.y);
        audioManager.hit();
      }
    }
  }

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (enemy.laser?.active && rectOverlap(enemy.laser.getBounds(), playerBounds)) {
        if (player.takeDamage(enemy.laser.damage * dt, { ignoreInvincible: true, grantInvincible: false })) {
          particles.hit(player.x, player.y);
      }
    }
    if (rectOverlap(enemy.getBounds(), playerBounds)) {
      if (player.takeDamage(enemy.damage * 1.2)) {
        particles.hit(player.x, player.y);
        audioManager.hit();
      }
        enemy.dead = true;
        if (enemy.hp > 0) handleEnemyDeath(enemy);
      }
      enemy.applyPlayerEffects?.(player, dt, { particles, triggerShake });
    }

  enemies = enemies.filter((enemy) => !enemy.dead);
  crystals = crystals.filter((crystal) => !crystal.dead);

  if (player.hp <= 0) {
    endRun(false);
    return;
  }

  if (waveManager.isWaveClear(enemies)) {
    spawnWaveClearBonus();
    waveReward.bonus = currentWave * 200;
    if (currentWave >= waveManager.maxWaves) {
      endRun(true);
    } else if (BOSS_WAVES.has(currentWave)) {
      advanceToNextWave();
    } else {
      setState(GAME_STATES.WAVE_COMPLETE);
    }
  }
}

function updateMenu() {
  const tap = tapHandler?.consume();
  if (tap || consumeKey('Enter')) {
    difficultySelection = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
    setState(GAME_STATES.DIFFICULTY);
  }
}

function updateDifficulty() {
  const tap = tapHandler?.consume();
  if (tap) {
    const rows = difficultyOrder.map((key, index) => ({
      id: key,
      x: 360,
      y: 290 + index * 162,
      w: 1200,
      h: 150,
    }));
    for (const row of rows) {
      if (TapHandler.hitRect(tap, row.x, row.y, row.w, row.h)) {
        setCurrentDifficulty(row.id);
        hiScore = getBestScoreForDifficulty();
        startNewRun();
        return;
      }
    }
    if (TapHandler.hitRect(tap, LOGICAL_W / 2 - 100, 950, 200, 60)) {
      setState(GAME_STATES.MENU);
      return;
    }
  }
  if (consumeKey('Escape')) {
    setState(GAME_STATES.MENU);
    return;
  }
  if (consumeKey('ArrowUp')) difficultySelection = (difficultySelection + difficultyOrder.length - 1) % difficultyOrder.length;
  if (consumeKey('ArrowDown')) difficultySelection = (difficultySelection + 1) % difficultyOrder.length;
  if (consumeKey('Enter')) {
    setCurrentDifficulty(difficultyOrder[difficultySelection]);
    hiScore = getBestScoreForDifficulty();
    startNewRun();
  }
}

function updateBossWarning(dt) {
  tapHandler?.consume();
  updateStarfield(dt);
  bossWarningTimer -= dt;
  if (bossWarningTimer <= 0) beginWave(pendingBossWave);
}

function updateShop() {
  const tap = tapHandler?.consume();
  if (consumeKey('Escape')) {
    pauseSelection = 0;
    pauseConfirming = false;
    pausedFromState = GAME_STATES.SHOP;
    setState(GAME_STATES.PAUSED);
    return;
  }
  const result = shop.update(player, audioManager, tap);
  if (result === 'continue') advanceToNextWave();
}

function updatePaused() {
  const tap = tapHandler?.consume();
  if (tap && isPauseButtonTap(tap)) {
    setState(pausedFromState);
    return;
  }
  const layout = getPauseLayoutForInput(getPauseState());
  const resumeRect = layout.resumeButton;
  const mainMenuRect = layout.mainMenuButton;
  if (pauseConfirming) {
    if (consumeKey('Escape')) {
      pauseConfirming = false;
      return;
    }
    if (TapHandler.hitRect(tap, layout.confirmYes.x, layout.confirmYes.y, layout.confirmYes.w, layout.confirmYes.h)) {
      player = null;
      currentWave = 0;
      setState(GAME_STATES.MENU);
      return;
    }
    if (TapHandler.hitRect(tap, layout.confirmNo.x, layout.confirmNo.y, layout.confirmNo.w, layout.confirmNo.h)) {
      pauseConfirming = false;
      return;
    }
    if (consumeKey('Enter')) {
      player = null;
      currentWave = 0;
      setState(GAME_STATES.MENU);
    }
    return;
  }

  if (consumeKey('Escape')) {
    setState(pausedFromState);
    return;
  }
  if (TapHandler.hitRect(tap, resumeRect.x, resumeRect.y, resumeRect.w, resumeRect.h)) {
    setState(pausedFromState);
    return;
  }
  if (TapHandler.hitRect(tap, mainMenuRect.x, mainMenuRect.y, mainMenuRect.w, mainMenuRect.h)) {
    pauseConfirming = true;
    return;
  }
  if (consumeKey('ArrowUp')) pauseSelection = (pauseSelection + 1) % 2 === 0 ? 0 : 1;
  if (consumeKey('ArrowDown')) pauseSelection = (pauseSelection + 1) % 2;
  if (consumeKey('Enter')) {
    if (pauseSelection === 0) setState(pausedFromState);
    else pauseConfirming = true;
  }
}

function updateWaveComplete(dt) {
  tapHandler?.consume();
  if (stateTime >= 3) {
    if (canOpenShop()) {
      shop.reset();
      setState(GAME_STATES.SHOP);
    } else {
      advanceToNextWave();
    }
  }
}

function updateGameOver(dt) {
  const tap = tapHandler?.consume();
  gameOverDelay -= dt;
  if (gameOverDelay > 0) return;
  if (TapHandler.hitRect(tap, LOGICAL_W / 2 - 160, 720, 320, 80)) {
    if (qualifiesForBoard(Math.round(player.score))) {
      initialsEntry.reset();
      setState(GAME_STATES.ENTER_INITIALS);
    } else {
      difficultySelection = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
      setState(GAME_STATES.DIFFICULTY);
    }
    return;
  }
  if (TapHandler.hitRect(tap, LOGICAL_W / 2 - 160, 820, 320, 80)) {
    if (qualifiesForBoard(Math.round(player.score))) {
      initialsEntry.reset();
      setState(GAME_STATES.ENTER_INITIALS);
    } else {
      player = null;
      currentWave = 0;
      setState(GAME_STATES.MENU);
    }
    return;
  }
  if (consumeKey('KeyR')) {
    if (qualifiesForBoard(Math.round(player.score))) {
      initialsEntry.reset();
      setState(GAME_STATES.ENTER_INITIALS);
    } else {
      difficultySelection = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
      setState(GAME_STATES.DIFFICULTY);
    }
  }
  if (consumeKey('Escape')) {
    if (qualifiesForBoard(Math.round(player.score))) {
      initialsEntry.reset();
      setState(GAME_STATES.ENTER_INITIALS);
    } else {
      player = null;
      currentWave = 0;
      setState(GAME_STATES.MENU);
    }
  }
}

function updateInitials() {
  const tap = tapHandler?.consume();
  if (initialsEntry.update(tap)) {
    const initials = initialsEntry.getInitials();
    const score = Math.round(player.score);
    submitScore(initials, score, finalWaveReached, currentDifficulty);
    saveData = loadSave();
    hiScore = getBestScoreForDifficulty();
    latestScoreSignature = `${initials}-${score}-${finalWaveReached}-${currentDifficulty}`;
    setState(GAME_STATES.LEADERBOARD);
  }
}

function updateLeaderboard() {
  const tap = tapHandler?.consume();
  if (TapHandler.hitRect(tap, 520, 948, 280, 70)) {
    difficultySelection = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
    setState(GAME_STATES.DIFFICULTY);
    return;
  }
  if (TapHandler.hitRect(tap, 1120, 948, 280, 70)) {
    player = null;
    currentWave = 0;
    setState(GAME_STATES.MENU);
    return;
  }
  if (consumeKey('Enter') || consumeKey('KeyR')) {
    difficultySelection = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
    setState(GAME_STATES.DIFFICULTY);
    return;
  }
  if (consumeKey('Escape')) {
    player = null;
    currentWave = 0;
    setState(GAME_STATES.MENU);
  }
}

function update(dt) {
  if (isPortraitMode()) return;
  if (!assetsReady) return;
  shakeTimer = Math.max(0, shakeTimer - dt);
  if (shakeTimer <= 0) shakeIntensity = 0;
  updateAreaEffects(dt);
  stateTime += dt;
  if ([GAME_STATES.MENU, GAME_STATES.DIFFICULTY, GAME_STATES.BOSS_WARNING, GAME_STATES.LEADERBOARD, GAME_STATES.ENTER_INITIALS].includes(currentState)) {
    updateStarfield(dt);
  }
  switch (currentState) {
    case GAME_STATES.MENU: updateMenu(); break;
    case GAME_STATES.DIFFICULTY: updateDifficulty(); break;
    case GAME_STATES.PLAYING: updatePlaying(dt); break;
    case GAME_STATES.PAUSED: updatePaused(); break;
    case GAME_STATES.SHOP: updateShop(); break;
    case GAME_STATES.WAVE_COMPLETE: updateWaveComplete(dt); break;
    case GAME_STATES.BOSS_WARNING: updateBossWarning(dt); break;
    case GAME_STATES.GAME_OVER: updateGameOver(dt); break;
    case GAME_STATES.LEADERBOARD: updateLeaderboard(); break;
    case GAME_STATES.ENTER_INITIALS: updateInitials(); break;
    default: break;
  }
}

function drawWorld() {
  drawAreaEffects();
  particles.draw(ctx);
  for (const crystal of crystals) crystal.draw(ctx);
  for (const bullet of bullets) bullet.draw(ctx);
  for (const bolt of plasmaBolts) bolt.draw(ctx);
  for (const bullet of enemyBullets) bullet.draw(ctx);
  for (const powerUp of powerUps) powerUp.draw(ctx, worldTime);
  for (const enemy of enemies) enemy.draw(ctx);
  if (player) player.draw(ctx, worldTime);
  for (const enemy of enemies) enemy.drawOverlay?.(ctx);
  drawFloatingTexts();
}

function drawMenu() {
  drawText(ctx, TITLE, LOGICAL_W / 2, 264, 80, COLORS.PLAYER, 'center');
  drawText(ctx, 'Wave Survival - 30 Levels - Endless Mode', LOGICAL_W / 2, 384, 28, COLORS.DIM, 'center');
  if (Math.floor(stateTime / 0.6) % 2 === 0) drawText(ctx, isMobile() ? 'TAP TO PLAY' : 'PRESS ENTER TO PLAY', LOGICAL_W / 2, 528, 36, COLORS.HUD, 'center');
  const best = saveData.hiScores[0];
  if (best) drawText(ctx, `BEST ${Math.round(best.score)} by ${best.initials}`, LOGICAL_W / 2, 640, 28, COLORS.CRYSTAL, 'center');
  if (isMobile()) drawText(ctx, 'TAP TO SELECT', LOGICAL_W / 2, 1000, 24, COLORS.DIM, 'center');
  else drawText(ctx, 'WASD: Move  SPACE: Shoot  SHIFT: Overdrive', LOGICAL_W / 2, 880, 24, COLORS.DIM, 'center');
}

function drawDifficultyScreen() {
  drawText(ctx, 'SELECT DIFFICULTY', LOGICAL_W / 2, 170, 64, COLORS.HUD, 'center');
  drawText(ctx, 'Choose your challenge', LOGICAL_W / 2, 236, 28, COLORS.DIM, 'center');

  let y = 290;
  difficultyOrder.forEach((key, index) => {
    const difficulty = DIFFICULTIES[key];
    const selected = index === difficultySelection;
    if (selected) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(lx(360), window.OFFSET_Y + y * window.SCALE, 1200 * window.SCALE, 150 * window.SCALE);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = selected ? difficulty.color : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = window.SCALE * 2;
    ctx.strokeRect(lx(360), window.OFFSET_Y + y * window.SCALE, 1200 * window.SCALE, 150 * window.SCALE);
    ctx.restore();

    const label = key === 'voidlord' ? '\u2620 VOID LORD' : difficulty.label;
    drawText(ctx, label, 420, y + 32, 36, selected ? difficulty.color : COLORS.DIM);
    drawText(ctx, `"${difficulty.subtitle}"`, 700, y + 32, 24, selected ? COLORS.HIGHLIGHT : COLORS.DIM);
    if (key === 'pilot') drawText(ctx, 'DEFAULT', 1490, y + 32, 22, COLORS.HIGHLIGHT, 'right');
    drawText(ctx, getDifficultyDetail(key), 420, y + 92, 26, selected ? COLORS.HUD : COLORS.DIM);
    y += 162;
  });

  if (isMobile()) {
    ctx.save();
    ctx.strokeStyle = COLORS.DIM;
    ctx.lineWidth = 2;
    ctx.strokeRect(window.OFFSET_X + (LOGICAL_W / 2 - 100) * window.SCALE, window.OFFSET_Y + 950 * window.SCALE, 200 * window.SCALE, 60 * window.SCALE);
    ctx.restore();
    drawText(ctx, '[ BACK ]', LOGICAL_W / 2, 966, 28, COLORS.DIM, 'center');
    drawText(ctx, 'TAP TO SELECT', LOGICAL_W / 2, 1040, 28, COLORS.DIM, 'center');
  } else {
    drawText(ctx, 'ENTER - Confirm    ESC - Back to Menu', LOGICAL_W / 2, 1040, 28, COLORS.DIM, 'center');
  }
}

function drawPlaying() {
  drawWorld();
  drawHud(ctx, player, currentWave, hiScore, worldTime, flashTimers, {
    powerBadges: getHudPowerBadges(),
    plasmaStatus: getPlasmaHudState(),
    difficultyBadge: getDifficultyBadge(),
  });
  touchControls?.draw(ctx, worldTime, player);
  const boss = enemies.find((enemy) => enemy.isBoss);
  if (boss) {
    drawBar(ctx, 480, 104, 960, 20, boss.hp, boss.maxHp, COLORS.BOSS, '#1a0b16', '#65331a');
    drawText(ctx, boss.type.replace('BOSS_', '').replace('_', ' '), LOGICAL_W / 2, 64, 28, COLORS.BOSS, 'center');
  }
}

function drawShop() {
  drawWorld();
  shop.draw(ctx, player);
}

function drawGameOver() {
  if (player) {
    drawWorld();
    flashAlpha(ctx, '#000000', 0.55);
  }
  drawText(ctx, victory ? 'VICTORY' : 'GAME OVER', LOGICAL_W / 2, 288, 72, victory ? COLORS.CRYSTAL : COLORS.WARNING, 'center');
  drawText(ctx, `WAVE ${finalWaveReached}`, LOGICAL_W / 2, 448, 36, COLORS.HUD, 'center');
  drawText(ctx, `SCORE ${Math.round(player?.score || 0)}`, LOGICAL_W / 2, 512, 36, COLORS.HUD, 'center');
  drawText(ctx, `CRYSTALS ${player?.crystals || 0}`, LOGICAL_W / 2, 576, 36, COLORS.CRYSTAL, 'center');
  if (player && qualifiesForBoard(Math.round(player.score))) drawText(ctx, 'NEW HIGH SCORE!', LOGICAL_W / 2, 680, 40, COLORS.CRYSTAL, 'center');
  if (isMobile()) {
    ctx.save();
    ctx.strokeStyle = COLORS.HP;
    ctx.lineWidth = ls(2);
    ctx.strokeRect(lx(LOGICAL_W / 2 - 160), ly(720), ls(320), ls(80));
    ctx.strokeStyle = COLORS.HUD;
    ctx.strokeRect(lx(LOGICAL_W / 2 - 160), ly(820), ls(320), ls(80));
    ctx.restore();
    drawText(ctx, 'PLAY AGAIN', LOGICAL_W / 2, 742, 32, gameOverDelay <= 0 ? COLORS.HP : '#555555', 'center');
    drawText(ctx, 'MAIN MENU', LOGICAL_W / 2, 842, 32, gameOverDelay <= 0 ? COLORS.HUD : '#555555', 'center');
    drawText(ctx, 'TAP TO SELECT', LOGICAL_W / 2, 944, 24, gameOverDelay <= 0 ? COLORS.DIM : '#555555', 'center');
  } else {
    drawText(ctx, 'R - Play Again    ESC - Main Menu', LOGICAL_W / 2, 912, 32, gameOverDelay <= 0 ? COLORS.DIM : '#555555', 'center');
  }
}

function draw() {
  clearCanvas(ctx, COLORS.BG);
  if (isPortraitMode()) {
    drawPortraitScreen();
    return;
  }
  if (!assetsReady) {
    drawLoadingScreen();
    return;
  }
  const shouldShake = shakeTimer > 0 && [GAME_STATES.PLAYING, GAME_STATES.PAUSED, GAME_STATES.SHOP, GAME_STATES.WAVE_COMPLETE, GAME_STATES.BOSS_WARNING, GAME_STATES.GAME_OVER].includes(currentState);
  if (shouldShake) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * 2 * shakeIntensity, (Math.random() - 0.5) * 2 * shakeIntensity);
  }
  drawStarfield();
  drawBackgroundPlanets();
  switch (currentState) {
    case GAME_STATES.MENU: drawMenu(); break;
    case GAME_STATES.DIFFICULTY: drawDifficultyScreen(); break;
    case GAME_STATES.PLAYING: drawPlaying(); break;
    case GAME_STATES.PAUSED:
      if (pausedFromState === GAME_STATES.SHOP) drawShop();
      else drawPlaying();
      drawPauseOverlay(ctx, getPauseState(), getPauseLayoutForInput(getPauseState()));
      break;
    case GAME_STATES.SHOP: drawShop(); break;
    case GAME_STATES.WAVE_COMPLETE:
      drawPlaying();
      drawWaveCompleteOverlay(ctx, waveReward, stateTime);
      break;
    case GAME_STATES.BOSS_WARNING: {
      drawPlaying();
      const info = getBossWarningInfo(pendingBossWave);
      drawBossWarningOverlay(ctx, stateTime, 'BOSS INCOMING', info.label, info.color);
      break;
    }
    case GAME_STATES.GAME_OVER: drawGameOver(); break;
      case GAME_STATES.LEADERBOARD: drawLeaderboard(ctx, saveData.hiScores, latestScoreSignature); break;
      case GAME_STATES.ENTER_INITIALS: initialsEntry.draw(ctx, player.score); break;
      default: break;
  }
  if (shouldShake) ctx.restore();
}

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.05);
  lastTime = timestamp;
  update(dt);
  draw(ctx);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

function drawLoadingScreen() {
  drawStarfield();
  drawText(ctx, 'LOADING ASSETS...', LOGICAL_W / 2, 430, 42, COLORS.HUD, 'center');
  drawBar(ctx, 660, 540, 600, 28, assetLoader.progress, 1, COLORS.PLAYER, '#111428', '#38406F');
  drawText(ctx, `${Math.round(assetLoader.progress * 100)}%`, LOGICAL_W / 2, 586, 28, COLORS.CRYSTAL, 'center');
}

function getCrystalDropValues(enemy) {
  if (enemy.noRewards) return [];
  const crystalMult = DIFFICULTIES[currentDifficulty].crystalMult;
  const scaleDrop = (value) => Math.max(1, Math.round(value * crystalMult));
  switch (enemy.type) {
    case 'DRIFTER': return [scaleDrop(5)];
    case 'BOMBER': return [scaleDrop(15)];
    case 'HUNTER': return [scaleDrop(12)];
    case 'ELITE': return [scaleDrop(15), scaleDrop(15)];
    case 'BOSS_VOID': return Array.from({ length: 5 }, () => scaleDrop(100));
    case 'BOSS_TITAN': return Array.from({ length: 8 }, () => scaleDrop(100));
    case 'BOSS_PHANTOM': {
      const total = 600 + 200 * (enemy.repeatCount || 1);
      return Array.from({ length: total / 100 }, () => scaleDrop(100));
    }
    default: return [scaleDrop(enemy.crystalReward || 5)];
  }
}

function maybeDropPowerUps(enemy) {
  if (enemy.noPowerUps) return;
  if (powerUps.length >= POWERUP_CAP) return;
  const dropMult = 0.8;
  let dropped = false;
  const spawn = (type) => {
    if (dropped || powerUps.length >= POWERUP_CAP) return false;
    powerUps.push(new PowerUp(enemy.x + (Math.random() - 0.5) * 36, enemy.y, type));
    dropped = true;
    return true;
  };

  if (enemy.type === 'DRIFTER') {
    drifterDeathTimes.push(worldTime);
    drifterDeathTimes = drifterDeathTimes.filter((stamp) => worldTime - stamp <= 2);
    if (drifterDeathTimes.length >= 3 && Math.random() < 0.06 * dropMult) return spawn('rapidfire');
  }

  if (enemy.isBoss) {
    spawn('heal');
    if (!dropped) spawn('nuke');
    return;
  }

  if ((enemy.type === 'BOMBER' || enemy.type === 'ELITE') && Math.random() < 0.03 * dropMult) return spawn('nuke');
  if ((enemy.type === 'HUNTER' || enemy.type === 'ELITE') && Math.random() < 0.05 * dropMult) return spawn('shield');
  if (Math.random() < 0.08 * dropMult) return spawn('heal');
  if (Math.random() < 0.04 * dropMult) return spawn('multiplier');
}

function collectPowerUp(powerUp) {
  const color = getPowerUpColor(powerUp.type);
  particles.emit(powerUp.x, powerUp.y, {
    count: 6,
    colors: [color, '#FFFFFF'],
    speed: [140, 280],
    size: [6, 12],
    lifetime: [0.18, 0.35],
  });
  switch (powerUp.type) {
    case 'heal': {
      const amount = Math.max(1, Math.round(player.maxHp * 0.10));
      player.hp = Math.min(player.maxHp, player.hp + amount);
      addFloatingText(powerUp.x, powerUp.y - 42, '+HP', COLORS.HP, 0.8, 26);
      break;
    }
    case 'nuke': {
      destroyAllEnemies();
      addFloatingText(powerUp.x, powerUp.y - 42, 'NUKE!', COLORS.BOSS, 0.8, 26);
      addCenterText('SCREEN CLEAR!', COLORS.BOSS, 1.5, 40);
      break;
    }
    case 'shield':
      player.tempShieldTimer = 5;
      addFloatingText(powerUp.x, powerUp.y - 42, 'SHIELD', COLORS.SHIELD, 0.8, 26);
      addCenterText('SHIELD 5s', COLORS.SHIELD, 1, 30);
      break;
    case 'rapidfire':
      player.rapidFireTimer = 8;
      addFloatingText(powerUp.x, powerUp.y - 42, 'RAPID', COLORS.BULLET, 0.8, 26);
      addCenterText('RAPID FIRE 8s', COLORS.BULLET, 1, 30);
      break;
    case 'multiplier':
      player.multiplier += 1;
      addFloatingText(powerUp.x, powerUp.y - 42, 'MULTI!', COLORS.BULLET, 0.8, 26);
      break;
    default:
      break;
  }
}

function collectCrystal(crystal) {
  particles.emit(crystal.x, crystal.y, {
    count: 6,
    colors: [COLORS.CRYSTAL, '#FFFFFF'],
    speed: [120, 240],
    size: [6, 10],
    lifetime: [0.18, 0.3],
  });
  addFloatingText(crystal.x, crystal.y - crystal.size * 0.7, `+${crystal.value} \u25C6`, COLORS.CRYSTAL, 0.8, 24);
}

function destroyAllEnemies() {
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    enemy.hp = 0;
    enemy.dead = true;
    handleEnemyDeath(enemy);
  }
  enemies = enemies.filter((enemy) => !enemy.dead);
  particles.explode(player.x, player.y - 120, COLORS.BOSS);
}

function triggerPlasmaExplosion(x, y, radius, damage) {
  particles.explode(x, y, COLORS.BOSS);
  particles.explode(x + 12, y - 6, '#FFD76A');
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist <= radius) {
      enemy.takeDamage(damage * player.getDamageMultiplier());
      if (enemy.dead) handleEnemyDeath(enemy);
    }
  }
}

function addFloatingText(x, y, text, color, life = 1, size = 24) {
  floatingTexts.push({ x, y, text, color, age: 0, life, size, center: false });
}

function addCenterText(text, color, life = 1, size = 28) {
  floatingTexts.push({ x: LOGICAL_W / 2, y: 900, text, color, age: 0, life, size, center: true });
}

function updateFloatingTexts(dt) {
  floatingTexts = floatingTexts
    .map((message) => ({ ...message, age: message.age + dt, y: message.center ? message.y : message.y - 24 * dt }))
    .filter((message) => message.age < message.life);
}

function updateAreaEffects(dt) {
  areaEffects = areaEffects
    .map((effect) => ({ ...effect, age: effect.age + dt }))
    .filter((effect) => effect.age < effect.duration);
}

function drawFloatingTexts() {
  floatingTexts.forEach((message) => {
    const alpha = 1 - message.age / message.life;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawText(ctx, message.text, message.x, message.y, message.size, message.color, 'center');
    ctx.restore();
  });
}

function drawAreaEffects() {
  areaEffects.forEach((effect) => {
    const alpha = 1 - effect.age / effect.duration;
    const radius = effect.radius * (effect.age / effect.duration);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = ls(5);
    ctx.beginPath();
    ctx.arc(lx(effect.x), ly(effect.y), ls(Math.max(10, radius)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function getHudPowerBadges() {
  const badges = [];
  if (player.tempShieldTimer > 0) badges.push({ label: `SHIELD ${player.tempShieldTimer.toFixed(1)}s`, color: COLORS.SHIELD });
  if (player.rapidFireTimer > 0) badges.push({ label: `RAPID ${player.rapidFireTimer.toFixed(1)}s`, color: COLORS.BULLET });
  return badges;
}

function getPlasmaHudState() {
  if (!player || player.plasmaCannonTier <= 0) return null;
  if (player.plasmaCooldown <= 0) return { text: '[ X ] PLASMA', color: COLORS.BOSS };
  return { text: `[ X ] ${player.plasmaCooldown.toFixed(1)}s`, color: COLORS.DIM };
}

function getDifficultyBadge() {
  if (currentDifficulty === 'pilot') return null;
  const difficulty = DIFFICULTIES[currentDifficulty];
  if (!difficulty) return null;
  return {
    text: currentDifficulty === 'voidlord' ? '\u2620 VOID LORD' : difficulty.label,
    color: difficulty.color,
  };
}

function getBestScoreForDifficulty() {
  return saveData.hiScores
    .filter((entry) => (entry.difficulty || 'pilot') === currentDifficulty)
    .reduce((best, entry) => Math.max(best, Math.round(entry.score || 0)), 0);
}

function getPowerUpColor(type) {
  switch (type) {
    case 'heal': return COLORS.HP;
    case 'nuke': return COLORS.BOSS;
    case 'shield': return COLORS.SHIELD;
    case 'rapidfire': return COLORS.BULLET;
    case 'multiplier': return '#FFD700';
    default: return COLORS.HUD;
  }
}

function getProjectileDamage(projectile) {
  const sourceMult = {
    PLAYER: 1,
    PLASMA: 1,
    BOMBER: 1.2,
    ELITE: 1.38,
    BOSS_VOID: 1.5,
    BOSS_TITAN: 1.62,
    BOSS_TITAN_TURRET: 1.32,
    BOSS_TITAN_MISSILE: 1.62,
    BOSS_TITAN_MORTAR: 1.62,
    BOSS_TITAN_CARPET: 1.62,
    BOSS_PHANTOM: 1.44,
    BOSS_PHANTOM_CLONE: 1.2,
  };
  return projectile.damage * (sourceMult[projectile.sourceType] || 1);
}

function getDifficultyDetail(key) {
  switch (key) {
    case 'cadet': return 'Enemies slower - More HP - Crystals x1.5';
    case 'commander': return 'Enemies faster - Less HP - Crystal drop -20%';
    case 'voidlord': return 'Maximum aggression - No mercy';
    default: return 'Balanced - as originally designed';
  }
}

function getPauseState() {
  const upgrades = UPGRADES
    .filter((upgrade) => (player.upgrades[upgrade.id] || 0) > 0)
    .map((upgrade) => {
      const tier = player.upgrades[upgrade.id];
      const pips = Array.from({ length: upgrade.maxTier }, (_, index) => (index < tier ? '\u25CF' : '\u25CB')).join('');
      return `[${pips}] ${upgrade.name} - Tier ${tier} / ${upgrade.maxTier}`;
    });
  return {
    upgrades,
    stats: [
      { left: `HP: ${Math.ceil(player.hp)} / ${player.maxHp}`, right: `Shield: ${Math.ceil(player.shield)} / ${player.maxShield}` },
      { left: `Damage: ${player.damage}`, right: `Fire Rate: ${(1 / player.fireRate).toFixed(1)}/sec` },
      { left: `Speed: ${player.speed}`, right: `Spread: ${player.getSpreadLabel()}` },
      { left: `Overdrive: ${player.hasOverdrive ? 'Unlocked' : 'Locked'}`, right: '' },
    ],
    menu: ['RESUME', 'MAIN MENU'],
    selection: pauseSelection,
    confirming: pauseConfirming,
  };
}

function getPauseLayoutForInput(pauseState) {
  const panelW = 860;
  const basePanelH = 640;
  const panelH = basePanelH;
  const panelX = LOGICAL_W / 2 - panelW / 2;
  const panelY = 540 - panelH / 2;
  const buttonY = panelY + panelH - 80;

  return {
    resumeButton: { x: panelX + 170, y: buttonY, w: 240, h: 60 },
    mainMenuButton: { x: panelX + 440, y: buttonY, w: 240, h: 60 },
    confirmYes: { x: LOGICAL_W / 2 - 170, y: buttonY + 3, w: 160, h: 55 },
    confirmNo: { x: LOGICAL_W / 2 + 10, y: buttonY + 3, w: 160, h: 55 },
  };
}

function isPauseButtonTap(tap) {
  const dx = tap.x - 60;
  const dy = tap.y - 55;
  return dx * dx + dy * dy <= 50 * 50;
}

function canOpenShop() {
  if (!player || player.crystals <= 0) return false;
  return UPGRADES.some((upgrade) => {
    const tier = player.upgrades[upgrade.id] || 0;
    if (tier >= upgrade.maxTier) return false;
    return player.crystals >= upgrade.costs[tier];
  });
}

function getBossWarningInfo(wave) {
  const bossType = waveManager.getWaveDefinition(wave).enemyType;
  switch (bossType) {
    case 'BOSS_VOID': return { label: 'VOID ENTITY APPROACHING', color: '#A064FF' };
    case 'BOSS_TITAN': return { label: 'TITAN DREADNOUGHT INCOMING', color: '#50A0FF' };
    case 'BOSS_PHANTOM': return { label: 'PHANTOM WRAITH EMERGING', color: '#50C8FF' };
    default: return { label: 'HOSTILE MASS DETECTED', color: COLORS.BOSS };
  }
}

function isPortraitMode() {
  return touchControls?.active && window.innerHeight > window.innerWidth;
}

function drawPortraitScreen() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const dpr = window.devicePixelRatio || 1;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.max(24, Math.round(30 * dpr))}px monospace`;
  ctx.fillText('Rotate your device to play', centerX, centerY - 90 * dpr);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, 3 * dpr);
  ctx.lineCap = 'round';

  const phoneW = 90 * dpr;
  const phoneH = 150 * dpr;
  const iconX = centerX;
  const iconY = centerY + 10 * dpr;

  ctx.save();
  ctx.translate(iconX, iconY);
  ctx.rotate(-Math.PI / 7);
  roundRectPath(ctx, -phoneW / 2, -phoneH / 2, phoneW, phoneH, 14 * dpr);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20 * dpr, phoneH / 2 + 26 * dpr);
  ctx.arc(0, phoneH / 2 + 26 * dpr, 30 * dpr, Math.PI, Math.PI * 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10 * dpr, phoneH / 2 + 2 * dpr);
  ctx.lineTo(28 * dpr, phoneH / 2 + 14 * dpr);
  ctx.lineTo(8 * dpr, phoneH / 2 + 24 * dpr);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}
