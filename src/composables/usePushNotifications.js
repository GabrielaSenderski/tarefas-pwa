import { ref } from 'vue'
import api from '../api/config'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)

  return Uint8Array.from(
    [...rawData].map((c) => c.charCodeAt(0))
  )
}

export function usePushNotifications() {
  const isSupported = ref(
    'Notification' in window &&
    'PushManager' in window &&
    'serviceWorker' in navigator
  )

  const permission = ref(
    isSupported.value
      ? Notification.permission
      : 'denied'
  )

  async function requestPermission() {
    if (!isSupported.value) {
      console.warn('[Push] Push notifications não são suportadas.')
      return false
    }

    const result = await Notification.requestPermission()
    permission.value = result

    return result === 'granted'
  }

  async function subscribe(swRegistration) {
    if (!isSupported.value || !swRegistration) {
      console.warn('[Push] Service Worker não disponível.')
      return null
    }

    try {
      let vapidKey = VAPID_PUBLIC_KEY

      // Busca a chave no backend caso não esteja no .env
      if (!vapidKey) {
        const { data } = await api.get('/api/vapid-public-key')
        vapidKey = data.publicKey
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await api.post('/api/subscriptions', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(
            String.fromCharCode(
              ...new Uint8Array(
                subscription.getKey('p256dh')
              )
            )
          ),
          auth: btoa(
            String.fromCharCode(
              ...new Uint8Array(
                subscription.getKey('auth')
              )
            )
          ),
        },
      })

      localStorage.setItem(
        'push_endpoint',
        subscription.endpoint
      )

      return subscription
    } catch (err) {
      console.error('[Push] subscribe failed:', err)
      return null
    }
  }

  async function unsubscribe() {
    if (!isSupported.value) {
      console.warn('[Push] Service Worker não disponível.')
      return
    }

    try {
      // Verifica novamente antes de acessar navigator.serviceWorker
      if (!('serviceWorker' in navigator)) {
        console.warn('[Push] Service Worker não disponível.')
        localStorage.removeItem('push_endpoint')
        return
      }

      const reg = await navigator.serviceWorker.ready

      const subscription =
        await reg.pushManager.getSubscription()

      if (!subscription) {
        localStorage.removeItem('push_endpoint')
        return
      }

      await api.delete('/api/subscriptions', {
        data: {
          endpoint: subscription.endpoint,
        },
      })

      await subscription.unsubscribe()

      localStorage.removeItem('push_endpoint')
    } catch (err) {
      console.error('[Push] unsubscribe failed:', err)

      // Mesmo se o Service Worker falhar,
      // não deixa o endpoint antigo preso no navegador.
      localStorage.removeItem('push_endpoint')
    }
  }

  return {
    isSupported,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
  }
}
