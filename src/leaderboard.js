import { consumeKey } from './input.js';
import { COLORS, DIFFICULTIES, INITIALS, LOGICAL_W } from './settings.js';
import { drawText } from './renderer.js';

export class InitialsEntry {
  constructor() {
    this.reset();
  }

  reset() {
    this.slots = ['A', 'A', 'A'];
    this.index = 0;
  }

  update() {
    if (consumeKey('ArrowUp')) {
      const pos = INITIALS.indexOf(this.slots[this.index]);
      this.slots[this.index] = INITIALS[(pos + 1) % INITIALS.length];
    }
    if (consumeKey('ArrowDown')) {
      const pos = INITIALS.indexOf(this.slots[this.index]);
      this.slots[this.index] = INITIALS[(pos + INITIALS.length - 1) % INITIALS.length];
    }
    if (consumeKey('ArrowRight') || consumeKey('Enter')) {
      this.index += 1;
      if (this.index >= this.slots.length) return true;
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
      drawText(ctx, this.slots[i], x, 480, 112, active ? COLORS.HIGHLIGHT : COLORS.HUD);
      drawText(ctx, active ? '_' : ' ', x + 12, 600, 80, COLORS.CRYSTAL);
    }
    drawText(ctx, 'UP/DOWN: Change  ENTER: Confirm', LOGICAL_W / 2, 824, 32, COLORS.DIM, 'center');
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

  drawText(ctx, 'Press ENTER to play again / ESC for menu', LOGICAL_W / 2, 976, 32, COLORS.DIM, 'center');
}
