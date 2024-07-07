<script setup>
import { RouterLink, RouterView } from 'vue-router'
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
</script>

<template>
  <header>
    <div class="wrapper">
      <van-sticky>
        <nav>
          <RouterLink to="/"><van-icon name="cart" />书架</RouterLink>
          <!-- <RouterLink to="/table"><van-icon name="eye" />书桌</RouterLink> -->
          <RouterLink to="/settings"><van-icon name="setting" />设置</RouterLink>
          <span class="pwa-install" @click="installPWA">PWA</span>
        </nav>
      </van-sticky>
    </div>
  </header>
  <RouterView />
</template>

<style scoped>
header {
  height: 2rem;
  line-height: 1.5;
}
.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

nav {
  background-color: #fff;
  width: 100%;
  font-size: 12px;
  text-align: center;
}

nav a.router-link-exact-active {
  color: hsla(160, 100%, 37%, 1);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
  color: var(--color-text);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  /* header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  } */
}
.pwa-install {
  margin-left: 2rem;
  border: 2px solid;
  border-color: hsla(160, 100%, 37%, 1);
  padding: 2px 0.5rem;
  border-radius: 1rem;
}
.pwa-install:hover {
  cursor: pointer;
  background-color: hsla(160, 100%, 37%, 1);
}
</style>
