<template>
  <RouterView style="min-height: 100vh; overflow-y: scroll" />
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
        ></van-tabbar-item>
        <van-tabbar-item icon="good-job-o" @click="genShare">打卡</van-tabbar-item>
        <!-- <van-tabbar-item icon="star-o" @click="installPWA">PWA</van-tabbar-item> -->
        <van-tabbar-item
          icon="ellipsis"
          @click="handleShowMore"
          :badge="showMoreBadge"
          :badge-props="{ 'show-zero': false, color: 'hsla(160, 100%, 37%, 1)', offset: [5, -4] }"
        ></van-tabbar-item>
      </van-tabbar>
    </van-sticky>
  </header>
  <van-popup v-model:show="showShare" position="top">
    <share v-if="showShare"></share>
  </van-popup>
  <van-popup v-model:show="showMore" position="bottom">
    <div class="more-content">
      <h1>暂无更多</h1>
      <h1>尽请期待</h1>
      <p class="copyright">Copyright © 2025 DominicYuan1024</p>
    </div>
  </van-popup>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
const share = defineAsyncComponent(() =>
  import('./components/share.vue') // 注意路径要正确
)
import { RouterView, useRouter } from 'vue-router'
import { ref, watch, reactive } from 'vue'
import { ebus, ename } from './stores/events.js'
const navList = [
  { icon: 'wap-home', to: '/', tit: '书架' },
  { icon: 'records', to: '/note', tit: '笔记' },
  { icon: 'user', to: '/setting', tit: '设置' }
]
const navActive = ref('')
const showShare = ref(false)
const showMore = ref(false)
const showMoreBadge = ref(0)
const router = useRouter()
const routePath = router.currentRoute
watch(reactive(routePath), (to) => {
  if (to.path === '/book') {
    showMoreBadge.value = 3
  } else {
    showMoreBadge.value = 0
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
  ebus.emit(ename.NavMore)
  showMoreBookcase()
}
function showMoreBookcase() {
  router.currentRoute.value.path !== '/book' ? (showMore.value = true) : null
}
function preventNavChange(name) {
  return navList.filter((item) => item.tit === name).length ? true : false
}
</script>

<style scoped>
.app-header {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 3rem;
}
@media (min-width: 1024px) {
  /* header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  } */
}
.more-content{
  text-align: center;
  padding-top: 2rem;
}
.more-content .copyright{
  margin-top: 1rem;
  font-size: 0.8rem;
  opacity: 0.5;
}
</style>
