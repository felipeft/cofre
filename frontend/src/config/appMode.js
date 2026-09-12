export const APP_MODE = import.meta.env.VITE_APP_MODE === 'demo' ? 'demo' : 'production'
export const isDemoMode = APP_MODE === 'demo'
