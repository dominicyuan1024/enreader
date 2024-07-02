<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div class="wrapper">
      <van-sticky>
        <nav>
          <RouterLink to="/"><van-icon name="cart" />书架</RouterLink>
          <!-- <RouterLink to="/table"><van-icon name="eye" />书桌</RouterLink> -->
          <RouterLink to="/settings"><van-icon name="setting" />设置</RouterLink>
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
</style>
