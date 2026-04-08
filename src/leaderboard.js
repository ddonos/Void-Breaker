import { consumeKey } from './input.js';
import { COLORS, DIFFICULTIES, INITIALS, LOGICAL_W } from './settings.js';
import { drawText } from './renderer.js';
import { isMobile, TapHandler } from './touchcontrols.js';

export class InitialsEntry {
  constructor() {
    this.reset();
  }

  reset() {
    this.slots = ['A', 'A', 'A'];
    this.index = 0;
  }

  cycleUp(slot = this.index) {
    const pos = INITIALS.indexOf(this.slots[slot]);
    this.slots[slot] = INITIALS[(pos + 1) % INITIALS.length];
  }

  cycleDown(slot = this.index) {
    const pos = INITIALS.indexOf(this.slots[slot]);
    this.slots[slot] = INITIALS[(pos + INITIALS.length - 1) % INITIALS.length];
  }

  selectSlot(slot) {
    this.index = Math.max(0, Math.min(this.slots.length - 1, slot));
  }

  confirm() {
    this.index += 1;
    return this.index >= this.slots.length;
  }

  update(tap = null) {
    if (tap) {
      const baseX = 760;
      const slotSpacing = 168;
      for (let i = 0; i < this.slots.length; i += 1) {
        const letterX = baseX + i * slotSpacing;
        if (TapHandler.hitRect(tap, letterX, 480, 70, 120)) this.selectSlot(i);
        if (TapHandler.hitRect(tap, letterX + 8, 420, 40, 40)) this.cycleUp(i);
        if (TapHandler.hitRect(tap, letterX + 8, 624, 40, 40)) this.cycleDown(i);
      }
      if (TapHandler.hitRect(tap, LOGICAL_W / 2 - 150, 786, 300, 70)) return true;
    }

    if (consumeKey('ArrowUp')) {
      this.cycleUp();
    }
    if (consumeKey('ArrowDown')) {
      this.cycleDown();
    }
    if (consumeKey('ArrowRight') || consumeKey('Enter')) {
      if (this.confirm()) return true;
    }
    if (consumeKey('ArrowLeft')) this.index = Math.max(0, this.index - 1);
    return false;
  }

  getInitials() {
    return this.slots.join('');
  }

  draw(ctx, score) {
    drawText(ctx, 'ENTER INITIALS', LOGICAL_W / 2, 224, 64, COLORS.HUD, 'center');
    drawText(ctx, `SCORE ${Math.round(score)}`, LOGICAL_W / 2, 328, 32, COLORS.CRYSTAL, 'center');
    for (let i = 0; i < this.slots.length; i += 1) {
      const x = 760 + i * 168;
      const active = i === this.index;
      if (isMobile()) {
        drawText(ctx, '\u25B2', x + 24, 420, 36, COLORS.HUD, 'center');
        drawText(ctx, '\u25BC', x + 24, 624, 36, COLORS.HUD, 'center');
      }
      drawText(ctx, this.slots[i], x, 480, 112, active ? COLORS.HIGHLIGHT : COLORS.HUD);
      drawText(ctx, active ? '_' : ' ', x + 12, 600, 80, COLORS.CRYSTAL);
    }
    if (isMobile()) {
      ctx.save();
      ctx.strokeStyle = COLORS.CRYSTAL;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        window.OFFSET_X + (LOGICAL_W / 2 - 150) * window.SCALE,
        window.OFFSET_Y + 786 * window.SCALE,
        300 * window.SCALE,
        70 * window.SCALE,
      );
      ctx.restore();
      drawText(ctx, 'CONFIRM', LOGICAL_W / 2, 804, 32, COLORS.CRYSTAL, 'center');
      drawText(ctx, 'TAP TO SELECT', LOGICAL_W / 2, 904, 24, COLORS.DIM, 'center');
    } else {
      drawText(ctx, 'UP/DOWN: Change  ENTER: Confirm', LOGICAL_W / 2, 824, 32, COLORS.DIM, 'center');
    }
  }
}

export function drawLeaderboard(ctx, hiScores, latestScoreSignature) {
  drawText(ctx, 'LEADERBOARD', LOGICAL_W / 2, 80, 64, COLORS.HUD, 'center');
  drawText(ctx, '#', 312, 208, 32, COLORS.DIM);
  drawText(ctx, 'INIT', 496, 208, 32, COLORS.DIM);
  drawText(ctx, 'SCORE', 920, 208, 32, COLORS.DIM, 'right');
  drawText(ctx, 'WAVE', 1440, 208, 32, COLORS.DIM, 'right');
  drawText(ctx, 'DIFF', 1696, 208, 32, COLORS.DIM, 'center');

  if (!hiScores.length) drawText(ctx, 'NO SCORES YET', LOGICAL_W / 2, 448, 40, COLORS.DIM, 'center');

  hiScores.forEach((entry, index) => {
    const y = 288 + index * 64;
    const difficulty = DIFFICULTIES[entry.difficulty || 'pilot'] || DIFFICULTIES.pilot;
    const signature = `${entry.initials}-${entry.score}-${entry.wave}-${entry.difficulty || 'pilot'}`;
    const color = signature === latestScoreSignature ? COLORS.CRYSTAL : COLORS.HUD;
    const difficultyLabel = entry.difficulty === 'voidlord' ? '\u2620 VOID LORD' : difficulty.label;
    drawText(ctx, `${index + 1}`.padStart(2, '0'), 312, y, 32, color);
    drawText(ctx, entry.initials, 496, y, 32, color);
    drawText(ctx, `${Math.round(entry.score)}`, 920, y, 32, color, 'right');
    drawText(ctx, `${entry.wave}`, 1440, y, 32, color, 'right');
    drawText(ctx, difficultyLabel, 1696, y, 24, difficulty.color, 'center');
  });

  if (isMobile()) {
    ctx.save();
    ctx.strokeStyle = COLORS.HP;
    ctx.lineWidth = 2;
    ctx.strokeRect(window.OFFSET_X + 520 * window.SCALE, window.OFFSET_Y + 948 * window.SCALE, 280 * window.SCALE, 70 * window.SCALE);
    ctx.strokeStyle = COLORS.HUD;
    ctx.strokeRect(window.OFFSET_X + 1120 * window.SCALE, window.OFFSET_Y + 948 * window.SCALE, 280 * window.SCALE, 70 * window.SCALE);
    ctx.restore();
    drawText(ctx, 'PLAY AGAIN', 660, 966, 28, COLORS.HP, 'center');
    drawText(ctx, 'MAIN MENU', 1260, 966, 28, COLORS.HUD, 'center');
    drawText(ctx, 'TAP TO SELECT', LOGICAL_W / 2, 1034, 24, COLORS.DIM, 'center');
  } else {
    drawText(ctx, 'Press ENTER to play again / ESC for menu', LOGICAL_W / 2, 976, 32, COLORS.DIM, 'center');
  }
}
