export function quoteArg(arg: string): string {
  if (arg.length === 0) return "''";
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function formatCommand(cmd: string, args: string[]): string {
  return [cmd, ...args].map(quoteArg).join(" ");
}

export function formatRunHeader(cmd: string, args: string[], cwd: string, timeoutSec: number, stdinNote?: string): string {
  const lines = [`$ ${formatCommand(cmd, args)}`, `cwd: ${cwd}`, `timeout: ${timeoutSec}s`];
  if (stdinNote) lines.push(`stdin: ${stdinNote}`);
  return lines.join("\n");
}
