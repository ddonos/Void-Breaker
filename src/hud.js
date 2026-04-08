import { COLORS, LOGICAL_W } from './settings.js';
import { drawBar, drawText, flashAlpha, ls, lx, ly, strokeArc } from './renderer.js';

export function drawHud(ctx, player, waveNumber, hiScore, stateTime, flashTimers, hudState = {}) {
  const { powerBadges = [], plasmaStatus = null, centerMessage = null, difficultyBadge = null } = hudState;
  const rightEdge = 1888;
  const barX = rightEdge - 240;
  const scoreBlockY = 32;

  if (difficultyBadge) drawText(ctx, difficultyBadge.text, 32, player.maxShield > 0 ? 132 : 88, 24, difficultyBadge.color);

  drawText(ctx, `WAVE ${waveNumber} / 30`, LOGICAL_W / 2, 40, 32, COLORS.HUD, 'center');
  drawText(ctx, `SCORE ${Math.round(player.score)}`, rightEdge, scoreBlockY, 32, COLORS.HUD, 'right');
  drawText(ctx, `BEST ${Math.round(hiScore)}`, rightEdge, scoreBlockY + 40, 28, COLORS.DIM, 'right');
  drawText(ctx, `\u25C6 ${player.crystals}`, rightEdge, scoreBlockY + 84, 30, COLORS.CRYSTAL, 'right');
  drawText(ctx, `HP ${Math.ceil(player.hp)}/${player.maxHp}`, rightEdge, scoreBlockY + 128, 28, COLORS.HP, 'right');
  drawBar(ctx, barX, scoreBlockY + 160, 240, 16, player.hp, player.maxHp, COLORS.HP);

  if (player.maxShield > 0) {
    drawText(ctx, `SH ${Math.ceil(player.shield)}/${player.maxShield}`, rightEdge, scoreBlockY + 188, 24, COLORS.SHIELD, 'right');
    drawBar(ctx, barX, scoreBlockY + 220, 240, 12, player.shield, player.maxShield, COLORS.SHIELD);
  }

  if (player.multiplier > 1.0) drawText(ctx, `x${player.multiplier.toFixed(1)}`, LOGICAL_W / 2, 100, 32, COLORS.BULLET, 'center');

  if (player.hasOverdrive) {
    const cx = LOGICAL_W / 2;
    const cy = 1008;
    const fill = player.overdrive ? 1 : Math.max(0, 1 - player.overdriveCooldown / player.overdriveCooldownMax);
    const color = player.overdriveCooldown <= 0 || player.overdrive ? COLORS.PLAYER : COLORS.DIM;
    strokeArc(ctx, cx, cy, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill, color, 2);
    if (player.overdrive) {
      const pulse = 0.6 + Math.sin(stateTime * 16) * 0.4;
      drawText(ctx, 'OVERDRIVE', cx, 952, 32, pulse > 0.5 ? '#FFFFFF' : COLORS.PLAYER, 'center');
    }
  }

  if (plasmaStatus) {
    drawText(ctx, plasmaStatus.text, LOGICAL_W / 2, 1008, 28, plasmaStatus.color, 'center');
  }

  if (powerBadges.length) {
    const totalWidth = powerBadges.length * 190 + (powerBadges.length - 1) * 18;
    let startX = LOGICAL_W / 2 - totalWidth / 2;
    for (const badge of powerBadges) {
      ctx.save();
      ctx.fillStyle = 'rgba(12, 12, 24, 0.78)';
      ctx.fillRect(lx(startX), ly(956), ls(190), ls(40));
      ctx.strokeStyle = badge.color;
      ctx.lineWidth = ls(2);
      ctx.strokeRect(lx(startX), ly(956), ls(190), ls(40));
      ctx.restore();
      drawText(ctx, badge.label, startX + 95, 964, 22, badge.color, 'center');
      startX += 208;
    }
  }

  if (centerMessage) {
    drawText(ctx, centerMessage.text, LOGICAL_W / 2, 898, centerMessage.size || 28, centerMessage.color, 'center');
  }

  if (player.hp / player.maxHp < 0.25) {
    flashAlpha(ctx, COLORS.WARNING, 0.15 * (0.5 + Math.sin(stateTime * 8) * 0.5));
  }

}

export function drawBossWarningOverlay(ctx, time, bossLabel = 'BOSS INCOMING', bossSubLabel = '', bossColor = COLORS.BOSS) {
  const pulse = Math.floor(time * 6) % 2 === 0;
  flashAlpha(ctx, pulse ? COLORS.WARNING : '#000000', pulse ? 0.22 : 0.12);
  const scale = 1 + Math.sin(time * 5) * 0.05;
  ctx.save();
  ctx.translate(lx(960), ly(400));
  ctx.scale(scale, scale);
  ctx.translate(-lx(960), -ly(400));
  drawText(ctx, bossLabel, 960, 400, 72, pulse ? '#FFFFFF' : COLORS.WARNING, 'center');
  ctx.restore();
  if (bossSubLabel) drawText(ctx, bossSubLabel, 960, 520, 34, bossColor, 'center');
}

export function drawPauseOverlay(ctx, pauseState) {
  flashAlpha(ctx, '#000000', 0.75);
  const panelX = 460;
  const panelY = 36;
  const panelW = 1000;
  const panelH = 1008;
  const panelBottom = panelY + panelH;
  const titleY = 96;
  const titleDividerY = 170;
  const leftColumnX = 580;
  const rightColumnX = 1040;
  const sectionGap = 18;
  const menuRowHeight = 48;
  const menuHeight = pauseState.menu.length * menuRowHeight;
  const confirmHeight = pauseState.confirming ? 84 : 0;
  const footerHintY = panelBottom - 36;
  const footerGap = 34;
  const menuBottomY = footerHintY - footerGap;
  const menuStartY = menuBottomY - confirmHeight - menuHeight;
  const statsRowHeight = 34;
  const statsHeaderY = menuStartY - 148;
  const statsStartY = statsHeaderY + 42;
  const statsBottomY = statsStartY + pauseState.stats.length * statsRowHeight + 26;
  const upgradesHeaderY = titleDividerY + 52;
  const upgradesStartY = upgradesHeaderY + 42;
  const upgradesBottomY = statsHeaderY - sectionGap;
  const availableUpgradeHeight = Math.max(28, upgradesBottomY - upgradesStartY - 6);
  const upgradeRows = Math.max(1, pauseState.upgrades.length);
  const upgradeRowHeight = Math.max(24, Math.min(34, Math.floor(availableUpgradeHeight / upgradeRows)));
  const upgradeFontSize = upgradeRowHeight <= 26 ? 20 : 24;
  const statsFontSize = 24;

  ctx.save();
  ctx.fillStyle = 'rgba(8, 8, 20, 0.92)';
  ctx.fillRect(lx(panelX), ly(panelY), ls(panelW), ls(panelH));
  ctx.strokeStyle = COLORS.HUD;
  ctx.lineWidth = ls(3);
  ctx.strokeRect(lx(panelX), ly(panelY), ls(panelW), ls(panelH));
  ctx.restore();

  drawText(ctx, 'PAUSED', 960, titleY, 64, COLORS.HUD, 'center');
  drawDivider(ctx, 560, titleDividerY, 800);

  drawText(ctx, 'ACTIVE UPGRADES', leftColumnX, upgradesHeaderY, 30, COLORS.HUD);
  if (!pauseState.upgrades.length) {
    drawText(ctx, 'No upgrades purchased yet', leftColumnX, upgradesStartY, 24, COLORS.DIM);
  } else {
    let y = upgradesStartY;
    pauseState.upgrades.forEach((row) => {
      drawText(ctx, row, leftColumnX, y, upgradeFontSize, COLORS.HUD);
      y += upgradeRowHeight;
    });
  }

  drawDivider(ctx, 560, upgradesBottomY, 800);
  drawText(ctx, 'SHIP STATS', leftColumnX, statsHeaderY, 30, COLORS.HUD);
  let y = statsStartY;
  pauseState.stats.forEach((row) => {
    drawText(ctx, row.left, leftColumnX, y, statsFontSize, COLORS.HUD);
    drawText(ctx, row.right, rightColumnX, y, statsFontSize, COLORS.HUD);
    y += statsRowHeight;
  });

  drawDivider(ctx, 560, statsBottomY, 800);
  pauseState.menu.forEach((item, index) => {
    const selected = index === pauseState.selection;
    if (selected) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(lx(570), ly(menuStartY + index * 48), ls(780), ls(36));
      ctx.restore();
    }
    drawText(ctx, item, 960, menuStartY + 6 + index * 48, 30, selected ? COLORS.HIGHLIGHT : COLORS.HUD, 'center');
  });

  if (pauseState.confirming) {
    drawText(ctx, 'Return to menu? Progress will be lost.', 960, menuStartY + 108, 24, COLORS.WARNING, 'center');
    drawText(ctx, 'Press Enter to confirm, ESC to cancel', 960, menuStartY + 138, 22, COLORS.DIM, 'center');
  }

  drawText(ctx, 'ESC - Resume', 960, footerHintY, 24, COLORS.DIM, 'center');
}

export function drawWaveCompleteOverlay(ctx, data, time) {
  const titleScale = Math.min(1, 0.6 + (time / 0.3) * 0.4);
  flashAlpha(ctx, '#000000', Math.max(0, (time - 2.6) / 0.4));
  ctx.save();
  ctx.translate(lx(960), ly(360));
  ctx.scale(titleScale, titleScale);
  ctx.translate(-lx(960), -ly(360));
  drawText(ctx, `WAVE ${data.wave} COMPLETE`, 960, 360, 68, COLORS.HUD, 'center');
  ctx.restore();

  const entries = [
    { text: `+${data.crystals} \u25C6`, color: COLORS.CRYSTAL },
    { text: `Wave bonus: +${data.bonus}`, color: COLORS.HUD },
  ];
  entries.forEach((entry, index) => {
    const alpha = Math.max(0, Math.min(1, (time - index * 0.3) / 0.3));
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawText(ctx, entry.text, 960, 468 + index * 52, 34, entry.color, 'center');
    ctx.restore();
  });
}

function drawDivider(ctx, x, y, w) {
  ctx.save();
  ctx.strokeStyle = 'rgba(180,170,255,0.35)';
  ctx.lineWidth = ls(2);
  ctx.beginPath();
  ctx.moveTo(lx(x), ly(y));
  ctx.lineTo(lx(x + w), ly(y));
  ctx.stroke();
  ctx.restore();
}
