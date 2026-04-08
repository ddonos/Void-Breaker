import { consumeKey } from './input.js';
import { COLORS, LOGICAL_W } from './settings.js';
import { drawPixelRect, drawText } from './renderer.js';
import { isMobile, TapHandler } from './touchcontrols.js';

export const UPGRADES = [
  {
    id: 'hull',
    name: 'Hull Plating',
    description: '+200 max HP, heals 200 HP',
    maxTier: 3,
    costs: [325, 520, 780],
    apply(player) {
      player.maxHp += 200;
      player.hp = Math.min(player.hp + 200, player.maxHp);
    },
  },
  {
    id: 'firerate',
    name: 'Rapid Fire',
    description: 'Fire rate x0.75 per tier',
    maxTier: 3,
    costs: [416, 650, 975],
    apply(player) {
      player.fireRate *= 0.75;
    },
  },
  {
    id: 'damage',
    name: 'Pulse Amplifier',
    description: 'Boosts all weapon damage +15 per tier',
    maxTier: 3,
    costs: [364, 585, 910],
    apply(player) {
      player.damage += 15;
    },
  },
  {
    id: 'plasmaCannon',
    name: 'Plasma Cannon',
    description: 'X key: fires a slow heavy bolt. T2: pierces enemies. T3: explodes.',
    maxTier: 3,
    costs: [715, 1105, 1495],
    apply(player, tier) {
      player.plasmaCannonTier = tier;
    },
  },
  {
    id: 'shield',
    name: 'Ablative Shield',
    description: 'T1: 100 +5/10s | T2: 200 +5/7s | T3: 300 +5/5s',
    maxTier: 3,
    costs: [624, 910, 1235],
    apply(player, tier) {
      const maxShieldByTier = [100, 200, 300];
      const regenIntervalByTier = [10, 7, 5];
      player.maxShield = maxShieldByTier[tier - 1];
      player.shield = player.maxShield;
      player.shieldRegenAmount = 5;
      player.shieldRegenInterval = regenIntervalByTier[tier - 1];
      player.shieldRegenTimer = player.shieldRegenInterval;
    },
  },
  {
    id: 'speed',
    name: 'Afterburner',
    description: '+80 speed per tier',
    maxTier: 3,
    costs: [260, 455, 715],
    apply(player) {
      player.speed += 80;
    },
  },
  {
    id: 'spread',
    name: 'Spread Shot',
    description: 'T1: 3-way | T2: 5-way | T3: 360 nova',
    maxTier: 3,
    costs: [780, 1170, 1560],
    apply(player, tier) {
      player.spreadLevel = tier;
    },
  },
  {
    id: 'overdrive',
    name: 'Overdrive Core',
    description: 'SHIFT: 4s double damage. T2: +2s',
    maxTier: 2,
    costs: [910, 1300],
    apply(player, tier) {
      if (tier === 1) player.hasOverdrive = true;
      if (tier === 2) player.overdriveDuration += 2;
    },
  },
  {
    id: 'magnet',
    name: 'Crystal Magnet',
    description: 'Auto-collect crystals in radius',
    maxTier: 3,
    costs: [390, 650, 975],
    apply(player, tier) {
      player.magnetRadius = [160, 280, 440][tier - 1];
    },
  },
];

export class ShopScreen {
  constructor() {
    this.selection = 0;
    this.mobileFlashTimer = 0;
  }

  reset() {
    this.selection = 0;
    this.mobileFlashTimer = 0;
  }

  attemptPurchase(player, audioManager, selection = this.selection) {
    const upgrade = UPGRADES[selection];
    const tier = player.upgrades[upgrade.id] || 0;
    if (tier >= upgrade.maxTier) return null;
    const cost = upgrade.costs[tier];
    if (player.crystals < cost) return null;
    player.crystals -= cost;
    const nextTier = tier + 1;
    player.upgrades[upgrade.id] = nextTier;
    upgrade.apply(player, nextTier);
    this.selection = selection;
    this.mobileFlashTimer = 0.12;
    audioManager.shopBuy();
    return upgrade.id;
  }

  update(player, audioManager, tap = null) {
    this.mobileFlashTimer = Math.max(0, this.mobileFlashTimer - 1 / 60);
    if (consumeKey('ArrowUp')) this.selection = (this.selection + UPGRADES.length - 1) % UPGRADES.length;
    if (consumeKey('ArrowDown')) this.selection = (this.selection + 1) % UPGRADES.length;
    if (consumeKey('Space')) return 'continue';
    if (consumeKey('Enter')) {
      return this.attemptPurchase(player, audioManager, this.selection);
    }

    if (tap) {
      const rowStartY = 132;
      const rowHeight = 86;
      for (let i = 0; i < UPGRADES.length; i += 1) {
        const rowY = rowStartY + i * rowHeight;
        if (!TapHandler.hitRect(tap, 56, rowY - 6, 1808, 72)) continue;
        if (this.selection === i) {
          const result = this.attemptPurchase(player, audioManager, i);
          if (result) return result;
        } else {
          this.selection = i;
        }
        return null;
      }

      if (this.selection >= 0) {
        const buyBtnY = rowStartY + this.selection * rowHeight;
        if (TapHandler.hitRect(tap, LOGICAL_W - 260, buyBtnY - 2, 180, 60)) {
          return this.attemptPurchase(player, audioManager, this.selection);
        }
      }

      if (TapHandler.hitRect(tap, LOGICAL_W / 2 - 120, 972, 240, 70)) return 'continue';
    }
    return null;
  }

  draw(ctx, player) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();

    drawText(ctx, 'UPGRADE SHOP', LOGICAL_W / 2, 56, 64, COLORS.HUD, 'center');
    drawText(ctx, `\u25C6 ${player.crystals}`, 1840, 56, 36, COLORS.CRYSTAL, 'right');

    let y = 132;
    for (let i = 0; i < UPGRADES.length; i += 1) {
      const upgrade = UPGRADES[i];
      const tier = player.upgrades[upgrade.id] || 0;
      const selected = i === this.selection;
      const maxed = tier >= upgrade.maxTier;
      const cost = maxed ? 0 : upgrade.costs[tier];
      const affordable = maxed || player.crystals >= cost;

      if (selected) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        drawPixelRect(ctx, 56, y - 6, 1808, 72, COLORS.HIGHLIGHT);
        ctx.restore();
      }

      const pips = Array.from({ length: upgrade.maxTier }, (_, idx) => (idx < tier ? '\u25CF' : '\u25CB')).join('');
      drawText(ctx, `${pips} ${upgrade.name}`, 88, y, 28, selected ? COLORS.HIGHLIGHT : COLORS.HUD);
      drawText(ctx, upgrade.description, 88, y + 34, 22, '#9088C7');
      drawText(ctx, maxed ? 'MAXED' : `${cost}`, 1832, y + 16, 32, maxed ? COLORS.DIM : (affordable ? COLORS.CRYSTAL : COLORS.DIM), 'right');
      if (isMobile() && selected) {
        ctx.save();
        ctx.globalAlpha = this.mobileFlashTimer > 0 ? 0.22 : 1;
        ctx.strokeStyle = affordable && !maxed ? COLORS.CRYSTAL : COLORS.DIM;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          window.OFFSET_X + (LOGICAL_W - 260) * window.SCALE,
          window.OFFSET_Y + (y - 2) * window.SCALE,
          180 * window.SCALE,
          60 * window.SCALE,
        );
        ctx.restore();
        drawText(ctx, maxed ? 'MAXED' : `BUY \u25C6${cost}`, LOGICAL_W - 170, y + 10, 22, maxed ? COLORS.DIM : (affordable ? COLORS.CRYSTAL : COLORS.DIM), 'center');
      }
      y += 86;
    }

    if (isMobile()) {
      ctx.save();
      ctx.strokeStyle = COLORS.HUD;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        window.OFFSET_X + (LOGICAL_W / 2 - 120) * window.SCALE,
        window.OFFSET_Y + 972 * window.SCALE,
        240 * window.SCALE,
        70 * window.SCALE,
      );
      ctx.restore();
      drawText(ctx, 'TAP TO BUY · TAP CONTINUE WHEN DONE', LOGICAL_W / 2, 934, 22, COLORS.DIM, 'center');
      drawText(ctx, '[ CONTINUE ]', LOGICAL_W / 2, 989, 28, COLORS.HIGHLIGHT, 'center');
      drawText(ctx, 'TAP TO SELECT', LOGICAL_W / 2, 1048, 22, COLORS.DIM, 'center');
    } else {
      drawText(ctx, 'ENTER: Buy    SPACE: Continue', LOGICAL_W / 2, 1010, 28, COLORS.DIM, 'center');
    }
  }
}
