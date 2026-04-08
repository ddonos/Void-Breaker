import { ls, lx, ly } from './renderer.js';

export const isMobile = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 1;

export class TouchControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = isMobile();

    this.joystick = {
      active: false,
      touchId: null,
      baseX: 220,
      baseY: 880,
      stickX: 220,
      stickY: 880,
      radius: 100,
      stickRadius: 45,
      dx: 0,
      dy: 0,
    };

    this.buttons = {
      pause: {
        x: 60,
        y: 55,
        w: 60,
        h: 60,
        pressed: false,
        touchId: null,
        consumed: false,
        queued: false,
      },
      overdrive: {
        x: 1700,
        y: 780,
        r: 65,
        pressed: false,
        touchId: null,
        consumed: false,
      },
      plasma: {
        x: 1700,
        y: 930,
        r: 65,
        pressed: false,
        touchId: null,
        consumed: false,
      },
    };

    if (this.active) this._bindEvents();
  }

  _toLogical(clientX, clientY) {
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (clientX * dpr - window.OFFSET_X) / window.SCALE,
      y: (clientY * dpr - window.OFFSET_Y) / window.SCALE,
    };
  }

  _inCircle(px, py, cx, cy, r) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }

  _inRect(px, py, x, y, w, h) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }

  _bindEvents() {
    document.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
    document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });

    this.canvas.addEventListener('touchstart', (event) => {
      for (const touch of event.changedTouches) {
        const { x, y } = this._toLogical(touch.clientX, touch.clientY);

        if (
          !this.joystick.active &&
          this._inCircle(x, y, this.joystick.baseX, this.joystick.baseY, this.joystick.radius * 1.5)
        ) {
          this.joystick.active = true;
          this.joystick.touchId = touch.identifier;
          this._updateStick(x, y);
          continue;
        }

        const pauseButton = this.buttons.pause;
        if (
          !pauseButton.pressed &&
          this._inCircle(x, y, pauseButton.x, pauseButton.y, 50)
        ) {
          pauseButton.pressed = true;
          pauseButton.touchId = touch.identifier;
          pauseButton.consumed = false;
          continue;
        }

        for (const [name, button] of Object.entries(this.buttons)) {
          if (name === 'pause') continue;
          if (button.pressed) continue;
          if (!this._inCircle(x, y, button.x, button.y, button.r)) continue;
          button.pressed = true;
          button.touchId = touch.identifier;
          button.consumed = false;
          break;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (event) => {
      for (const touch of event.changedTouches) {
        if (touch.identifier !== this.joystick.touchId) continue;
        const { x, y } = this._toLogical(touch.clientX, touch.clientY);
        this._updateStick(x, y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (event) => {
      for (const touch of event.changedTouches) {
        const { x, y } = this._toLogical(touch.clientX, touch.clientY);
        const pauseButton = this.buttons.pause;
        if (
          touch.identifier === pauseButton.touchId ||
          this._inCircle(x, y, pauseButton.x, pauseButton.y, 50)
        ) {
          pauseButton.queued = true;
          pauseButton.pressed = false;
          pauseButton.touchId = null;
          pauseButton.consumed = false;
        }
        if (touch.identifier === this.joystick.touchId) this._resetJoystick();
        for (const button of Object.values(this.buttons)) {
          if (touch.identifier !== button.touchId) continue;
          button.pressed = false;
          button.touchId = null;
          button.consumed = false;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', () => {
      this._resetJoystick();
      for (const button of Object.values(this.buttons)) {
        button.pressed = false;
        button.touchId = null;
        button.consumed = false;
        if ('queued' in button) button.queued = false;
      }
    }, { passive: false });
  }

  _resetJoystick() {
    this.joystick.active = false;
    this.joystick.touchId = null;
    this.joystick.stickX = this.joystick.baseX;
    this.joystick.stickY = this.joystick.baseY;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
  }

  _updateStick(px, py) {
    const dx = px - this.joystick.baseX;
    const dy = py - this.joystick.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 8) {
      this.joystick.stickX = this.joystick.baseX;
      this.joystick.stickY = this.joystick.baseY;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clamped = Math.min(dist, this.joystick.radius);
    this.joystick.stickX = this.joystick.baseX + Math.cos(angle) * clamped;
    this.joystick.stickY = this.joystick.baseY + Math.sin(angle) * clamped;
    this.joystick.dx = Math.cos(angle) * (clamped / this.joystick.radius);
    this.joystick.dy = Math.sin(angle) * (clamped / this.joystick.radius);
  }

  getMovement() {
    return { dx: this.joystick.dx, dy: this.joystick.dy };
  }

  isFireActive() {
    return this.joystick.active;
  }

  consumeOverdrive() {
    const button = this.buttons.overdrive;
    if (button.pressed && !button.consumed) {
      button.consumed = true;
      return true;
    }
    return false;
  }

  consumePause() {
    const button = this.buttons.pause;
    if ((button.queued || button.pressed) && !button.consumed) {
      button.consumed = true;
      button.queued = false;
      return true;
    }
    return false;
  }

  consumePlasma() {
    const button = this.buttons.plasma;
    if (button.pressed && !button.consumed) {
      button.consumed = true;
      return true;
    }
    return false;
  }

  draw(ctx, time, player) {
    if (!this.active) return;

    this._drawPauseButton(ctx);

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx(this.joystick.baseX), ly(this.joystick.baseY), ls(this.joystick.radius), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = ls(2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lx(this.joystick.stickX), ly(this.joystick.stickY), ls(this.joystick.stickRadius), 0, Math.PI * 2);
    ctx.fillStyle = this.joystick.active ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.60)';
    ctx.lineWidth = ls(2);
    ctx.stroke();
    ctx.restore();

    this._drawButton(ctx, time, this.buttons.overdrive, {
      readyFill: 'rgba(160,100,255,0.25)',
      activeFill: 'rgba(160,100,255,0.50)',
      pressedFill: 'rgba(160,100,255,0.65)',
      stroke: 'rgba(160,100,255,0.70)',
      purchased: !!player?.hasOverdrive,
      cooldown: player?.overdriveCooldown ?? 0,
      maxCooldown: player?.overdriveCooldownMax ?? 0,
      label: 'OD',
      active: !!player?.overdrive,
      activeLabel: 'ACTIVE',
    });

    this._drawButton(ctx, time, this.buttons.plasma, {
      readyFill: 'rgba(255,140,40,0.25)',
      activeFill: 'rgba(255,140,40,0.25)',
      pressedFill: 'rgba(255,140,40,0.65)',
      stroke: 'rgba(255,140,40,0.70)',
      purchased: (player?.plasmaCannonTier || 0) > 0,
      cooldown: player?.plasmaCooldown ?? 0,
      maxCooldown: player?.plasmaCooldownMax ?? 2.5,
      label: 'PLS',
      active: false,
      activeLabel: '',
    });
  }

  _drawPauseButton(ctx) {
    const button = this.buttons.pause;
    const x = lx(button.x - button.w / 2);
    const y = ly(button.y - button.h / 2);
    const w = ls(button.w);
    const h = ls(button.h);
    const radius = ls(12);

    ctx.save();
    roundedRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = button.pressed ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.20)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.40)';
    ctx.lineWidth = ls(2);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + w * 0.33, y + h * 0.24, w * 0.1, h * 0.52);
    ctx.fillRect(x + w * 0.57, y + h * 0.24, w * 0.1, h * 0.52);
    ctx.restore();
  }

  _drawButton(ctx, time, button, config) {
    if (!config.purchased) return;

    const cx = lx(button.x);
    const cy = ly(button.y);
    const radius = ls(button.r);
    const onCooldown = config.cooldown > 0;
    const pulse = 0.55 + Math.sin(time * 6) * 0.1;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    if (onCooldown) ctx.fillStyle = 'rgba(80,80,80,0.20)';
    else if (config.active) ctx.fillStyle = `rgba(160,100,255,${pulse.toFixed(3)})`;
    else if (button.pressed) ctx.fillStyle = config.pressedFill;
    else ctx.fillStyle = config.readyFill;
    ctx.fill();
    ctx.strokeStyle = onCooldown ? 'rgba(120,120,120,0.40)' : config.stroke;
    ctx.lineWidth = ls(2.5);
    ctx.stroke();

    if (onCooldown && config.maxCooldown > 0) {
      const progress = 1 - config.cooldown / config.maxCooldown;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - ls(6), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = config.stroke;
      ctx.lineWidth = ls(4);
      ctx.stroke();
    }

    ctx.fillStyle = onCooldown ? 'rgba(180,180,180,0.8)' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${ls(config.active ? 18 + Math.sin(time * 8) * 1.5 : onCooldown ? 20 : 26)}px monospace`;
    ctx.fillText(
      config.active ? config.activeLabel : onCooldown ? `${config.cooldown.toFixed(1)}s` : config.label,
      cx,
      cy,
    );
    ctx.restore();
  }
}

export class TapHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.pendingTap = null;
    this.suppressed = false;

    canvas.addEventListener('touchend', (event) => {
      if (!isMobile()) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dpr = window.devicePixelRatio || 1;
      const x = (touch.clientX * dpr - window.OFFSET_X) / window.SCALE;
      const y = (touch.clientY * dpr - window.OFFSET_Y) / window.SCALE;
      this.pendingTap = { x, y };
      event.preventDefault();
    }, { passive: false });
  }

  consume() {
    if (this.suppressed) {
      this.suppressed = false;
      this.pendingTap = null;
      return null;
    }
    const tap = this.pendingTap;
    this.pendingTap = null;
    return tap;
  }

  suppressNextTap() {
    this.suppressed = true;
    this.pendingTap = null;
  }

  static hitRect(tap, x, y, w, h) {
    if (!tap) return false;
    return tap.x >= x && tap.x <= x + w && tap.y >= y && tap.y <= y + h;
  }

  static hitCircle(tap, cx, cy, r) {
    if (!tap) return false;
    const dx = tap.x - cx;
    const dy = tap.y - cy;
    return dx * dx + dy * dy <= r * r;
  }
}

function roundedRect(ctx, x, y, w, h, r) {
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

export let touchControls = null;
export let tapHandler = null;

export function initTouchControls(canvas) {
  touchControls = new TouchControls(canvas);
  tapHandler = new TapHandler(canvas);
  return touchControls;
}
