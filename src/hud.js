import { COLORS, LOGICAL_W } from './settings.js';
import { drawBar, drawText, flashAlpha, ls, lx, ly, strokeArc } from './renderer.js';
import { isMobile } from './touchcontrols.js';

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

export function drawPauseOverlay(ctx, pauseState, layout = getPauseLayout(pauseState)) {
  flashAlpha(ctx, '#000000', 0.75);

  ctx.save();
  ctx.fillStyle = 'rgba(8, 8, 20, 0.92)';
  roundedRectPath(ctx, lx(layout.panelX), ly(layout.panelY), ls(layout.panelW), ls(layout.panelH), ls(12));
  ctx.fill();
  ctx.strokeStyle = COLORS.HUD;
  ctx.lineWidth = ls(1.5);
  ctx.stroke();
  ctx.restore();

  drawText(ctx, 'PAUSED', LOGICAL_W / 2, layout.panelY + 18, 28, COLORS.HUD, 'center');
  drawDivider(ctx, layout.panelX + 30, layout.panelY + 70, layout.panelW - 60);

  drawText(ctx, 'ACTIVE UPGRADES', layout.panelX + 40, layout.upgradesLabelY, 13, COLORS.HUD);
  if (!layout.visibleUpgrades.length) {
    drawText(ctx, 'No upgrades purchased yet', layout.panelX + 40, layout.upgradesRowsY, 12, COLORS.DIM);
  } else {
    let y = layout.upgradesRowsY;
    layout.visibleUpgrades.forEach((row) => {
      drawText(ctx, row, layout.panelX + 40, y, 12, COLORS.HUD);
      y += 28;
    });
    if (layout.hiddenUpgradeCount > 0) drawText(ctx, `...and ${layout.hiddenUpgradeCount} more`, layout.panelX + 40, y, 12, COLORS.DIM);
  }

  drawDivider(ctx, layout.panelX + 30, layout.upgradesDividerY, layout.panelW - 60);
  drawText(ctx, 'SHIP STATS', layout.panelX + 40, layout.statsLabelY, 13, COLORS.HUD);
  let y = layout.statsRowsY;
  pauseState.stats.forEach((row) => {
    drawText(ctx, row.left, layout.panelX + 40, y, 12, COLORS.HUD);
    drawText(ctx, row.right, layout.panelX + 440, y, 12, COLORS.HUD);
    y += 26;
  });

  drawDivider(ctx, layout.panelX + 30, layout.buttonsDividerY, layout.panelW - 60);

  if (pauseState.confirming) {
    drawText(ctx, 'Return to menu? Progress will be lost.', LOGICAL_W / 2, layout.confirmTextY, 13, COLORS.DIM, 'center');
    drawPauseButton(ctx, layout.confirmYes, 'YES', COLORS.WARNING, 'rgba(220,80,80,0.15)', pauseState.selection === 1);
    drawPauseButton(ctx, layout.confirmNo, 'NO', COLORS.HP, 'rgba(60,200,120,0.15)', false);
  }
  else {
    drawPauseButton(ctx, layout.resumeButton, 'RESUME', COLORS.HP, 'rgba(60,200,120,0.15)', pauseState.selection === 0);
    drawPauseButton(ctx, layout.mainMenuButton, 'MAIN MENU', COLORS.WARNING, 'rgba(220,80,80,0.15)', pauseState.selection === 1);
  }

  drawText(ctx, isMobile() ? 'TAP TO SELECT' : 'ESC - Resume', LOGICAL_W / 2, layout.panelY + layout.panelH + 16, 12, COLORS.DIM, 'center');
}

export function getPauseLayout(pauseState) {
  const maxPanelH = 980;
  const panelW = 860;
  const basePanelH = 640;
  let visibleUpgradeCount = Math.min(4, pauseState.upgrades.length);
  let hiddenUpgradeCount = Math.max(0, pauseState.upgrades.length - visibleUpgradeCount);
  let upgradesRowsHeight = Math.max(80, visibleUpgradeCount * 28 + (hiddenUpgradeCount > 0 ? 28 : 0));
  let panelH = Math.min(maxPanelH, Math.max(basePanelH, 70 + (40 + upgradesRowsHeight) + 144 + 15 + 95));

  while (panelH > maxPanelH && visibleUpgradeCount > 0) {
    visibleUpgradeCount -= 1;
    hiddenUpgradeCount = pauseState.upgrades.length - visibleUpgradeCount;
    upgradesRowsHeight = Math.max(80, visibleUpgradeCount * 28 + (hiddenUpgradeCount > 0 ? 28 : 0));
    panelH = Math.min(maxPanelH, Math.max(basePanelH, 70 + (40 + upgradesRowsHeight) + 144 + 15 + 95));
  }

  const panelX = LOGICAL_W / 2 - panelW / 2;
  const panelY = 540 - panelH / 2;
  const upgradesLabelY = panelY + 92;
  const upgradesRowsY = upgradesLabelY + 28;
  const upgradesDividerY = panelY + 70 + 40 + upgradesRowsHeight + 10;
  const statsLabelY = upgradesDividerY + 18;
  const statsRowsY = statsLabelY + 28;
  const buttonsDividerY = panelY + panelH - 95;
  const buttonY = panelY + panelH - 80;

  return {
    panelX,
    panelY,
    panelW,
    panelH,
    upgradesLabelY,
    upgradesRowsY,
    upgradesDividerY,
    statsLabelY,
    statsRowsY,
    buttonsDividerY,
    resumeButton: { x: panelX + 170, y: buttonY, w: 240, h: 60 },
    mainMenuButton: { x: panelX + 440, y: buttonY, w: 240, h: 60 },
    confirmTextY: buttonY - 34,
    confirmYes: { x: LOGICAL_W / 2 - 170, y: buttonY, w: 160, h: 55 },
    confirmNo: { x: LOGICAL_W / 2 + 10, y: buttonY, w: 160, h: 55 },
    visibleUpgrades: pauseState.upgrades.slice(0, visibleUpgradeCount),
    hiddenUpgradeCount,
  };
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

function drawPauseButton(ctx, rect, label, borderColor, fillColor, selected = false) {
  ctx.save();
  ctx.fillStyle = selected ? 'rgba(255,255,255,0.08)' : fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = ls(1.5);
  roundedRectPath(ctx, lx(rect.x), ly(rect.y), ls(rect.w), ls(rect.h), ls(10));
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + 18, 18, '#FFFFFF', 'center');
}

function roundedRectPath(ctx, x, y, w, h, r) {
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
