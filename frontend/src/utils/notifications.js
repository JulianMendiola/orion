// ── Browser push notifications ────────────────────────────

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function fireNotification(alert, displayValue) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const body = {
    above:     `Precio alcanzó $${alert.targetPrice} — actual: $${Number(displayValue).toFixed(2)}`,
    below:     `Precio cayó a $${alert.targetPrice} — actual: $${Number(displayValue).toFixed(2)}`,
    pct_above: `Sube +${alert.threshold}% hoy — variación: +${Number(displayValue).toFixed(1)}%`,
    pct_below: `Cae -${alert.threshold}% hoy — variación: ${Number(displayValue).toFixed(1)}%`,
    rsi_above: `RSI sobrecomprado: ${Number(displayValue).toFixed(1)} ≥ ${alert.threshold}`,
    rsi_below: `RSI sobrevendido: ${Number(displayValue).toFixed(1)} ≤ ${alert.threshold}`,
  }[alert.type] ?? 'Alerta activada'
  try {
    new Notification(`ORION · ${alert.ticker}`, { body, icon: '/favicon.ico' })
  } catch {}
}
