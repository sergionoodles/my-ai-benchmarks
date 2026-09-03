# Bugfix: todo list

The fixture `todo.js` has two bugs:

1. `toggle(id)` does not actually flip the `done` flag.
2. `remove(id)` removes the wrong item (off-by-one).

Fix both bugs in place. Do not change the module's public API (`add`, `toggle`, `remove`, `list`).
Keep the file CommonJS so `node checks/run.js` can require it.
