function getScale() {
  return window.SCALE || 1;
}

function getOffsetX() {
  return window.OFFSET_X || 0;
}

function getOffsetY() {
  return window.OFFSET_Y || 0;
}

export function lx(x) {
  return getOffsetX() + x * getScale();
}

export function ly(y) {
  return getOffsetY() + y * getScale();
}

export function ls(s) {
  return s * getScale();
}

export function withTransform(ctx, x, y, drawFn, { rotation = 0, alpha = 1, scale = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(lx(x), ly(y));
  if (rotation) ctx.rotate(rotation);
  const worldScale = getScale();
  ctx.scale(worldScale * scale, worldScale * scale);
  drawFn(ctx);
  ctx.restore();
}

export function drawImageCentered(ctx, image, x, y, w, h, options = {}) {
  if (!image) return false;
  withTransform(ctx, x, y, (localCtx) => {
    localCtx.drawImage(image, -w / 2, -h / 2, w, h);
  }, options);
  return true;
}

export function drawBar(ctx, x, y, w, h, value, max, fillColor, bgColor = '#1a1830', borderColor = '#333') {
  ctx.fillStyle = bgColor;
  ctx.fillRect(lx(x), ly(y), ls(w), ls(h));
  const fill = max > 0 ? Math.max(0, Math.min(w, Math.round((value / max) * w))) : 0;
  ctx.fillStyle = fillColor;
  ctx.fillRect(lx(x), ly(y), ls(fill), ls(h));
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(1, ls(1));
  ctx.strokeRect(lx(x), ly(y), ls(w), ls(h));
}

export function drawText(ctx, text, x, y, size, color, align = 'left', font = 'monospace') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.font = `${Math.max(1, ls(size))}px ${font}`;
  ctx.fillText(text, lx(x), ly(y));
}

export function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(lx(x), ly(y), ls(w), ls(h));
}

export function drawPolygon(ctx, points, fillColor, strokeColor = null, strokeWidth = 1) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(lx(points[0][0]), ly(points[0][1]));
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(lx(points[i][0]), ly(points[i][1]));
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1, ls(strokeWidth));
    ctx.stroke();
  }
}

export function strokeArc(ctx, cx, cy, radius, startAngle, endAngle, color, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, ls(lineWidth));
  ctx.beginPath();
  ctx.arc(lx(cx), ly(cy), ls(radius), startAngle, endAngle);
  ctx.stroke();
}

export function drawCircle(ctx, cx, cy, radius, fillColor, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(lx(cx), ly(cy), ls(radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function flashAlpha(ctx, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export function clearCanvas(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
