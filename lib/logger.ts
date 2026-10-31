type Level = "info" | "warn" | "error";

function write(level: Level, message: string, meta?: unknown) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, message, meta });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  info: (m: string, meta?: unknown) => write("info", m, meta),
  warn: (m: string, meta?: unknown) => write("warn", m, meta),
  error: (m: string, meta?: unknown) => write("error", m, meta),
};
