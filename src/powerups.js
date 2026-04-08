import { COLORS, LOGICAL_H } from './settings.js';
import { assets } from './assets.js';
import { drawImageCentered, withTransform } from './renderer.js';

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.w = 60;
    this.h = 60;
    this.vy = 40;
    this.dead = false;
    this.lifetime = 4;
    this.age = 0;
  }

  update(dt, player, onCollect = null) {
    this.age += dt;
    this.y += this.vy * dt;
    if (this.age >= this.lifetime || this.y > LOGICAL_H + 40) {
      this.dead = true;
      return;
    }

    if (overlap(this.getBounds(), player.getBounds())) {
      if (onCollect) onCollect(this);
      this.dead = true;
    }
  }

  draw(ctx, time = 0) {
    const pulse = 0.92 + (Math.sin(time * 3) + 1) * 0.08;
    const sprite = this.getSprite();
    if (sprite && drawImageCentered(ctx, sprite, this.x, this.y, 80, 80, { scale: pulse })) return;

    withTransform(ctx, this.x, this.y, (localCtx) => {
      switch (this.type) {
        case 'heal':
          localCtx.fillStyle = '#1A3A1A';
          localCtx.strokeStyle = COLORS.HP;
          localCtx.lineWidth = 2;
          roundRect(localCtx, -30, -30, 60, 60, 10);
          localCtx.fill();
          localCtx.stroke();
          localCtx.fillStyle = COLORS.HP;
          localCtx.fillRect(-7, -20, 14, 40);
          localCtx.fillRect(-20, -7, 40, 14);
          localCtx.fillStyle = '#FFFFFF';
          localCtx.fillRect(-5, -18, 6, 8);
          break;
        case 'nuke':
          localCtx.fillStyle = '#2A1800';
          localCtx.strokeStyle = COLORS.BOSS;
          localCtx.lineWidth = 2;
          localCtx.beginPath();
          localCtx.arc(0, 0, 28, 0, Math.PI * 2);
          localCtx.fill();
          localCtx.stroke();
          localCtx.fillStyle = '#FF8C28';
          burst(localCtx, 8, 12, 22);
          localCtx.fill();
          localCtx.fillStyle = '#FFFF50';
          localCtx.beginPath();
          localCtx.arc(0, 0, 8, 0, Math.PI * 2);
          localCtx.fill();
          break;
        case 'shield':
          localCtx.save();
          localCtx.globalAlpha = 0.8 + Math.sin(time * 3) * 0.15;
          localCtx.fillStyle = '#001428';
          localCtx.strokeStyle = COLORS.SHIELD;
          localCtx.lineWidth = 2;
          localCtx.beginPath();
          localCtx.arc(0, 0, 28, 0, Math.PI * 2);
          localCtx.fill();
          localCtx.stroke();
          localCtx.fillStyle = 'rgba(80,160,255,0.8)';
          localCtx.beginPath();
          localCtx.arc(0, -2, 18, Math.PI, 0);
          localCtx.lineTo(11, 18);
          localCtx.quadraticCurveTo(0, 26, -11, 18);
          localCtx.closePath();
          localCtx.fill();
          localCtx.strokeStyle = 'rgba(255,255,255,0.4)';
          localCtx.beginPath();
          localCtx.arc(0, -4, 14, Math.PI * 1.05, Math.PI * 1.85);
          localCtx.stroke();
          localCtx.restore();
          break;
        case 'rapidfire':
          localCtx.fillStyle = '#1A1A00';
          localCtx.strokeStyle = '#FFD700';
          localCtx.lineWidth = 2;
          localCtx.beginPath();
          localCtx.moveTo(0, -30);
          localCtx.lineTo(-30, 0);
          localCtx.lineTo(0, 30);
          localCtx.lineTo(30, 0);
          localCtx.closePath();
          localCtx.fill();
          localCtx.stroke();
          localCtx.fillStyle = '#FFF050';
          localCtx.beginPath();
          localCtx.moveTo(6, -24);
          localCtx.lineTo(-4, -2);
          localCtx.lineTo(4, -2);
          localCtx.lineTo(-8, 24);
          localCtx.lineTo(-2, 6);
          localCtx.lineTo(-12, 6);
          localCtx.closePath();
          localCtx.fill();
          localCtx.fillStyle = '#FFFFFF';
          localCtx.fillRect(-1, -18, 4, 12);
          break;
        case 'multiplier':
          localCtx.fillStyle = '#FFD700';
          star(localCtx, 0, 0, 5, 12, 28);
          localCtx.fill();
          localCtx.strokeStyle = '#FF8C00';
          localCtx.lineWidth = 1.5;
          localCtx.stroke();
          localCtx.fillStyle = '#FFFFFF';
          localCtx.beginPath();
          localCtx.arc(-8, -6, 4, 0, Math.PI * 2);
          localCtx.fill();
          break;
        default:
          break;
      }
    }, { scale: pulse });
  }

  getBounds() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  getSprite() {
    switch (this.type) {
      case 'heal': return assets.powerup_heal;
      case 'nuke': return assets.powerup_nuke;
      case 'shield': return assets.powerup_shield;
      case 'rapidfire': return assets.powerup_rapid;
      case 'multiplier': return assets.powerup_multiplier;
      default: return null;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
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

function star(ctx, cx, cy, points, inner, outer) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const radius = i % 2 === 0 ? outer : inner;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function burst(ctx, points, inner, outer) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const radius = i % 2 === 0 ? outer : inner;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
