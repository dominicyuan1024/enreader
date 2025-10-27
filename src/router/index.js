import { createRouter, createWebHashHistory } from 'vue-router'
import Bookcase from '../views/Bookcase.vue'
import Book from '../views/Book.vue'
import Setting from '../views/Setting.vue'
import Note from '../views/Note.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'bookcase',
      component: Bookcase
    },
    {
      path: '/book',
      name: 'book',
      component: Book
    },
    {
      path: '/setting',
      name: 'setting',
      component: Setting
    },
    {
      path: '/note',
      name: 'note',
      component: Note
    }
  ]
})

export default router
