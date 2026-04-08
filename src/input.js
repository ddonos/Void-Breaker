const keys = {};
const prevented = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ShiftLeft',
  'KeyX',
  'Enter',
  'Escape',
  'KeyR',
]);

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (prevented.has(e.code)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (prevented.has(e.code)) e.preventDefault();
});

export const isDown = (code) => !!keys[code];
export const isAnyOf = (...codes) => codes.some((code) => !!keys[code]);

export function consumeKey(code) {
  const value = !!keys[code];
  keys[code] = false;
  return value;
}
