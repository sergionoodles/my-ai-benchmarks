// Buggy fixture — the agent must fix toggle() and remove().
let nextId = 1;
const items = [];

function add(title) {
  const item = { id: nextId++, title, done: false };
  items.push(item);
  return item;
}

function toggle(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  // BUG: forgets to flip `done`
  return item;
}

function remove(id) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  // BUG: off-by-one
  items.splice(idx + 1, 1);
  return true;
}

function list() {
  return items.slice();
}

module.exports = { add, toggle, remove, list };
