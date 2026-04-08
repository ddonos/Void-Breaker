import { COLORS, LOGICAL_H } from './settings.js';
import { assets } from './assets.js';
import { drawImageCentered, drawPixelRect, drawPolygon, ls, lx, ly } from './renderer.js';

export class Particle {
  constructor(x, y, vx, vy, color, size, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.age = 0;
    this.alpha = 1;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    this.alpha = 1 - this.age / this.lifetime;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    drawPixelRect(ctx, this.x, this.y, this.size, this.size, this.color);
    ctx.restore();
  }

  get dead() {
    return this.age >= this.lifetime;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, { count, colors, speed, size, lifetime }) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const magnitude = Array.isArray(speed) ? speed[0] + Math.random() * (speed[1] - speed[0]) : speed;
      const particleSize = Array.isArray(size) ? size[0] + Math.random() * (size[1] - size[0]) : size;
      const life = Array.isArray(lifetime) ? lifetime[0] + Math.random() * (lifetime[1] - lifetime[0]) : lifetime;
      this.particles.push(new Particle(
        x,
        y,
        Math.cos(angle) * magnitude,
        Math.sin(angle) * magnitude,
        colors[Math.floor(Math.random() * colors.length)],
        Math.max(4, particleSize),
        life,
      ));
    }
  }

  update(dt) {
    for (const particle of this.particles) particle.update(dt);
    this.particles = this.particles.filter((particle) => !particle.dead);
  }

  draw(ctx) {
    for (const particle of this.particles) particle.draw(ctx);
  }

  explode(x, y, color) {
    this.emit(x, y, { count: 10, colors: [color, '#FFFFFF'], speed: [160, 400], size: [4, 8], lifetime: [0.25, 0.4] });
  }

  hit(x, y) {
    this.emit(x, y, { count: 6, colors: [COLORS.WARNING, '#FFD0D0'], speed: [120, 240], size: [4, 8], lifetime: [0.1, 0.2] });
  }

  crystalSparkle(x, y) {
    for (let i = 0; i < 4; i += 1) this.particles.push(new Particle(x, y, (Math.random() - 0.5) * 56, -40 - Math.random() * 60, COLORS.CRYSTAL, 4, 0.35));
  }

  levelUp(x, y) {
    this.emit(x, y, { count: 16, colors: [COLORS.XP, '#FFFFFF'], speed: [100, 320], size: [4, 8], lifetime: [0.3, 0.6] });
  }

  engineTrail(x, y) {
    for (let i = 0; i < 2; i += 1) {
      this.particles.push(new Particle(x + (Math.random() - 0.5) * 8, y, (Math.random() - 0.5) * 32, 72 + Math.random() * 48, '#8A4B2D', 4, 0.15));
    }
  }
}

export class Crystal {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.vy = 60;
    this.dead = false;
    this.rotation = Math.random() * Math.PI * 2;
  }

  get size() {
    if (this.value >= 100) return 50;
    if (this.value >= 30) return 40;
    if (this.value >= 12) return 30;
    return 20;
  }

  get visualSize() {
    if (this.value >= 100) return 96;
    if (this.value >= 30) return 80;
    if (this.value >= 12) return 64;
    return 48;
  }

  update(dt, player, onCollect = null) {
    this.y += this.vy * dt;
    this.rotation += 0.5 * dt;
    if (player.magnetRadius > 0) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < player.magnetRadius && dist > 0.001) {
        this.x += (dx / dist) * 480 * dt;
        this.y += (dy / dist) * 480 * dt;
      }
    }

    const bounds = this.getBounds();
    const playerBounds = player.getBounds();
    if (
      bounds.x < playerBounds.x + playerBounds.w &&
      bounds.x + bounds.w > playerBounds.x &&
      bounds.y < playerBounds.y + playerBounds.h &&
      bounds.y + bounds.h > playerBounds.y
    ) {
      player.crystals += this.value;
      if (onCollect) onCollect(this);
      this.dead = true;
    }
    if (this.y > LOGICAL_H + 40) this.dead = true;
  }

  draw(ctx) {
    if (assets.crystal) {
      drawImageCentered(ctx, assets.crystal, this.x, this.y, this.visualSize, this.visualSize, { rotation: this.rotation });
      return;
    }

    const size = this.size / 2;
    if (this.value >= 100) {
      drawRotatingBossGem(ctx, this.x, this.y, size, this.rotation);
      return;
    }
    drawPolygon(ctx, [
      [this.x, this.y - size],
      [this.x - size, this.y],
      [this.x, this.y + size],
      [this.x + size, this.y],
    ], COLORS.CRYSTAL, '#28AA78', this.value >= 12 ? 1.5 : 1);

    if (this.value >= 12) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = ls(1.5);
      ctx.beginPath();
      if (this.value >= 30) {
        ctx.moveTo(lx(this.x), ly(this.y - size));
        ctx.lineTo(lx(this.x - size * 0.45), ly(this.y));
        ctx.lineTo(lx(this.x), ly(this.y + size * 0.4));
        ctx.moveTo(lx(this.x), ly(this.y - size));
        ctx.lineTo(lx(this.x + size * 0.4), ly(this.y));
      } else {
        ctx.moveTo(lx(this.x - size * 0.2), ly(this.y - size * 0.55));
        ctx.lineTo(lx(this.x + size * 0.4), ly(this.y - size * 0.1));
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  getBounds() {
    return { x: this.x - this.size / 2, y: this.y - this.size / 2, w: this.size, h: this.size };
  }
}

function drawRotatingBossGem(ctx, x, y, radius, rotation) {
  ctx.save();
  ctx.globalAlpha = 0.15;
  drawPolygon(ctx, octagonPoints(x, y, radius + 4, rotation), COLORS.CRYSTAL, null);
  ctx.restore();
  drawPolygon(ctx, octagonPoints(x, y, radius, rotation), COLORS.CRYSTAL, '#28AA78', 1.5);
  ctx.save();
  ctx.globalAlpha = 0.3;
  drawPolygon(ctx, octagonPoints(x, y, radius * 0.6, rotation + Math.PI / 8), '#FFFFFF', null);
  ctx.restore();
}

function octagonPoints(x, y, radius, rotation) {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = rotation + index * (Math.PI * 2 / 8);
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  });
}
