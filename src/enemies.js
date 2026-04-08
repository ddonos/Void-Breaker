import { COLORS, currentDifficulty, getCurrentDifficultyConfig, LOGICAL_H, LOGICAL_W } from './settings.js';
import { assets } from './assets.js';
import { clamp, drawBar, drawCircle, drawImageCentered, drawPolygon, drawText, ls, lx, ly, strokeArc, withTransform } from './renderer.js';
import { EnemyBullet, HomingMissile, LaserBeam, MortarProjectile, SpectralBolt, VoidPulseRing } from './projectiles.js';

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

let enemyId = 1;

export class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.id = enemyId;
    enemyId += 1;
    this.type = type;
    this.hp = 10;
    this.maxHp = 10;
    this.speed = 20;
    this.damage = 10;
    this.xpReward = 1;
    this.crystalReward = 1;
    this.dead = false;
    this.fireTimer = 0;
    this.w = 32;
    this.h = 32;
    this.isBoss = false;
    this.time = 0;
    this.enraged = false;
    this.enrageFlash = 0;
    this.justEnraged = false;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.dead = true;
  }

  update(dt, _player, _enemyBullets) {
    this.time += dt;
  }

  draw(_ctx) {}

  drawOverlay(_ctx) {}

  interceptPlayerProjectile(_projectile) {
    return false;
  }

  affectPlayerProjectiles(_bullets, _plasmaBolts, _player) {}

  applyPlayerEffects(_player, _dt, _context) {}

  getBounds() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
}

export class Drifter extends Enemy {
  constructor(x, y) {
    super(x, y, 'DRIFTER');
    this.w = 32;
    this.h = 32;
    this.hp = 40;
    this.maxHp = 40;
    this.speed = 200;
    this.damage = 30;
    this.xpReward = 8;
    this.crystalReward = 5;
    this.spawnX = x;
  }

  update(dt) {
    this.time += dt;
    this.y += this.speed * dt;
    this.x = this.spawnX + Math.sin(this.time * 2) * 60;
    if (this.y > LOGICAL_H + 80) this.dead = true;
  }

  draw(ctx) {
    if (drawImageCentered(ctx, assets.enemy_drifter, this.x, this.y, 80, 80)) return;
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = COLORS.ENEMY;
      localCtx.strokeStyle = '#7E1D1D';
      localCtx.lineWidth = 2;
      localCtx.beginPath();
      localCtx.moveTo(0, this.h / 2);
      localCtx.lineTo(-this.w / 2, -this.h / 3);
      localCtx.lineTo(this.w / 2, -this.h / 3);
      localCtx.closePath();
      localCtx.fill();
      localCtx.stroke();
      localCtx.fillStyle = '#FBD7D7';
      localCtx.beginPath();
      localCtx.arc(0, -this.h * 0.1, this.w * 0.15, 0, Math.PI * 2);
      localCtx.fill();
      localCtx.fillStyle = '#AA2F2F';
      localCtx.fillRect(-this.w * 0.45, -this.h * 0.12, 6, 12);
      localCtx.fillRect(this.w * 0.45 - 6, -this.h * 0.12, 6, 12);
    });
  }
}

export class Bomber extends Enemy {
  constructor(x, y) {
    super(x, y, 'BOMBER');
    this.w = 56;
    this.h = 40;
    this.hp = 80;
    this.maxHp = 80;
    this.speed = 100;
    this.damage = 48;
    this.xpReward = 15;
    this.crystalReward = 15;
    this.fireTimer = 2.2;
  }

  update(dt, player, enemyBullets) {
    this.time += dt;
    this.y += this.speed * dt;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      const base = angleTo(this.x, this.y, player.x, player.y);
      [-20, 0, 20].forEach((deg) => enemyBullets.push(new EnemyBullet(this.x, this.y + 24, base + deg * Math.PI / 180, 18, '#B47840', 440, 'BOMBER')));
      this.fireTimer = 3;
      return 'fired';
    }
    if (this.y > LOGICAL_H + 80) this.dead = true;
    return null;
  }

  draw(ctx) {
    if (drawImageCentered(ctx, assets.enemy_bomber, this.x, this.y, 96, 96)) return;
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = '#B47840';
      localCtx.beginPath();
      roundHull(localCtx, -this.w / 2, -this.h * 0.3, this.w, this.h * 0.6, 12);
      localCtx.fill();
      localCtx.fillRect(-this.w * 0.65, -6, 12, 18);
      localCtx.fillRect(this.w * 0.65 - 12, -6, 12, 18);
      localCtx.fillStyle = '#F2C58A';
      localCtx.beginPath();
      localCtx.ellipse(0, -4, 10, 8, 0, 0, Math.PI * 2);
      localCtx.fill();
      localCtx.fillStyle = '#FF9A40';
      localCtx.fillRect(-12, -this.h * 0.45, 10, 6);
      localCtx.fillRect(2, -this.h * 0.45, 10, 6);
    });
  }
}

export class Hunter extends Enemy {
  constructor(x, y) {
    super(x, y, 'HUNTER');
    this.w = 40;
    this.h = 48;
    this.hp = 60;
    this.maxHp = 60;
    this.speed = 280;
    this.damage = 36;
    this.xpReward = 12;
    this.crystalReward = 12;
    this.directionAngle = Math.PI / 2;
    this.retargetTimer = 0;
  }

  update(dt, player) {
    this.time += dt;
    this.retargetTimer -= dt;
    if (this.retargetTimer <= 0) {
      this.directionAngle = angleTo(this.x, this.y, player.x, player.y);
      this.retargetTimer = 0.5;
    }
    this.x += Math.cos(this.directionAngle) * this.speed * dt;
    this.y += Math.sin(this.directionAngle) * this.speed * dt;
    if (this.y > LOGICAL_H + 112 || this.x < -120 || this.x > LOGICAL_W + 120) this.dead = true;
  }

  draw(ctx) {
    if (drawImageCentered(ctx, assets.enemy_hunter, this.x, this.y, 96, 96, { rotation: this.directionAngle + Math.PI / 2 })) return;
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = '#DC3C8C';
      localCtx.beginPath();
      localCtx.moveTo(0, -24);
      localCtx.lineTo(-10, 12);
      localCtx.lineTo(0, 20);
      localCtx.lineTo(10, 12);
      localCtx.closePath();
      localCtx.fill();
      localCtx.beginPath();
      localCtx.moveTo(-18, 10);
      localCtx.lineTo(-4, 2);
      localCtx.lineTo(-2, 16);
      localCtx.closePath();
      localCtx.fill();
      localCtx.beginPath();
      localCtx.moveTo(18, 10);
      localCtx.lineTo(4, 2);
      localCtx.lineTo(2, 16);
      localCtx.closePath();
      localCtx.fill();
      localCtx.fillStyle = '#FF9AC6';
      localCtx.fillRect(-3, 18, 6, 12);
    }, { rotation: this.directionAngle + Math.PI / 2 });
  }
}

export class Elite extends Enemy {
  constructor(x, y) {
    super(x, y, 'ELITE');
    this.w = 48;
    this.h = 48;
    this.hp = 150;
    this.maxHp = 150;
    this.speed = 140;
    this.damage = 60;
    this.xpReward = 25;
    this.crystalReward = 30;
    this.shieldHp = 50;
    this.hasShield = true;
    this.fireTimer = 1.2;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
  }

  takeDamage(amount) {
    if (this.hasShield) {
      this.shieldHp -= amount;
      if (this.shieldHp <= 0) {
        this.hasShield = false;
        this.hp += this.shieldHp;
      }
      if (this.hp <= 0) this.dead = true;
      return;
    }
    super.takeDamage(amount);
  }

  update(dt, player, enemyBullets) {
    const difficulty = getCurrentDifficultyConfig();
    this.time += dt;
    this.fireTimer -= dt;
    this.enrageFlash = Math.max(0, this.enrageFlash - dt);
    if (difficulty.eliteShieldRegen && this.hasShield) this.shieldHp = Math.min(50, this.shieldHp + 5 * dt);
    if (this.y < 240) {
      this.y += this.speed * dt;
    } else {
      this.x += this.strafeDir * this.speed * dt;
      if (this.x < 80 || this.x > LOGICAL_W - 80) this.strafeDir *= -1;
    }
    if (this.fireTimer <= 0) {
      enemyBullets.push(new EnemyBullet(this.x, this.y + 28, angleTo(this.x, this.y, player.x, player.y), 24, COLORS.ELITE, 500, 'ELITE'));
      this.fireTimer = 2;
      return 'fired';
    }
    return null;
  }

  draw(ctx) {
    const drewSprite = drawImageCentered(ctx, assets.enemy_elite, this.x, this.y, 120, 120);
    if (!drewSprite) {
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = '#8832C8';
      localCtx.beginPath();
      localCtx.moveTo(-20, -24);
      localCtx.lineTo(20, -24);
      localCtx.lineTo(28, -12);
      localCtx.lineTo(28, 16);
      localCtx.lineTo(12, 24);
      localCtx.lineTo(-12, 24);
      localCtx.lineTo(-28, 16);
      localCtx.lineTo(-28, -12);
      localCtx.closePath();
      localCtx.fill();
      localCtx.fillStyle = '#6A239C';
      localCtx.beginPath();
      localCtx.moveTo(-32, 2);
      localCtx.lineTo(-12, -6);
      localCtx.lineTo(-10, 16);
      localCtx.closePath();
      localCtx.fill();
      localCtx.beginPath();
      localCtx.moveTo(32, 2);
      localCtx.lineTo(12, -6);
      localCtx.lineTo(10, 16);
      localCtx.closePath();
      localCtx.fill();
      localCtx.fillRect(-4, -28, 8, 10);
      localCtx.strokeStyle = '#5B1F84';
      localCtx.lineWidth = 1.5;
      localCtx.strokeRect(-18, -14, 36, 28);
      localCtx.beginPath();
      localCtx.moveTo(-18, 0);
      localCtx.lineTo(18, 0);
      localCtx.moveTo(0, -14);
      localCtx.lineTo(0, 14);
      localCtx.stroke();
    });
    }
    if (this.hasShield) strokeArc(ctx, this.x, this.y, 42, 0, Math.PI * 2, 'rgba(80,160,255,0.7)', 3);
  }
}

export class BossVoid extends Enemy {
  constructor(x, y, options = {}) {
    super(x, y, 'BOSS_VOID');
    const bossTier = options.bossTier ?? 1;
    const hpScale = Math.pow(1.5, bossTier - 1);
    this.w = 160;
    this.h = 144;
    this.hp = Math.round((options.hp ?? 2000) * hpScale);
    this.maxHp = this.hp;
    this.speed = 80;
    this.damage = 84;
    this.xpReward = 200;
    this.crystalReward = 500;
    this.isBoss = true;
    this.fireTimer = 1.4;
    this.phaseThreshold = options.phaseThreshold ?? 1000;
    this.bulletSpeed = options.bulletSpeed ?? 80;
    this.laser = new LaserBeam(this.x, this.y + 72, 8, LOGICAL_H, 120, 1, 140);
    this.laserWindow = 0;
    this.strafeDir = 1;
    this.unlockKey = 'skin1';
  }

  update(dt, _player, enemyBullets) {
    updateBossEnrage(this, dt);
    this.time += dt;
    if (this.y < 240) this.y += this.speed * dt;
    else {
      this.x += this.strafeDir * 72 * dt;
      if (this.x < 280 || this.x > LOGICAL_W - 280) this.strafeDir *= -1;
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      for (let i = 0; i < 12; i += 1) {
        const angle = this.time + i * (Math.PI * 2 / 12);
        enemyBullets.push(new EnemyBullet(this.x, this.y + 40, angle, 22, COLORS.BOSS, this.bulletSpeed * 4, 'BOSS_VOID'));
      }
      this.fireTimer = 2;
      if (this.hp <= this.phaseThreshold) this.laserWindow = 1.6;
      return 'fired';
    }

    if (this.hp <= this.phaseThreshold) {
      this.laserWindow = Math.max(0, this.laserWindow - dt);
      this.laser.active = this.laserWindow > 0;
      this.laser.x = this.laser.x || this.x;
      this.laser.y = this.y + 48;
      this.laser.update(dt);
    } else {
      this.laser.active = false;
    }
    return null;
  }

  draw(ctx) {
    const phase2 = this.hp <= this.phaseThreshold;
    const flash = this.enrageFlash > 0 ? this.enrageFlash / 0.5 : 0;
    if (!drawImageCentered(ctx, assets.boss_void, this.x, this.y, 256, 256, { alpha: flash > 0 ? 0.8 + flash * 0.2 : 1 })) {
      withTransform(ctx, this.x, this.y, (localCtx) => {
      const offsets = [0, 0.8, 1.7, 2.3, 3.4, 4.2, 5.1, 5.8];
      localCtx.strokeStyle = flash > 0 ? '#FF4B4B' : '#6A28C8';
      localCtx.lineWidth = 2;
      localCtx.fillStyle = flash > 0 ? '#2A0830' : '#1A0840';
      localCtx.beginPath();
      offsets.forEach((offset, index) => {
        const angle = (Math.PI * 2 * index) / offsets.length;
        const radius = 54 + Math.sin(this.time * 1.5 + offset) * 10 + (index % 2 === 0 ? 10 : -6);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius * 0.8;
        if (index === 0) localCtx.moveTo(px, py);
        else {
          const prevAngle = (Math.PI * 2 * (index - 1)) / offsets.length;
          const prevRadius = 54 + Math.sin(this.time * 1.5 + offsets[index - 1]) * 10 + ((index - 1) % 2 === 0 ? 10 : -6);
          const cx1 = Math.cos(prevAngle + 0.2) * prevRadius * 1.1;
          const cy1 = Math.sin(prevAngle + 0.2) * prevRadius * 0.7;
          const cx2 = Math.cos(angle - 0.2) * radius * 1.1;
          const cy2 = Math.sin(angle - 0.2) * radius * 0.7;
          localCtx.bezierCurveTo(cx1, cy1, cx2, cy2, px, py);
        }
      });
      localCtx.closePath();
      localCtx.fill();
      localCtx.stroke();

      localCtx.strokeStyle = phase2 || flash > 0 ? '#B32020' : '#4A1890';
      localCtx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        const wobble = Math.sin(this.time * 2 + i) * 12;
        localCtx.beginPath();
        localCtx.moveTo(Math.cos(angle) * 38, Math.sin(angle) * 26);
        localCtx.quadraticCurveTo(
          Math.cos(angle) * (74 + wobble),
          Math.sin(angle) * (70 + wobble * 0.6),
          Math.cos(angle) * (92 + wobble),
          Math.sin(angle) * (90 + wobble),
        );
        localCtx.stroke();
      }

      localCtx.fillStyle = '#F8F8F8';
      localCtx.beginPath();
      localCtx.ellipse(0, -18, 18, 12, 0, 0, Math.PI * 2);
      localCtx.fill();
      localCtx.fillStyle = '#C82727';
      localCtx.beginPath();
      localCtx.ellipse(0, -18, 9, 9, 0, 0, Math.PI * 2);
      localCtx.fill();
      localCtx.fillStyle = '#121212';
      localCtx.beginPath();
      localCtx.arc(Math.sin(this.time * 1.5) * 2, -18, 4, 0, Math.PI * 2);
      localCtx.fill();

      if (phase2) {
        localCtx.strokeStyle = '#FF6A4A';
        localCtx.lineWidth = 2;
        for (let i = 0; i < 5; i += 1) {
          localCtx.beginPath();
          localCtx.moveTo(-26 + i * 12, 10 + (i % 2) * 6);
          localCtx.lineTo(-10 + i * 10, 22 - (i % 2) * 5);
          localCtx.stroke();
        }
      }
      });
      const pulse = 28 + Math.sin(this.time * 5) * 5;
      drawCircle(ctx, this.x, this.y, pulse, '#FF6400', 0.9);
      drawCircle(ctx, this.x, this.y, pulse / 2, '#FFDD00', 0.95);
    }
    this.laser.draw(ctx);
  }
}

export class BossTitan extends Enemy {
  constructor(x, y, options = {}) {
    super(x, y, 'BOSS_TITAN');
    const bossTier = options.bossTier ?? 1;
    const hpScale = Math.pow(1.5, bossTier - 1);
    this.w = 192;
    this.h = 112;
    this.hp = Math.round((options.hp ?? 3500) * hpScale);
    this.maxHp = this.hp;
    this.speed = 72;
    this.damage = 108;
    this.xpReward = 300;
    this.crystalReward = 800;
    this.isBoss = true;
    this.fireTimer = 1.0;
    this.fireInterval = options.fireInterval ?? 1.5;
    this.strafeDir = 1;
    this.unlockKey = 'skin2';
  }

  update(dt, player, enemyBullets) {
    updateBossEnrage(this, dt);
    this.time += dt;
    if (this.y < 220) this.y += this.speed * dt;
    else {
      this.x += this.strafeDir * 88 * dt;
      if (this.x < 328 || this.x > LOGICAL_W - 328) this.strafeDir *= -1;
    }
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      enemyBullets.push(new EnemyBullet(this.x, this.y + 32, angleTo(this.x, this.y, player.x, player.y), 26, COLORS.BOSS, 520, 'BOSS_TITAN'));
      enemyBullets.push(new EnemyBullet(this.x - 80, this.y, Math.PI * 0.75, 18, '#78C0FF', 460, 'BOSS_TITAN_TURRET'));
      enemyBullets.push(new EnemyBullet(this.x + 80, this.y, Math.PI * 0.25, 18, '#78C0FF', 460, 'BOSS_TITAN_TURRET'));
      this.fireTimer = this.fireInterval;
      return 'fired';
    }
    return null;
  }

  draw(ctx) {
    const damaged = this.hp <= this.maxHp * 0.5;
    const flash = this.enrageFlash > 0 ? this.enrageFlash / 0.5 : 0;
    if (!drawImageCentered(ctx, assets.boss_titan, this.x, this.y, 256, 256, { alpha: flash > 0 ? 0.8 + flash * 0.2 : 1 })) {
      withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = flash > 0 ? '#341010' : '#0A1828';
      localCtx.beginPath();
      localCtx.moveTo(-96, -40);
      localCtx.lineTo(96, -40);
      localCtx.lineTo(112, -20);
      localCtx.lineTo(112, 36);
      localCtx.lineTo(90, 56);
      localCtx.lineTo(-90, 56);
      localCtx.lineTo(-112, 36);
      localCtx.lineTo(-112, -20);
      localCtx.closePath();
      localCtx.fill();

      localCtx.fillStyle = flash > 0 ? '#4A1818' : '#142438';
      localCtx.fillRect(-88, -30, 176, 72);
      localCtx.fillStyle = '#22344C';
      for (let i = 0; i < 5; i += 1) localCtx.fillRect(-72 + i * 32, -18 + (i % 2) * 18, 22, 10);

      localCtx.fillStyle = '#203245';
      localCtx.fillRect(-20, -64, 40, 24);

      localCtx.fillStyle = '#1A2230';
      localCtx.beginPath();
      roundHull(localCtx, -128, -24, 44, 42, 10);
      localCtx.fill();
      localCtx.beginPath();
      roundHull(localCtx, 84, -24, 44, 42, 10);
      localCtx.fill();
      localCtx.fillRect(-156, -8, 30, 8);
      localCtx.fillRect(126, -8, 30, 8);

      const engineColors = damaged && Math.floor(this.time * 10) % 2 === 0
        ? ['#FF6A28', '#4FAEFF', '#FF6A28', '#4FAEFF']
        : ['#FF9A28', '#4FAEFF', '#FF9A28', '#4FAEFF'];
      engineColors.forEach((color, index) => {
        localCtx.fillStyle = color;
        localCtx.fillRect(-48 + index * 28, 56, 18, 10);
      });

      if (damaged) {
        localCtx.strokeStyle = 'rgba(200,200,200,0.8)';
        localCtx.lineWidth = 2;
        for (let i = 0; i < 3; i += 1) {
          localCtx.beginPath();
          localCtx.moveTo(-30 + i * 30, -36);
          localCtx.lineTo(-24 + i * 30, -60);
          localCtx.stroke();
        }
      }
      });
    }
  }
}

export class BossPhantom extends Enemy {
  constructor(x, y, options = {}) {
    super(x, y, 'BOSS_PHANTOM');
    const repeatCount = options.repeatCount ?? 1;
    const bossTier = options.bossTier ?? 1;
    const hpScale = Math.pow(1.5, bossTier - 1);
    this.repeatCount = repeatCount;
    this.w = 144;
    this.h = 144;
    this.hp = Math.round(((options.hp ?? 2500) + 500 * Math.max(0, repeatCount - 1)) * hpScale);
    this.maxHp = this.hp;
    this.speed = 80;
    this.damage = 102;
    this.xpReward = 260 + 40 * repeatCount;
    this.crystalReward = 600 + 200 * repeatCount;
    this.isBoss = true;
    this.teleportTimer = 2.4;
    this.flashTimer = 0;
    this.echoes = [];
  }

  update(dt, _player, enemyBullets) {
    updateBossEnrage(this, dt);
    this.time += dt;
    if (this.y < 260) this.y += this.speed * dt;
    this.teleportTimer -= dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.echoes = this.echoes
      .map((echo) => ({ ...echo, age: echo.age + dt }))
      .filter((echo) => echo.age < 0.7);
    if (this.teleportTimer <= 0) {
      this.echoes.unshift({ x: this.x, y: this.y, age: 0 });
      this.x = 200 + Math.random() * (LOGICAL_W - 400);
      this.flashTimer = 0.25;
      for (let i = 0; i < 16; i += 1) {
        enemyBullets.push(new EnemyBullet(this.x, this.y, i * (Math.PI * 2 / 16), 24, '#50C8FF', 280, 'BOSS_PHANTOM'));
      }
      this.teleportTimer = 4;
      return 'fired';
    }
    return null;
  }

  draw(ctx) {
    if (assets.boss_phantom) {
      this.echoes.forEach((echo, index) => {
        const alpha = Math.max(0, 0.25 - echo.age * 0.25) * (1 - index * 0.15);
        drawImageCentered(ctx, assets.boss_phantom, echo.x, echo.y, 256, 256, { alpha });
      });
      drawImageCentered(ctx, assets.boss_phantom, this.x, this.y, 256, 256, {
        alpha: this.flashTimer > 0 ? 1 : 0.88,
        rotation: Math.sin(this.time * 0.4) * 0.05,
      });
      if (this.flashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = this.flashTimer / 0.25;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = ls(4);
        ctx.beginPath();
        ctx.arc(lx(this.x), ly(this.y), ls(90 + (1 - this.flashTimer / 0.25) * 90), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    this.echoes.forEach((echo, index) => {
      const alpha = Math.max(0, 0.25 - echo.age * 0.25) * (1 - index * 0.15);
      drawPhantomShape(ctx, echo.x, echo.y, this.time - echo.age * 2, alpha);
    });
    drawPhantomShape(ctx, this.x, this.y, this.time, this.flashTimer > 0 ? 1 : 0.75, this.enrageFlash > 0 ? this.enrageFlash / 0.5 : 0);
    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashTimer / 0.25;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = ls(4);
      ctx.beginPath();
      ctx.arc(lx(this.x), ly(this.y), ls(90 + (1 - this.flashTimer / 0.25) * 90), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function makeSizedBullet(x, y, angle, damage, color, speed, sourceType, size = 12) {
  const bullet = new EnemyBullet(x, y, angle, damage, color, speed, sourceType);
  bullet.w = size;
  bullet.h = size;
  return bullet;
}

function distanceToBeam(px, py, ox, oy, angle, length) {
  const dx = px - ox;
  const dy = py - oy;
  const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
  if (proj < 0 || proj > length) return Infinity;
  return Math.abs(-Math.sin(angle) * dx + Math.cos(angle) * dy);
}

function phaseRoman(phase) {
  return ['I', 'II', 'III', 'IV'][phase - 1] || 'I';
}

class TitanDefenseOrb {
  constructor(angle) {
    this.angle = angle;
    this.hp = 3;
    this.radius = 120;
    this.flash = 0;
    this.x = 0;
    this.y = 0;
    this.dead = false;
  }
}

class PhantomClone extends Enemy {
  constructor(x, y, driftSeed = Math.random() * Math.PI * 2) {
    super(x, y, 'PHANTOM_CLONE');
    this.w = 72;
    this.h = 72;
    this.hp = 150;
    this.maxHp = 150;
    this.life = 8;
    this.driftSeed = driftSeed;
    this.fireTimer = currentDifficulty === 'voidlord' ? 1.5 : 3;
    this.noRewards = true;
    this.noPowerUps = true;
  }

  update(dt, player, enemyBullets) {
    this.time += dt;
    this.life -= dt;
    this.x += Math.sin(this.time * 1.8 + this.driftSeed) * 34 * dt;
    this.y += Math.cos(this.time * 1.3 + this.driftSeed) * 24 * dt;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      enemyBullets.push(new SpectralBolt(this.x, this.y, angleTo(this.x, this.y, player.x, player.y), 24, 260, 'BOSS_PHANTOM_CLONE'));
      this.fireTimer = currentDifficulty === 'voidlord' ? 1.5 : 3;
      return 'fired';
    }
    if (this.life <= 0) this.dead = true;
    return null;
  }

  draw(ctx) {
    if (assets.boss_phantom) drawImageCentered(ctx, assets.boss_phantom, this.x, this.y, 196, 196, { alpha: 0.6 });
    else drawPhantomShape(ctx, this.x, this.y, this.time, 0.6);
    drawBar(ctx, this.x - 30, this.y - 64, 60, 6, this.hp, this.maxHp, '#C878FF', '#140D20', '#4A3477');
  }
}

class MiniPhantom extends Enemy {
  constructor(x, y, angle) {
    super(x, y, 'MINI_PHANTOM');
    this.w = 20;
    this.h = 20;
    this.hp = 80;
    this.maxHp = 80;
    this.damage = 60;
    this.age = 0;
    this.spiralAngle = angle;
    this.noRewards = true;
    this.noPowerUps = true;
  }

  update(dt, player) {
    this.time += dt;
    this.age += dt;
    if (this.age < 1.5) {
      this.spiralAngle += 3 * dt;
      this.x += Math.cos(this.spiralAngle) * 300 * dt;
      this.y += Math.sin(this.spiralAngle) * 300 * dt;
    } else {
      const angle = angleTo(this.x, this.y, player.x, player.y);
      this.x += Math.cos(angle) * 220 * dt;
      this.y += Math.sin(angle) * 220 * dt;
    }
    if (this.x < -60 || this.x > LOGICAL_W + 60 || this.y < -60 || this.y > LOGICAL_H + 60) this.dead = true;
  }

  draw(ctx) {
    if (assets.boss_phantom) drawImageCentered(ctx, assets.boss_phantom, this.x, this.y, 64, 64, { alpha: 0.9 });
    else drawPhantomShape(ctx, this.x, this.y, this.time, 0.9);
  }
}

export class OverhauledBossTitan extends Enemy {
  constructor(x, y, options = {}) {
    super(x, y, 'BOSS_TITAN');
    const hpScale = Math.pow(1.5, (options.bossTier ?? 1) - 1);
    this.w = 192;
    this.h = 112;
    this.hp = Math.round((options.hp ?? 3500) * hpScale);
    this.maxHp = this.hp;
    this.damage = 108;
    this.xpReward = 300;
    this.crystalReward = 800;
    this.isBoss = true;
    this.unlockKey = 'skin2';
    this.phase = 1;
    this.transitionLock = 0;
    this.dualTurretTimer = 1;
    this.mainCannonTimer = 1.8;
    this.mainBurstRemaining = 0;
    this.mainBurstDelay = 0;
    this.mortarTimer = 3.2;
    this.missileTimer = 4.2;
    this.missileBurstRemaining = 0;
    this.missileBurstDelay = 0;
    this.empTimer = 5.5;
    this.empCharge = 0;
    this.empRingRadius = 0;
    this.carpetTimer = 7.5;
    this.strafeDir = 1;
    this.movementCycle = 0;
    this.jitterTimer = 0;
    this.jitterX = 0;
    this.jitterY = 0;
    this.orbs = [];
    this.finalEnrage = false;
  }

  getPhase() {
    const ratio = this.hp / this.maxHp;
    if (ratio > 0.66) return 1;
    if (ratio > 0.33) return 2;
    return 3;
  }

  speedMult(value) {
    return value * getCurrentDifficultyConfig().enemySpeedMult;
  }

  damageMult(value) {
    return value * getCurrentDifficultyConfig().enemyDamageMult;
  }

  rate(base) {
    const difficulty = getCurrentDifficultyConfig();
    return base / difficulty.enemyFireRateMult / (this.finalEnrage ? 2 : 1);
  }

  enterPhase(phase, context) {
    this.phase = phase;
    context.triggerShake(0.5, 8);
    if (phase === 2) {
      this.transitionLock = 1.5;
      if (!this.orbs.length) this.orbs = [0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle) => new TitanDefenseOrb(angle));
    }
    if (phase === 3) context.addCenterText('CRITICAL SYSTEMS', COLORS.WARNING, 1, 48);
  }

  updateOrbs(dt) {
    this.orbs = this.orbs.filter((orb) => !orb.dead);
    this.orbs.forEach((orb) => {
      orb.angle += Math.PI / 2 * dt;
      orb.flash = Math.max(0, orb.flash - dt);
      orb.x = this.x + Math.cos(orb.angle) * orb.radius;
      orb.y = this.y + Math.sin(orb.angle) * orb.radius;
    });
  }

  launchTurrets(player, enemyBullets) {
    const speed = this.speedMult(320);
    [[this.x - 80, this.y - 6], [this.x + 80, this.y - 6]].forEach(([tx, ty]) => {
      const base = angleTo(tx, ty, player.x, player.y);
      [-8, 8].forEach((deg) => enemyBullets.push(makeSizedBullet(tx, ty, base + deg * Math.PI / 180, this.damageMult(24), '#7DB8FF', speed, 'BOSS_TITAN_TURRET')));
    });
  }

  launchMainBurst(player, enemyBullets, count) {
    enemyBullets.push(makeSizedBullet(this.x, this.y + 28, angleTo(this.x, this.y, player.x, player.y), this.damageMult(38), '#FFD08A', this.speedMult(380), 'BOSS_TITAN', 18));
    this.mainBurstRemaining = count - 1;
    this.mainBurstDelay = 0.12;
  }

  launchMortars(enemyBullets, count, speed, damage, radius, targetY = LOGICAL_H - 100) {
    const spread = count === 1 ? [0] : Array.from({ length: count }, (_, index) => -35 + (70 * index) / (count - 1));
    spread.forEach((deg) => enemyBullets.push(new MortarProjectile(
      this.x,
      this.y + 36,
      Math.PI / 2 + deg * Math.PI / 180,
      damage,
      '#A84C12',
      this.speedMult(speed),
      'BOSS_TITAN_MORTAR',
      { targetY, lifetime: 4, explosionRadius: radius, explosionColor: '#C86428' },
    )));
  }

  update(dt, player, enemyBullets, context) {
    this.time += dt;
    if (this.y < 220) {
      this.y += 160 * dt;
      this.updateOrbs(dt);
      return null;
    }

    const nextPhase = this.getPhase();
    if (nextPhase !== this.phase) this.enterPhase(nextPhase, context);
    if (!this.finalEnrage && this.hp <= this.maxHp * 0.15) {
      this.finalEnrage = true;
      this.dualTurretTimer *= 0.5;
      this.mainCannonTimer *= 0.5;
      this.mortarTimer *= 0.5;
      this.missileTimer *= 0.5;
      this.empTimer *= 0.5;
      this.carpetTimer *= 0.5;
      context.addCenterText('ENRAGED', COLORS.WARNING, 1, 44);
      context.triggerShake(0.5, 8);
    }

    this.updateOrbs(dt);
    if (this.transitionLock > 0) {
      this.transitionLock = Math.max(0, this.transitionLock - dt);
      return null;
    }

    if (this.phase === 1) {
      this.x += this.strafeDir * (this.finalEnrage ? 320 : 120) * dt;
      if (this.x < 100 || this.x > 1820) this.strafeDir *= -1;
    } else if (this.phase === 2) {
      this.movementCycle = (this.movementCycle + dt) % 7;
      if (this.movementCycle < 4) this.y = Math.min(420, this.y + 40 * dt);
      else this.y += (80 - this.y) * dt;
    } else {
      this.x += this.strafeDir * (this.finalEnrage ? 320 : 240) * dt;
      if (this.x < 100 || this.x > 1820) this.strafeDir *= -1;
      this.jitterTimer -= dt;
      if (this.jitterTimer <= 0) {
        this.jitterTimer = 0.3;
        this.jitterX = (Math.random() - 0.5) * 30;
        this.jitterY = (Math.random() - 0.5) * 30;
      }
      this.x = clamp(this.x + this.jitterX * dt, 100, 1820);
      this.y = clamp(this.y + this.jitterY * dt, 80, 340);
    }

    if (this.hp < this.maxHp * 0.5) context.particles.emit(this.x + (Math.random() - 0.5) * 120, this.y - 12, { count: 2, colors: ['#B8B8B8', '#5A5A5A'], speed: [20, 60], size: [6, 12], lifetime: [0.8, 1.5] });
    if (this.hp < this.maxHp * 0.2) context.particles.emit(this.x + (Math.random() - 0.5) * 90, this.y + 24, { count: 1, colors: ['#FF8C28', '#FFD85A'], speed: [80, 140], size: [6, 12], lifetime: [0.3, 0.6] });

    this.dualTurretTimer -= dt;
    if (this.dualTurretTimer <= 0) {
      this.launchTurrets(player, enemyBullets);
      this.dualTurretTimer = this.rate(this.phase === 1 ? 1.8 : 1.2);
    }

    this.mainCannonTimer -= dt;
    if (this.mainCannonTimer <= 0) {
      this.launchMainBurst(player, enemyBullets, this.phase === 1 ? 3 : 4);
      this.mainCannonTimer = this.rate(this.phase === 1 ? 3.5 : 2.5);
    }
    if (this.mainBurstRemaining > 0) {
      this.mainBurstDelay -= dt;
      if (this.mainBurstDelay <= 0) {
        enemyBullets.push(makeSizedBullet(this.x, this.y + 28, angleTo(this.x, this.y, player.x, player.y), this.damageMult(38), '#FFD08A', this.speedMult(380), 'BOSS_TITAN', 18));
        this.mainBurstRemaining -= 1;
        this.mainBurstDelay = 0.12;
      }
    }

    this.mortarTimer -= dt;
    if (this.mortarTimer <= 0) {
      this.launchMortars(enemyBullets, this.phase === 1 ? 5 : 7, 140, this.damageMult(60), 80);
      this.mortarTimer = this.rate(this.phase === 1 ? 5 : 3.5);
    }

    if (this.phase >= 2) {
      this.missileTimer -= dt;
      if (this.missileTimer <= 0) {
        this.missileBurstRemaining = currentDifficulty === 'voidlord' ? 8 : 6;
        this.missileBurstDelay = 0;
        this.missileTimer = this.rate(currentDifficulty === 'cadet' ? 10 : 6);
      }
      if (this.missileBurstRemaining > 0) {
        this.missileBurstDelay -= dt;
        if (this.missileBurstDelay <= 0) {
          const angle = this.missileBurstRemaining % 2 === 0 ? -Math.PI * 0.25 : Math.PI * 1.25;
          enemyBullets.push(new HomingMissile(this.x + (this.missileBurstRemaining % 2 === 0 ? -70 : 70), this.y - 14, angle, this.damageMult(80), 'BOSS_TITAN_MISSILE'));
          this.missileBurstRemaining -= 1;
          this.missileBurstDelay = 0.4;
        }
      }
    }

    if (this.phase >= 3 && currentDifficulty !== 'cadet') {
      this.empTimer -= dt;
      if (this.empTimer <= 0 && this.empCharge <= 0) {
        this.empCharge = 1.5;
        this.empRingRadius = 0;
        this.empTimer = this.rate(8);
      }
      if (this.empCharge > 0) {
        this.empCharge = Math.max(0, this.empCharge - dt);
        this.empRingRadius = 300 * (1 - this.empCharge / 1.5);
        if (this.empCharge <= 0) {
          context.bullets.forEach((bullet) => { bullet.dead = true; });
          context.plasmaBolts.forEach((bolt) => { bolt.dead = true; });
          player.empSlowTimer = Math.max(player.empSlowTimer || 0, 3);
          context.triggerShake(0.2, 5);
        }
      }
    }

    if (this.phase >= 3 && currentDifficulty !== 'cadet') {
      this.carpetTimer -= dt;
      if (this.carpetTimer <= 0) {
        for (let i = 0; i < 12; i += 1) {
          const x = 80 + (1760 * i) / 11;
          enemyBullets.push(new MortarProjectile(x, this.y + 12, Math.PI / 2, this.damageMult(80), '#9A3E14', this.speedMult(200), 'BOSS_TITAN_CARPET', { targetY: 900, lifetime: 5, explosionRadius: 100, explosionColor: '#FF7A32' }));
        }
        this.carpetTimer = this.rate(currentDifficulty === 'voidlord' ? 6 : 10);
      }
    }

    return this.mainBurstRemaining > 0 || this.missileBurstRemaining > 0 || this.empCharge > 0 ? 'fired' : null;
  }

  interceptPlayerProjectile(projectile) {
    for (const orb of this.orbs) {
      if (orb.dead) continue;
      if (Math.hypot(projectile.x - orb.x, projectile.y - orb.y) <= 18 + Math.max(projectile.w, projectile.h) * 0.5) {
        projectile.dead = true;
        orb.flash = 0.18;
        orb.hp -= 1;
        if (orb.hp <= 0) orb.dead = true;
        return true;
      }
    }
    return false;
  }

  applyPlayerEffects(player, _dt, context) {
    this.orbs.forEach((orb) => {
      if (orb.dead) return;
      if (Math.hypot(player.x - orb.x, player.y - orb.y) <= 42) {
        if (player.takeDamage(this.damageMult(50))) context.particles.hit(player.x, player.y);
      }
    });
  }

  draw(ctx) {
    if (!drawImageCentered(ctx, assets.boss_titan, this.x, this.y, 256, 256)) {
      drawTitanFallback(ctx, this, 0);
    }
    this.orbs.forEach((orb) => {
      if (orb.dead) return;
      drawCircle(ctx, orb.x, orb.y, 16, orb.flash > 0 ? '#FFFFFF' : '#7E93AC', 1);
      strokeArc(ctx, orb.x, orb.y, 16, 0, Math.PI * 2, orb.flash > 0 ? '#FFFFFF' : '#AFC8E8', 2);
    });
    if (this.transitionLock > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 22) * 0.15;
      ctx.strokeStyle = '#FF8C28';
      ctx.lineWidth = ls(5);
      ctx.strokeRect(lx(this.x - 148), ly(this.y - 100), ls(296), ls(200));
      ctx.restore();
    }
    if (this.empCharge > 0) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = ls(4);
      ctx.beginPath();
      ctx.arc(lx(this.x), ly(this.y), ls(Math.max(40, this.empRingRadius)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawText(ctx, 'EMP!', this.x, this.y - 170, 32, '#FFFFFF', 'center');
    }
    if (this.finalEnrage) drawText(ctx, 'ENRAGED', this.x, this.y - 156, 26, COLORS.WARNING, 'center');
  }
}

export class OverhauledBossPhantom extends Enemy {
  constructor(x, y, options = {}) {
    super(x, y, 'BOSS_PHANTOM');
    const repeatCount = options.repeatCount ?? 1;
    const hpScale = Math.pow(1.5, (options.bossTier ?? 1) - 1);
    this.repeatCount = repeatCount;
    this.w = 144; this.h = 144;
    this.hp = Math.round(((options.hp ?? 2500) + 500 * Math.max(0, repeatCount - 1)) * hpScale);
    this.maxHp = this.hp;
    this.damage = 102;
    this.xpReward = 260 + 40 * repeatCount;
    this.crystalReward = 600 + 200 * repeatCount;
    this.isBoss = true;
    this.phase = 1;
    this.teleportTimer = 2.2;
    this.vanishTimer = 0;
    this.flashTimer = 0;
    this.echoes = [];
    this.spectralTimer = 1.2;
    this.spectralBurstRemaining = 0;
    this.spectralBurstDelay = 0;
    this.cloneTimer = 6;
    this.riftTimer = 7;
    this.rifts = [];
    this.nextRiftId = 1;
    this.pulseTimer = 3;
    this.pulses = [];
    this.formScale = 1;
    this.finalForm = false;
    this.finalEnrage = false;
    this.collapseActive = false;
    this.collapseTimer = 0;
    this.collapseTotal = 0;
    this.pendingTeleportTarget = { x, y };
    this.spawnedSwarm = false;
  }

  getPhase() {
    const ratio = this.hp / this.maxHp;
    if (ratio > 0.7) return 1;
    if (ratio > 0.4) return 2;
    if (ratio > 0.15) return 3;
    return 4;
  }

  speedMult(value) { return value * getCurrentDifficultyConfig().enemySpeedMult; }
  damageMult(value) { return value * getCurrentDifficultyConfig().enemyDamageMult; }
  rate(base) { return base / getCurrentDifficultyConfig().enemyFireRateMult; }

  enterPhase(phase, context) {
    this.phase = phase;
    if (phase === 3) context.addCenterText('PHASE 3 - UNRAVELING', COLORS.WARNING, 1, 42);
    if (phase === 4) {
      this.finalForm = true;
      this.formScale = 1.4;
      if (!this.spawnedSwarm) {
        this.spawnedSwarm = true;
        for (let i = 0; i < 8; i += 1) context.enemies.push(new MiniPhantom(this.x, this.y, i * (Math.PI * 2 / 8)));
      }
    }
  }

  chooseTeleportTarget(player) {
    if (this.phase >= 3 && Math.random() < 0.4) return { x: clamp(player.x + (Math.random() - 0.5) * 160, 200, 1720), y: clamp(player.y + 200, 60, 800) };
    return { x: 200 + Math.random() * 1520, y: 60 + Math.random() * 240 };
  }

  burst(enemyBullets) {
    const count = this.finalEnrage ? 32 : this.phase === 1 ? 16 : this.phase === 2 ? 20 : 24;
    for (let i = 0; i < count; i += 1) enemyBullets.push(new EnemyBullet(this.x, this.y, i * (Math.PI * 2 / count), this.damageMult(24), '#50C8FF', this.speedMult(180), 'BOSS_PHANTOM'));
  }

  update(dt, player, enemyBullets, context) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.echoes = this.echoes.map((echo) => ({ ...echo, age: echo.age + dt })).filter((echo) => echo.age < 0.5);
    this.pulses.forEach((pulse) => pulse.update(dt));
    this.pulses = this.pulses.filter((pulse) => !pulse.dead);
    this.rifts.forEach((rift) => {
      rift.age += dt;
      rift.shimmer -= dt;
      rift.playerCooldown = Math.max(0, rift.playerCooldown - dt);
      if (rift.shimmer <= 0) {
        rift.shimmer = 0.1;
        rift.points = Array.from({ length: 12 }, (_, index) => ({ x: rift.x + (Math.random() - 0.5) * 22, y: rift.y1 + ((rift.y2 - rift.y1) * index) / 11 }));
      }
    });
    const nextPhase = this.getPhase();
    if (nextPhase !== this.phase) this.enterPhase(nextPhase, context);
    if (!this.finalEnrage && this.hp <= this.maxHp * 0.08) this.finalEnrage = true;
    if (!this.collapseActive && this.hp <= this.maxHp * 0.05) {
      this.collapseActive = true;
      this.collapseTotal = currentDifficulty === 'cadet' ? 4 : 3;
      this.collapseTimer = this.collapseTotal;
      context.triggerShake(2, 20);
    }
    if (this.collapseActive) {
      this.collapseTimer = Math.max(0, this.collapseTimer - dt);
      this.formScale = 1.4 + (1 - this.collapseTimer / this.collapseTotal) * 1.6;
      if (this.collapseTimer <= 0 && !this.dead) {
        if (currentDifficulty === 'voidlord' && player.hp < 250) player.hp = 0;
        context.enemies.filter((enemy) => !enemy.dead && enemy.id !== this.id).forEach((enemy) => { enemy.hp = 0; enemy.dead = true; context.handleEnemyDeath(enemy); });
        this.dead = true;
        context.handleEnemyDeath(this);
      }
      return null;
    }
    if (this.y < 260) this.y += 120 * dt;
    if (this.vanishTimer > 0) {
      this.vanishTimer = Math.max(0, this.vanishTimer - dt);
      if (this.vanishTimer <= 0) {
        this.echoes.unshift({ x: this.x, y: this.y, age: 0 });
        this.x = this.pendingTeleportTarget.x;
        this.y = this.pendingTeleportTarget.y;
        this.flashTimer = 0.3;
        this.burst(enemyBullets);
      }
    } else if (this.phase === 1) {
      this.x = 960 + Math.sin(this.time * (Math.PI / 2)) * 200;
      this.y = 200 + Math.sin(this.time * (Math.PI / 1.25)) * 40;
    } else if (this.phase === 2) {
      const angle = angleTo(this.x, this.y, player.x, player.y);
      this.x += Math.cos(angle) * 60 * dt;
      this.y += Math.sin(angle) * 60 * dt;
    }
    this.teleportTimer -= dt;
    if (this.teleportTimer <= 0 && this.vanishTimer <= 0) {
      this.vanishTimer = 0.4;
      this.pendingTeleportTarget = this.chooseTeleportTarget(player);
      this.teleportTimer = this.finalEnrage ? 0.8 : this.phase === 1 ? this.rate(3.5) : this.phase === 2 ? this.rate(2.5) : this.rate(1.8);
    }
    this.spectralTimer -= dt;
    if (this.spectralTimer <= 0 && this.vanishTimer <= 0) {
      enemyBullets.push(new SpectralBolt(this.x, this.y, angleTo(this.x, this.y, player.x, player.y), this.damageMult(30), this.speedMult(280), 'BOSS_PHANTOM'));
      this.spectralBurstRemaining = this.phase >= 2 ? 1 : 0;
      this.spectralBurstDelay = 0.2;
      this.spectralTimer = this.phase === 1 ? this.rate(2.5) : this.phase === 2 ? this.rate(1.8) : this.rate(1.4);
    }
    if (this.spectralBurstRemaining > 0) {
      this.spectralBurstDelay -= dt;
      if (this.spectralBurstDelay <= 0) {
        enemyBullets.push(new SpectralBolt(this.x, this.y, angleTo(this.x, this.y, player.x, player.y), this.damageMult(30), this.speedMult(280), 'BOSS_PHANTOM'));
        this.spectralBurstRemaining -= 1;
        this.spectralBurstDelay = 0.2;
      }
    }
    if (this.phase >= 2) {
      this.cloneTimer -= dt;
      if (this.cloneTimer <= 0) {
        const existing = context.enemies.filter((enemy) => enemy.type === 'PHANTOM_CLONE' && !enemy.dead).length;
        const target = this.phase >= 3 ? 3 : 2;
        const allowed = currentDifficulty === 'cadet' && this.phase === 2 ? 0 : target;
        for (let i = existing; i < allowed; i += 1) context.enemies.push(new PhantomClone(this.x + (Math.random() - 0.5) * 180, this.y + (Math.random() - 0.5) * 90));
        this.cloneTimer = this.phase >= 3 ? this.rate(7) : this.rate(9);
      }
    }
    if (this.phase >= 3) {
      this.riftTimer -= dt;
      if (this.riftTimer <= 0) {
        this.rifts.push({ id: this.nextRiftId, x: 300 + Math.random() * 1320, y1: 240, y2: 840, age: 0, duration: currentDifficulty === 'cadet' ? 2 : 4, shimmer: 0, playerCooldown: 0, points: [], collapsed: false });
        this.nextRiftId += 1;
        this.riftTimer = this.rate(12);
      }
      this.pulseTimer -= dt;
      if (this.pulseTimer <= 0) {
        if (this.pulses.length < 2) this.pulses.push(new VoidPulseRing(this.x, this.y, 600, 800, this.damageMult(90)));
        this.pulseTimer = this.rate(6);
      }
    }
    this.rifts = this.rifts.filter((rift) => {
      if (rift.age < rift.duration) return true;
      if (!rift.collapsed) {
        rift.collapsed = true;
        for (let i = 0; i < 8; i += 1) {
          const y = rift.y1 + ((rift.y2 - rift.y1) * i) / 7;
          enemyBullets.push(makeSizedBullet(rift.x, y, 0, this.damageMult(22), '#C878FF', this.speedMult(280), 'BOSS_PHANTOM'));
          enemyBullets.push(makeSizedBullet(rift.x, y, Math.PI, this.damageMult(22), '#C878FF', this.speedMult(280), 'BOSS_PHANTOM'));
        }
      }
      return false;
    });
    return this.flashTimer > 0 ? 'fired' : null;
  }

  affectPlayerProjectiles(bullets, plasmaBolts, player) {
    const projectiles = [...bullets, ...plasmaBolts];
    this.rifts.forEach((rift) => {
      projectiles.forEach((projectile) => {
        if (projectile.dead) return;
        if (projectile.y < rift.y1 - 20 || projectile.y > rift.y2 + 20) return;
        if ((projectile.prevX - rift.x) * (projectile.x - rift.x) > 0) return;
        projectile._riftHits = projectile._riftHits || new Set();
        if (projectile._riftHits.has(rift.id)) return;
        projectile._riftHits.add(rift.id);
        projectile.vx *= -1;
        projectile.angle = Math.atan2(projectile.vy, projectile.vx);
      });
      if (currentDifficulty === 'voidlord' && rift.playerCooldown <= 0 && Math.abs(player.x - rift.x) < 18 && player.y > rift.y1 && player.y < rift.y2) {
        player.takeDamage(30);
        rift.playerCooldown = 0.5;
      }
    });
  }

  applyPlayerEffects(player, _dt, context) {
    this.pulses.forEach((pulse) => {
      if (!pulse.checkPlayer(player)) return;
      if (player.takeDamage(pulse.damage)) {
        const dx = player.x - pulse.x;
        const dy = player.y - pulse.y;
        const len = Math.hypot(dx, dy) || 1;
        player.x = clamp(player.x + (dx / len) * 150, 40, LOGICAL_W - 40);
        player.y = clamp(player.y + (dy / len) * 150, 40, LOGICAL_H - 40);
        context.triggerShake(0.2, 5);
      }
    });
  }

  draw(ctx) {
    this.echoes.forEach((echo, index) => {
      const alpha = Math.max(0, 0.28 - echo.age * 0.5) * (1 - index * 0.12);
      if (assets.boss_phantom) drawImageCentered(ctx, assets.boss_phantom, echo.x, echo.y, 256 * this.formScale, 256 * this.formScale, { alpha });
      else drawPhantomShape(ctx, echo.x, echo.y, this.time - echo.age * 2, alpha);
    });
    if (assets.boss_phantom) drawImageCentered(ctx, assets.boss_phantom, this.x, this.y, 256 * this.formScale, 256 * this.formScale, { alpha: this.vanishTimer > 0 ? 0.2 + this.vanishTimer * 0.5 : 0.9, rotation: Math.sin(this.time * 0.4) * 0.05 });
    else drawPhantomShape(ctx, this.x, this.y, this.time, this.vanishTimer > 0 ? 0.3 : 0.8, this.phase >= 3 ? 0.5 : 0);
    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashTimer / 0.3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = ls(4);
      ctx.beginPath();
      ctx.arc(lx(this.x), ly(this.y), ls(80 + (1 - this.flashTimer / 0.3) * 80), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    this.rifts.forEach((rift) => drawRealityTear(ctx, rift));
    this.pulses.forEach((pulse) => pulse.draw(ctx));
    drawText(ctx, phaseRoman(this.phase), this.x, this.y - 138, 24, this.phase === 1 ? '#50D8FF' : this.phase === 2 ? '#C878FF' : this.phase === 3 ? '#FF6480' : '#B00040', 'center');
  }

  drawOverlay(ctx) {
    if (this.finalEnrage) {
      ctx.save();
      ctx.globalAlpha = 0.08 + Math.sin(this.time * 4) * 0.03;
      ctx.fillStyle = '#FF3030';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
    if (this.finalForm && !this.collapseActive) drawText(ctx, 'FINAL FORM', LOGICAL_W / 2, 112, 42, '#FF4A70', 'center');
    if (this.collapseActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.arc(lx(this.x), ly(this.y), ls(420), 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.restore();
      drawText(ctx, `${Math.max(1, Math.ceil(this.collapseTimer))}...`, LOGICAL_W / 2, 500, 72, COLORS.WARNING, 'center');
    }
  }
}
export const EnemyFactory = {
  create(type, x, y, options = {}) {
    let enemy;
    switch (type) {
      case 'DRIFTER': enemy = new Drifter(x, y); break;
      case 'BOMBER': enemy = new Bomber(x, y); break;
      case 'HUNTER': enemy = new Hunter(x, y); break;
      case 'ELITE': enemy = new Elite(x, y); break;
      case 'BOSS_VOID': enemy = new BossVoid(x, y, options); break;
      case 'BOSS_TITAN': enemy = new OverhauledBossTitan(x, y, options); break;
      case 'BOSS_PHANTOM': enemy = new OverhauledBossPhantom(x, y, options); break;
      default: enemy = new Drifter(x, y); break;
    }
    applyDifficulty(enemy);
    return enemy;
  },
};

function roundHull(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPhantomShape(ctx, x, y, time, alpha, flash = 0) {
  const sets = [
    { radius: 72, color: flash > 0 ? '#FF6A55' : '#28C8FF', speed: 0.8, start: 0.2, end: Math.PI * 1.5 },
    { radius: 54, color: flash > 0 ? '#FF3C64' : '#8850FF', speed: -1.1, start: 1.1, end: Math.PI * 1.85 },
    { radius: 34, color: '#FF5028', speed: 1.4, start: 2.0, end: Math.PI * 1.3 + 2.0 },
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  sets.forEach((set) => {
    ctx.strokeStyle = set.color;
    ctx.lineWidth = ls(3);
    ctx.beginPath();
    ctx.arc(lx(x), ly(y), ls(set.radius), set.start + time * set.speed, set.end + time * set.speed);
    ctx.stroke();
  });
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(lx(x), ly(y), ls(12), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha *= 0.3;
  ctx.beginPath();
  ctx.arc(lx(x), ly(y), ls(20), 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = ls(2);
  ctx.stroke();
  ctx.restore();
}

function drawRealityTear(ctx, rift) {
  const points = rift.points?.length
    ? rift.points
    : Array.from({ length: 12 }, (_, index) => ({
      x: rift.x,
      y: rift.y1 + ((rift.y2 - rift.y1) * index) / 11,
    }));

  const alpha = rift.age < 0.5 ? Math.min(1, rift.age / 0.5) : 1;

  ctx.save();
  ctx.globalAlpha = 0.18 * alpha;
  ctx.strokeStyle = '#C878FF';
  ctx.lineWidth = ls(18);
  ctx.beginPath();
  ctx.moveTo(lx(points[0].x), ly(points[0].y));
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(lx(points[i].x), ly(points[i].y));
  ctx.stroke();

  ctx.globalAlpha = 0.85 * alpha;
  ctx.strokeStyle = '#C878FF';
  ctx.lineWidth = ls(5);
  ctx.beginPath();
  ctx.moveTo(lx(points[0].x), ly(points[0].y));
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(lx(points[i].x), ly(points[i].y));
  ctx.stroke();

  ctx.strokeStyle = '#F4E6FF';
  ctx.lineWidth = ls(2);
  ctx.beginPath();
  ctx.moveTo(lx(points[0].x), ly(points[0].y));
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(lx(points[i].x), ly(points[i].y));
  ctx.stroke();
  ctx.restore();
}

function applyDifficulty(enemy) {
  const difficulty = getCurrentDifficultyConfig();
  enemy.speed *= difficulty.enemySpeedMult;
  enemy.hp *= difficulty.enemyHpMult;
  enemy.damage *= difficulty.enemyDamageMult;
  if (enemy.isBoss) enemy.hp *= difficulty.bossHpMult;
  enemy.hp = Math.round(enemy.hp);
  enemy.maxHp = enemy.hp;
  if (typeof enemy.fireTimer === 'number' && enemy.fireTimer > 0) enemy.fireTimer /= difficulty.enemyFireRateMult;
  if (typeof enemy.fireInterval === 'number' && enemy.fireInterval > 0) enemy.fireInterval /= difficulty.enemyFireRateMult;
  if (typeof enemy.teleportTimer === 'number' && enemy.teleportTimer > 0) enemy.teleportTimer /= difficulty.enemyFireRateMult;
}

function updateBossEnrage(enemy, dt) {
  enemy.enrageFlash = Math.max(0, enemy.enrageFlash - dt);
  const difficulty = getCurrentDifficultyConfig();
  if (!difficulty.bossEnrageAt || !enemy.isBoss || enemy.enraged || enemy.hp > enemy.maxHp * difficulty.bossEnrageAt) return;
  enemy.enraged = true;
  enemy.justEnraged = true;
  enemy.enrageFlash = 0.5;
  enemy.speed *= 1.3;
  if (typeof enemy.fireTimer === 'number') enemy.fireTimer *= 0.5;
  if (typeof enemy.fireInterval === 'number') enemy.fireInterval *= 0.5;
  if (typeof enemy.teleportTimer === 'number') enemy.teleportTimer *= 0.5;
}

