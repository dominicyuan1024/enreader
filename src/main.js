import './assets/main.css'

import 'vant/lib/index.css'
import vant from 'vant'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vant)

app.mount('#app')

window.Log = function (data) {
  try {
    JSON.stringify(data)
    console.dir(data)
  } catch (error) {
    console.log(data)
  }
}
