export type AppLogLevel = 'debug' | 'info' | 'warning' | 'error'

const LOG_LEVEL_PRIORITY: Record<AppLogLevel, number> = {
  debug: 10,
  info: 20,
  warning: 30,
  error: 40,
}

export function isLogLevel(value: unknown): value is AppLogLevel {
  return value === 'debug' || value === 'info' || value === 'warning' || value === 'error'
}

export function meetsMinimumLogLevel(level: AppLogLevel, minimumLevel: AppLogLevel) {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minimumLevel]
}
