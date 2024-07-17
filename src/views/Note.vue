<template>
  <div class="notes fix-footer fix-header">
    <h3 class="page-header">
      笔记<van-tag color="hsla(160, 100%, 37%, 1)" round size="small" style="margin-left: 5px;">{{ markList.length }}</van-tag>
    </h3>
    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <van-cell v-for="item in markList" :key="item.id" :title="item.content">
        {{ item.ctx }}
      </van-cell>
    </van-list>
  </div>
</template>

<script setup>
import DB from '../db/db.js'
import { ref, reactive } from 'vue'
const markList = reactive([])
const loading = ref(false)
const finished = ref(false)
function viewMark() {
  DB.listBookmarkAll()
    .then((data) => {
      if (typeof data.splice === 'function') {
        data.sort((pre, cur) => cur.utime - pre.utime)
        markList.splice(0, markList.length + 1, ...data)
      }
    })
    .catch((err) => console.error('viewMark listBookmark', err))
}
viewMark()
function onLoad() {
  loading.value = false
  finished.value = true
}
</script>
<style scoped></style>
