import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAlertsStore = create(
  persist(
    (set, get) => ({
      alerts: [],
      unacknowledged: 0,

      addAlert: (alert) =>
        set(s => ({
          alerts: [...s.alerts, {
            ...alert,
            id: crypto.randomUUID(),
            triggered: false,
            triggeredAt: null,
            createdAt: new Date().toISOString(),
          }],
        })),

      removeAlert: (id) =>
        set(s => ({ alerts: s.alerts.filter(a => a.id !== id) })),

      triggerAlert: (id) =>
        set(s => ({
          alerts: s.alerts.map(a =>
            a.id === id ? { ...a, triggered: true, triggeredAt: new Date().toISOString() } : a
          ),
          unacknowledged: s.unacknowledged + 1,
        })),

      acknowledgeAll: () => set({ unacknowledged: 0 }),

      clearTriggered: () =>
        set(s => ({ alerts: s.alerts.filter(a => !a.triggered) })),

      // Reactiva una alerta disparada (útil para alertas recurrentes)
      resetAlert: (id) =>
        set(s => ({
          alerts: s.alerts.map(a =>
            a.id === id ? { ...a, triggered: false, triggeredAt: null } : a
          ),
        })),

      getActiveCount: () => get().alerts.filter(a => !a.triggered).length,
    }),
    { name: 'orion-alerts' }
  )
)
