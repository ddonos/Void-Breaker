const SAVE_KEY = 'voidbreaker_save';

const defaultSave = {
  hiScores: [],
  unlocks: { skin1: false, skin2: false },
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultSave));
}

export function loadSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!parsed || typeof parsed !== 'object') return cloneDefault();
    return {
      hiScores: Array.isArray(parsed.hiScores)
        ? parsed.hiScores.slice(0, 10).map((entry) => ({
          initials: entry?.initials || '---',
          score: Math.round(entry?.score || 0),
          wave: Math.round(entry?.wave || 0),
          difficulty: entry?.difficulty || 'pilot',
        }))
        : [],
      unlocks: {
        skin1: !!(parsed.unlocks?.skin1 || parsed.unlocks?.skin_1),
        skin2: !!(parsed.unlocks?.skin2 || parsed.unlocks?.skin_2),
      },
    };
  } catch {
    return cloneDefault();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {}
}

export function submitScore(initials, score, wave, difficulty = 'pilot') {
  const save = loadSave();
  save.hiScores.push({ initials, score, wave, difficulty });
  save.hiScores.sort((a, b) => b.score - a.score);
  save.hiScores = save.hiScores.slice(0, 10);
  writeSave(save);
}

export function qualifiesForBoard(score) {
  const save = loadSave();
  return save.hiScores.length < 10 || score > save.hiScores[save.hiScores.length - 1].score;
}
