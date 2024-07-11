import { createRouter, createWebHistory } from 'vue-router'
import Bookcase from '../views/Bookcase.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'bookcase',
      component: Bookcase
    },
    {
      path: '/book',
      name: 'book',
      component: () => import('../views/Book.vue')
    },
    {
      path: '/setting',
      name: 'setting',
      component: () => import('../views/Setting.vue')
    },
    {
      path: '/word',
      name: 'word',
      component: () => import('../views/Word.vue')
    },
  ]
})

export default router
