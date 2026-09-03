# Greenfield script

Write `summarize.mjs` (Node 20+, no dependencies):

- Reads a JSON-lines log file given as the first CLI arg (each line: `{"level":"info|warn|error","msg":string,"ts":string}`).
- Prints a single JSON object to stdout: `{"total":n,"byLevel":{"info":n,"warn":n,"error":n},"topMessages":[string x3]}` where `topMessages` are the 3 most frequent `msg` values.
- Exit 0 on success, non-zero with a usage message when the file is missing.
- A sample input is provided at `sample.log`.
