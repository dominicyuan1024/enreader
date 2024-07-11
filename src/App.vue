<template>
  <RouterView style="min-height: calc(100vh - 3rem)" />
  <header class="app-header">
    <van-sticky>
      <van-tabbar
        v-model="navActive"
        :fixed="false"
        :before-change="preventNavChange"
        active-color="hsla(160, 100%, 37%, 1)"
      >
        <van-tabbar-item
          v-for="item in navList"
          :name="item.tit"
          :icon="item.icon"
          :key="item.to"
          :to="item.to"
          >{{ item.tit }}</van-tabbar-item
        >
        <van-tabbar-item icon="good-job-o" @click="genShare">打卡</van-tabbar-item>
        <van-tabbar-item icon="star-o" @click="installPWA">PWA</van-tabbar-item>
        <van-tabbar-item
          icon="ellipsis"
          @click="handleShowMore"
          :badge="showMoreBadge"
          :badge-props="{ 'show-zero': false, color: 'hsla(160, 100%, 37%, 1)', offset: [5, -4] }"
        ></van-tabbar-item>
      </van-tabbar>
      <nav></nav>
    </van-sticky>
    <van-popup v-model:show="showShare" position="top">
      <share v-if="showShare"></share>
    </van-popup>
    <van-popup v-model:show="showMore" position="bottom">
      <div style="text-align: center; padding: 4rem 0">
        <h1>暂无更多</h1>
        <h1>来日方长</h1>
        <h1>尽请期待</h1>
      </div>
    </van-popup>
  </header>
</template>

<script setup>
import share from './components/share.vue'
import { RouterView, useRouter } from 'vue-router'
import { ref, watch, reactive } from 'vue'
const navList = [
  { icon: 'wap-home', to: '/', tit: '书架' },
  { icon: 'comment', to: '/word', tit: '笔记' },
  { icon: 'setting', to: '/setting', tit: '设置' }
]
const navActive = ref('')
const showShare = ref(false)
const showMore = ref(false)
const showMoreBadge = ref(0)
const router = useRouter()
const routePath = router.currentRoute
watch(reactive(routePath), (to) => {
  if (to.path === '/book') {
    showMoreBadge.value = 5
  }
  const curNav = navList.filter((item) => item.to === to.path)
  if (curNav.length === 0) {
    navActive.value = ''
    return
  }
  navActive.value = curNav[0].tit
})
function installPWA() {
  const deferredPrompt = window.deferredPrompt
  if (!deferredPrompt) {
    console.error('deferredPrompt not exist')
    return
  }
  // 触发提示
  deferredPrompt.prompt()
  // 等待用户的响应
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === `accepted`) {
      console.log(`用户接受了 A2HS 提示`)
    } else {
      console.log(`用户拒绝了 A2HS 提示`)
    }
  })
}
function genShare() {
  showShare.value = true
}
function handleShowMore() {
  showMore.value = true
}
function preventNavChange(name) {
  return navList.filter((item) => item.tit === name).length ? true : false
}
</script>

<style scoped>
.app-header {
  width: 100%;
  height: 3rem;
}
.small-font {
}
@media (min-width: 1024px) {
  /* header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  } */
}
</style>
