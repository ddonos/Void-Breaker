const IMAGE_PATHS = {
  player: '../assets/sprites/player.png',
  enemy_drifter: '../assets/sprites/enemy_drifter.png',
  enemy_bomber: '../assets/sprites/enemy_bomber.png',
  enemy_hunter: '../assets/sprites/enemy_hunter.png',
  enemy_elite: '../assets/sprites/enemy_elite.png',
  boss_void: '../assets/sprites/boss_void.png',
  boss_titan: '../assets/sprites/boss_titan.png',
  boss_phantom: '../assets/sprites/boss_phantom.png',
  planet_blue: '../assets/sprites/planet_blue.png',
  planet_red: '../assets/sprites/planet_red.png',
  crystal: '../assets/sprites/crystal.png',
  powerup_heal: '../assets/sprites/powerup_heal.png',
  powerup_nuke: '../assets/sprites/powerup_nuke.png',
  powerup_shield: '../assets/sprites/powerup_shield.png',
  powerup_rapid: '../assets/sprites/powerup_rapid.png',
  powerup_multiplier: '../assets/sprites/powerup_multiplier.png',
};

export const assets = Object.fromEntries(
  Object.keys(IMAGE_PATHS).map((key) => [key, null]),
);

export class AssetLoader {
  constructor() {
    this.total = Object.keys(IMAGE_PATHS).length;
    this.loaded = 0;
    this.progress = 0;
    this.promise = null;
  }

  loadAll(onProgress = null) {
    if (this.promise) return this.promise;
    this.promise = Promise.all(
      Object.entries(IMAGE_PATHS).map(([key, path]) => new Promise((resolve) => {
        const image = new Image();
        let settled = false;
        let timeoutId = 0;
        const finish = (resolvedImage) => {
          if (settled) return;
          settled = true;
          if (timeoutId) window.clearTimeout(timeoutId);
          assets[key] = resolvedImage;
          this.loaded += 1;
          this.progress = this.loaded / this.total;
          if (onProgress) onProgress(this.progress, key);
          resolve(resolvedImage);
        };

        image.onload = () => finish(image);
        image.onerror = () => {
          console.warn(`Failed to load sprite asset: ${path}`);
          finish(null);
        };
        timeoutId = window.setTimeout(() => {
          console.warn(`Timed out loading sprite asset: ${path}`);
          finish(null);
        }, 4000);
        image.src = new URL(path, import.meta.url).href;
        if (image.complete && image.naturalWidth > 0) finish(image);
      })),
    ).then(() => assets);

    return this.promise;
  }
}
