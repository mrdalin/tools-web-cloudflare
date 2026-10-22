import { createApp } from 'vue'
import App from './App.vue'
//router
import router from './router'
//styles
import './styles/tailwind.css'
import './styles/loading.css'
//pinia
import pinia from './store'

const app = createApp(App)
app.use(pinia)
app.use(router)
router.isReady()
  .then(() => app.mount('#app'))
  .catch((error) => console.error('Failed to start app:', error))
  .finally(() => window.dispatchEvent(new Event('youngbar:startup-finished')))
