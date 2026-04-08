export function explodeAt(
  x,
  y,
  radius,
  damage,
  enemies,
  player,
  particles,
  effects,
  options = {},
) {
  const {
    color = '#FF8C28',
    duration = 0.4,
    damageEnemies = false,
    excludeEnemyIds = [],
  } = options;

  if (player) {
    const distToPlayer = Math.hypot(player.x - x, player.y - y);
    if (distToPlayer < radius) player.takeDamage(damage);
  }

  if (damageEnemies && enemies?.length) {
    enemies.forEach((enemy) => {
      if (enemy.dead || excludeEnemyIds.includes(enemy.id)) return;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < radius) enemy.takeDamage(damage);
    });
  }

  if (particles) particles.emit(x, y, {
    count: 12,
    colors: [color, '#FFD7A0'],
    speed: [140, 280],
    size: [6, 14],
    lifetime: [0.2, 0.45],
  });

  if (effects) effects.push({
    x,
    y,
    radius,
    age: 0,
    duration,
    color,
  });
}
