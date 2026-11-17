// The meta bank: best score, sea glass saved between runs, unlocked beams and the chosen beam.
// Kept in localStorage when the browser allows it and forgotten quietly when it does not.
const KEY = 'tide-keeper-meta-v2';

export function freshMeta() {
  return { best: 0, bank: 0, unlocked: { sun: true, prism: false, ember: false }, beam: 'sun', runs: 0, wins: 0 };
}

export function loadMeta() {
  const meta = freshMeta();
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    if (Number.isFinite(raw.best)) meta.best = Math.max(0, raw.best);
    if (Number.isFinite(raw.bank)) meta.bank = Math.max(0, raw.bank);
    if (Number.isFinite(raw.runs)) meta.runs = raw.runs;
    if (Number.isFinite(raw.wins)) meta.wins = raw.wins;
    if (raw.unlocked) {
      meta.unlocked.prism = raw.unlocked.prism === true;
      meta.unlocked.ember = raw.unlocked.ember === true;
    }
    if (meta.unlocked[raw.beam]) meta.beam = raw.beam;
  } catch (error) {
    // No storage, or damaged data: start from a fresh bank.
  }
  return meta;
}

export function saveMeta(meta) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(meta));
  } catch (error) {
    // Private windows and blocked storage just do not remember.
  }
}
