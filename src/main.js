import './assets/main.css'
import 'vant/lib/index.css'
import vant from 'vant'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import VConsole from 'vconsole'
new VConsole({ theme: 'dark' })

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vant)

app.mount('#app')

// document.addEventListener("touchmove", e=>{
//   console.log("touchmove preventDefault")
//   e.preventDefault()
//   console.log("touchmove stopPropagation")
//   e.stopPropagation();
// }, {
//   passive: false
// })