import { COLORS, LOGICAL_H, LOGICAL_W, SHOT_DAMAGE_MULT } from './settings.js';
import { ls, lx, ly, withTransform } from './renderer.js';

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export class Bullet {
  constructor(x, y, angle, damage, color = COLORS.BULLET, speed = 960, owner = 'player', sourceType = 'PLAYER') {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.angle = angle;
    this.damage = damage * SHOT_DAMAGE_MULT;
    this.color = color;
    this.speed = speed;
    this.owner = owner;
    this.sourceType = sourceType;
    this.w = 8;
    this.h = 24;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.dead = false;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle = Math.atan2(this.vy, this.vx);
    if (this.x < -48 || this.x > LOGICAL_W + 48 || this.y < -64 || this.y > LOGICAL_H + 64) this.dead = true;
  }

  draw(ctx) {
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = this.color;
      localCtx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    }, { rotation: this.angle + Math.PI / 2 });
  }

  getBounds() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
}

export class EnemyBullet extends Bullet {
  constructor(x, y, angle, damage = 20, color = COLORS.ENEMY, speed = 400, sourceType = 'ENEMY') {
    super(x, y, angle, damage, color, speed, 'enemy', sourceType);
    this.w = 12;
    this.h = 12;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(lx(this.x - this.w / 2), ly(this.y - this.h / 2), ls(this.w), ls(this.h));
  }
}

export class SpectralBolt extends EnemyBullet {
  constructor(x, y, angle, damage = 28, speed = 280, sourceType = 'BOSS_PHANTOM') {
    super(x, y, angle, damage, '#C8F4FF', speed, sourceType);
    this.w = 14;
    this.h = 14;
    this.trail = [];
  }

  update(dt) {
    this.trail.unshift({ x: this.x, y: this.y });
    this.trail = this.trail.slice(0, 5);
    super.update(dt);
  }

  draw(ctx) {
    const alphas = [0.5, 0.35, 0.2, 0.1, 0.05];
    this.trail.forEach((point, index) => {
      ctx.save();
      ctx.globalAlpha = alphas[index] || 0.05;
      ctx.fillStyle = '#8DE8FF';
      ctx.fillRect(lx(point.x - this.w / 2), ly(point.y - this.h / 2), ls(this.w), ls(this.h));
      ctx.restore();
    });
    ctx.save();
    ctx.fillStyle = '#C8F4FF';
    ctx.fillRect(lx(this.x - this.w / 2), ly(this.y - this.h / 2), ls(this.w), ls(this.h));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(lx(this.x - this.w / 4), ly(this.y - this.h / 4), ls(this.w / 2), ls(this.h / 2));
    ctx.restore();
  }
}

export class MortarProjectile extends EnemyBullet {
  constructor(x, y, angle, damage, color, speed, sourceType, {
    targetY = LOGICAL_H - 100,
    lifetime = 4,
    explosionRadius = 80,
    explosionColor = '#FF8C28',
  } = {}) {
    super(x, y, angle, damage, color, speed, sourceType);
    this.w = 20;
    this.h = 20;
    this.age = 0;
    this.lifetime = lifetime;
    this.targetY = targetY;
    this.explosionRadius = explosionRadius;
    this.explosionColor = explosionColor;
    this.pendingExplosion = false;
    this.explosionDamage = damage;
  }

  update(dt) {
    this.age += dt;
    super.update(dt);
    if (this.dead) return;
    if (this.y >= this.targetY || this.age >= this.lifetime) {
      this.pendingExplosion = true;
      this.dead = true;
    }
  }

  draw(ctx) {
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = this.explosionColor;
      localCtx.beginPath();
      localCtx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
      localCtx.fill();
      localCtx.fillStyle = '#FFE2B0';
      localCtx.beginPath();
      localCtx.arc(0, 0, this.w / 4, 0, Math.PI * 2);
      localCtx.fill();
    });
  }
}

export class HomingMissile extends EnemyBullet {
  constructor(x, y, angle, damage = 80, sourceType = 'BOSS_TITAN') {
    super(x, y, angle, damage, '#E44545', 200, sourceType);
    this.w = 10;
    this.h = 24;
    this.age = 0;
    this.lifetime = 5;
    this.targetTimer = 0;
    this.turnRate = 3;
    this.targetX = x;
    this.targetY = y;
    this.trail = [];
    this.pendingExplosion = false;
    this.explosionRadius = 48;
    this.explosionDamage = 0;
  }

  update(dt, player) {
    this.age += dt;
    this.targetTimer -= dt;
    this.trail.unshift({ x: this.x, y: this.y });
    this.trail = this.trail.slice(0, 3);
    if (this.targetTimer <= 0 && player) {
      this.targetX = player.x;
      this.targetY = player.y;
      this.targetTimer = 0.3;
    }
    const targetAngle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
    const delta = normalizeAngle(targetAngle - this.angle);
    const maxTurn = this.turnRate * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, delta));
    this.speed = Math.min(350, 200 + this.age * 100);
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    super.update(dt);
    if (this.dead) return;
    if (this.age >= this.lifetime) {
      this.pendingExplosion = true;
      this.dead = true;
    }
  }

  draw(ctx) {
    this.trail.forEach((point, index) => {
      ctx.save();
      ctx.globalAlpha = 0.28 - index * 0.08;
      withTransform(ctx, point.x, point.y, (localCtx) => {
        localCtx.fillStyle = '#FF8C28';
        localCtx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      }, { rotation: this.angle + Math.PI / 2 });
      ctx.restore();
    });
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = '#E44545';
      localCtx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      localCtx.fillStyle = '#FFD37A';
      localCtx.fillRect(-this.w / 4, this.h * 0.18, this.w / 2, this.h * 0.28);
    }, { rotation: this.angle + Math.PI / 2 });
  }
}

export class VoidPulseRing {
  constructor(x, y, speed = 600, maxRadius = 800, damage = 90) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.speed = speed;
    this.maxRadius = maxRadius;
    this.damage = damage * SHOT_DAMAGE_MULT;
    this.dead = false;
    this.hitPlayer = false;
    this.lineWidth = 6;
  }

  update(dt) {
    this.radius += this.speed * dt;
    if (this.radius >= this.maxRadius) this.dead = true;
  }

  checkPlayer(player) {
    if (this.hitPlayer || this.dead) return false;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (Math.abs(dist - this.radius) <= 22) {
      this.hitPlayer = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - this.radius / this.maxRadius);
    ctx.strokeStyle = '#FF50FF';
    ctx.lineWidth = ls(this.lineWidth);
    ctx.beginPath();
    ctx.arc(lx(this.x), ly(this.y), ls(this.radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class PlasmaCannonBolt extends Bullet {
  constructor(x, y, angle, damage, tier) {
    super(x, y, angle, damage, '#FF8C28', 300, 'player', 'PLASMA');
    this.tier = tier;
    this.w = 24;
    this.h = 96;
    this.pierceCount = tier === 2 ? 3 : 1;
    this.explodes = tier >= 3;
    this.hitIds = new Set();
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -120 || this.x > LOGICAL_W + 120 || this.y < -120 || this.y > LOGICAL_H + 120) this.dead = true;
  }

  draw(ctx) {
    withTransform(ctx, this.x, this.y, (localCtx) => {
      localCtx.fillStyle = '#FF7A18';
      localCtx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      localCtx.fillStyle = '#FFE45A';
      localCtx.fillRect(-this.w / 4, -this.h * 0.375, this.w / 2, this.h * 0.75);
      localCtx.strokeStyle = '#FFF0B4';
      localCtx.lineWidth = 2;
      localCtx.beginPath();
      localCtx.moveTo(0, -this.h / 2);
      localCtx.lineTo(0, this.h / 2);
      localCtx.stroke();
    });
  }
}

export class LaserBeam {
  constructor(x, y, width = 8, height = LOGICAL_H, sweepSpeed = 120, direction = 1, damage = 120) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.sweepSpeed = sweepSpeed;
    this.direction = direction;
    this.active = false;
    this.damage = damage * SHOT_DAMAGE_MULT;
  }

  update(dt, leftBound = 160, rightBound = LOGICAL_W - 160) {
    if (!this.active) return;
    this.x += this.direction * this.sweepSpeed * dt;
    if (this.x < leftBound) {
      this.x = leftBound;
      this.direction = 1;
    }
    if (this.x > rightBound) {
      this.x = rightBound;
      this.direction = -1;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = COLORS.BOSS;
    ctx.fillRect(lx(this.x - this.width / 2), ly(this.y), ls(this.width), ls(this.height));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF6CF';
    ctx.fillRect(lx(this.x - 2), ly(this.y), ls(4), ls(this.height));
    ctx.restore();
  }

  getBounds() {
    return { x: this.x - this.width / 2, y: this.y, w: this.width, h: this.height };
  }
}
