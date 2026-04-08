import { isAnyOf, isDown } from './input.js';
import {
  COLORS,
  getCurrentDifficultyConfig,
  LOGICAL_H,
  LOGICAL_W,
  OVERDRIVE_COOLDOWN,
  OVERDRIVE_DAMAGE_MULT,
  PLAYER_HIT_INVINCIBLE,
  PLAYER_MARGIN,
  PLASMA_COOLDOWN,
  SHIELD_REGEN_COOLDOWN,
} from './settings.js';
import { assets } from './assets.js';
import { clamp, drawImageCentered, lx, ly, strokeArc, withTransform } from './renderer.js';
import { Bullet, PlasmaCannonBolt } from './projectiles.js';

export class Player {
  constructor() {
    const difficulty = getCurrentDifficultyConfig();
    this.x = 960;
    this.y = 880;
    this.w = 48;
    this.h = 56;
    this.hp = Math.round(1000 * difficulty.playerHpMult);
    this.maxHp = this.hp;
    this.shield = 0;
    this.maxShield = 0;
    this.shieldRegenAmount = 0;
    this.shieldRegenInterval = 0;
    this.shieldRegenTimer = 0;
    this.shieldRegenDelay = 0;
    this.speed = 360;
    this.fireRate = 0.25;
    this.fireCooldown = 0;
    this.damage = 25;
    this.crystals = 0;
    this.score = 0;
    this.multiplier = 1.0;
    this.multiplierTimer = 0;
    this.overdrive = false;
    this.overdriveDuration = 4;
    this.overdriveTimer = 0;
    this.overdriveCooldown = 0;
    this.overdriveCooldownMax = OVERDRIVE_COOLDOWN;
    this.hasOverdrive = false;
    this.spreadLevel = 0;
    this.magnetRadius = 0;
    this.upgrades = {};
    this.hitFlash = 0;
    this.invincible = 0;
    this.plasmaCooldown = 0;
    this.plasmaCooldownMax = PLASMA_COOLDOWN;
    this.plasmaCannonTier = 0;
    this.tempShieldTimer = 0;
    this.rapidFireTimer = 0;
    this.empSlowTimer = 0;
    this.isMoving = false;
    this.moveVector = { x: 0, y: 0 };
  }

  update(dt, bullets, audioManager, plasmaBolts) {
    const moveX = (isAnyOf('KeyD', 'ArrowRight') ? 1 : 0) - (isAnyOf('KeyA', 'ArrowLeft') ? 1 : 0);
    const moveY = (isAnyOf('KeyS', 'ArrowDown') ? 1 : 0) - (isAnyOf('KeyW', 'ArrowUp') ? 1 : 0);
    const rawLen = Math.hypot(moveX, moveY);
    const moveLen = rawLen || 1;
    this.isMoving = rawLen > 0;
    this.moveVector.x = moveX / moveLen;
    this.moveVector.y = moveY / moveLen;

    this.x += this.moveVector.x * this.speed * dt;
    this.y += this.moveVector.y * this.speed * dt;
    this.x = clamp(this.x, PLAYER_MARGIN + this.w / 2, LOGICAL_W - PLAYER_MARGIN - this.w / 2);
    this.y = clamp(this.y, PLAYER_MARGIN + this.h / 2, LOGICAL_H - PLAYER_MARGIN - this.h / 2);

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.plasmaCooldown = Math.max(0, this.plasmaCooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.shieldRegenDelay = Math.max(0, this.shieldRegenDelay - dt);
    this.tempShieldTimer = Math.max(0, this.tempShieldTimer - dt);
    this.rapidFireTimer = Math.max(0, this.rapidFireTimer - dt);
    this.empSlowTimer = Math.max(0, this.empSlowTimer - dt);

    if (this.maxShield > 0 && this.shieldRegenAmount > 0 && this.shieldRegenInterval > 0 && this.shieldRegenDelay <= 0) {
      this.shieldRegenTimer = Math.max(0, this.shieldRegenTimer - dt);
      while (this.shieldRegenTimer <= 0) {
        this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenAmount);
        this.shieldRegenTimer += this.shieldRegenInterval;
      }
    }

    if (this.overdrive) {
      this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
      if (this.overdriveTimer <= 0) {
        this.overdrive = false;
        this.overdriveCooldown = this.overdriveCooldownMax;
      }
    } else if (this.overdriveCooldown > 0) {
      this.overdriveCooldown = Math.max(0, this.overdriveCooldown - dt);
    }

    if (this.hasOverdrive && isDown('ShiftLeft') && !this.overdrive && this.overdriveCooldown <= 0) {
      this.overdrive = true;
      this.overdriveTimer = this.overdriveDuration;
    }

    if (isDown('Space') && this.fireCooldown <= 0) {
      this.fire(bullets);
      audioManager.shoot();
    }

    if (this.plasmaCannonTier > 0 && isDown('KeyX') && this.plasmaCooldown <= 0) {
      const plasmaDamage = 120 + (this.plasmaCannonTier - 1) * 40;
      const plasmaAngles = this.plasmaCannonTier === 1
        ? [0]
        : this.plasmaCannonTier === 2
          ? [-18, 18]
          : [-24, 0, 24];
      plasmaAngles.forEach((deg) => {
        plasmaBolts.push(
          new PlasmaCannonBolt(
            this.x,
            this.y - 56,
            -Math.PI / 2 + deg * Math.PI / 180,
            plasmaDamage,
            this.plasmaCannonTier,
          ),
        );
      });
      this.plasmaCooldown = this.plasmaCooldownMax;
      audioManager.shoot();
    }
  }

  fire(bullets) {
    const bulletColor = this.rapidFireTimer > 0 ? '#FFFFFF' : COLORS.BULLET;
    const cadence = (this.rapidFireTimer > 0 ? this.fireRate / 2 : this.fireRate) * (this.empSlowTimer > 0 ? 2 : 1);
    const spawnBullet = (angle) => bullets.push(new Bullet(this.x, this.y - 32, angle, this.damage, bulletColor));
    if (this.spreadLevel === 0) {
      spawnBullet(-Math.PI / 2);
      this.fireCooldown = cadence;
      return;
    }
    if (this.spreadLevel === 1) {
      [-20, 0, 20].forEach((deg) => spawnBullet(-Math.PI / 2 + deg * Math.PI / 180));
      this.fireCooldown = cadence;
      return;
    }
    if (this.spreadLevel === 2) {
      [-40, -20, 0, 20, 40].forEach((deg) => spawnBullet(-Math.PI / 2 + deg * Math.PI / 180));
      this.fireCooldown = cadence;
      return;
    }
    for (let i = 0; i < 8; i += 1) spawnBullet(-Math.PI / 2 + i * (Math.PI * 2 / 8));
    this.fireCooldown = cadence;
  }

  takeDamage(amount, options = {}) {
    const { ignoreInvincible = false, grantInvincible = true } = options;
    const difficulty = getCurrentDifficultyConfig();
    if (this.tempShieldTimer > 0) return false;
    if (!ignoreInvincible && this.invincible > 0) return false;
    let remaining = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) this.hp -= remaining;
    this.multiplier = 1.0;
    this.multiplierTimer = 0;
    this.hitFlash = 0.3;
    if (grantInvincible && !difficulty.noInvincibilityFrames) this.invincible = PLAYER_HIT_INVINCIBLE;
    this.shieldRegenDelay = SHIELD_REGEN_COOLDOWN;
    this.shieldRegenTimer = this.shieldRegenInterval;
    return true;
  }

  registerKill() {
    this.multiplier = Math.min(9.9, this.multiplier + 0.1);
    this.multiplierTimer = 3;
  }

  getDamageMultiplier() {
    return this.overdrive ? OVERDRIVE_DAMAGE_MULT : 1;
  }

  getSpreadLabel() {
    return ['Single', '3-Way', '5-Way', 'Nova'][this.spreadLevel] || 'Single';
  }

  draw(ctx, time = 0) {
    const auraPulse = 0.5 + Math.sin(time * 8) * 0.25;

    if (this.tempShieldTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + auraPulse * 0.2;
      ctx.fillStyle = '#5AC8FF';
      ctx.beginPath();
      ctx.arc(lx(this.x), ly(this.y), 54 * (window.SCALE || 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!drawImageCentered(ctx, assets.player, this.x, this.y, 128, 128)) {
      this.drawFallback(ctx);
    }

    if (this.shield > 0 || this.tempShieldTimer > 0) {
      strokeArc(ctx, this.x, this.y, 40, 0, Math.PI * 2, this.tempShieldTimer > 0 ? '#8BD9FF' : COLORS.SHIELD, this.tempShieldTimer > 0 ? 3 : 1.5);
    }

    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.hitFlash / 0.3;
      ctx.fillStyle = COLORS.WARNING;
      ctx.beginPath();
      ctx.arc(lx(this.x), ly(this.y), Math.max(this.w, this.h) * 0.45 * (window.SCALE || 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFallback(ctx) {
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = COLORS.PLAYER;
      localCtx.beginPath();
      localCtx.moveTo(0, -this.h / 2);
      localCtx.lineTo(-this.w * 0.2, 0);
      localCtx.lineTo(-this.w * 0.15, this.h * 0.3);
      localCtx.lineTo(0, this.h / 2);
      localCtx.lineTo(this.w * 0.15, this.h * 0.3);
      localCtx.lineTo(this.w * 0.2, 0);
      localCtx.closePath();
      localCtx.fill();

      localCtx.fillStyle = '#3AADCC';
      localCtx.beginPath();
      localCtx.moveTo(-this.w * 0.15, 0);
      localCtx.lineTo(-this.w / 2, this.h * 0.35);
      localCtx.lineTo(-this.w * 0.1, this.h * 0.25);
      localCtx.closePath();
      localCtx.fill();
      localCtx.beginPath();
      localCtx.moveTo(this.w * 0.15, 0);
      localCtx.lineTo(this.w / 2, this.h * 0.35);
      localCtx.lineTo(this.w * 0.1, this.h * 0.25);
      localCtx.closePath();
      localCtx.fill();

      localCtx.fillStyle = '#001830';
      localCtx.strokeStyle = COLORS.PLAYER;
      localCtx.lineWidth = 1;
      localCtx.beginPath();
      localCtx.ellipse(0, -this.h * 0.15, this.w * 0.12, this.h * 0.1, 0, 0, Math.PI * 2);
      localCtx.fill();
      localCtx.stroke();

      const glowColor = this.overdrive ? '#FFFFFF' : '#FF6030';
      localCtx.fillStyle = glowColor;
      localCtx.fillRect(-this.w * 0.18, this.h * 0.35, 6, 10);
      localCtx.fillRect(this.w * 0.06, this.h * 0.35, 6, 10);

      if (this.isMoving) {
        for (let i = 0; i < 3; i += 1) {
          localCtx.globalAlpha = 0.55 - i * 0.15;
          localCtx.fillRect(-this.w * 0.18, this.h * 0.48 + i * 8, 6, 8);
          localCtx.fillRect(this.w * 0.06, this.h * 0.48 + i * 8, 6, 8);
        }
        localCtx.globalAlpha = 1;
      }
    });
  }

  getBounds() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
}
