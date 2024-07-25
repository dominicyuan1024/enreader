<template>
  <div class="notes fix-footer fix-header">
    <h3 class="page-header">
      笔记<van-tag color="hsla(160, 100%, 37%, 1)" round size="small" style="margin-left: 5px">{{
        noteList.length
      }}</van-tag>
    </h3>
    <van-floating-bubble
      :offset="deleteBtnOffset"
      :style="
        isEditing
          ? 'background-color: hsla(2, 100%, 37%, 1)'
          : 'background-color: rgba(200,200,200)'
      "
      icon="delete"
      axis="y"
      @click="isEditing = !isEditing"
    />
    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <van-cell v-for="(item, idx) in noteList" :key="item.id" :title="item.content">
        <p v-html="item.ctxHtml"></p>
        <template #label>
          {{ item.defEN }}
          <span class="mosaic" @click="(evt) => evt.target.classList.toggle('mosaic')">{{
            item.defCN
          }}</span>
        </template>
        <div v-if="isEditing" class="absolute-cover align-center">
          <van-icon
            name="delete"
            style="font-size: 1.5rem; color: hsla(2, 100%, 37%, 1)"
            @click="deleteNote(idx)"
          ></van-icon>
        </div>
      </van-cell>
    </van-list>
  </div>
</template>

<script setup>
import DB from '../db/db.js'
import { ref, reactive } from 'vue'
const noteList = reactive([])
const loading = ref(false)
const finished = ref(false)
const isEditing = ref(false)
const deleteBtnOffset = { y: window.innerHeight - 120 }
function viewNote() {
  DB.listBookmarkAll()
    .then((data) => {
      if (typeof data.splice === 'function') {
        data.sort((pre, cur) => cur.utime - pre.utime)
        data.forEach((item) => {
          item.ctxHtml = item.ctx.replace(
            ` ${item.content}`,
            ` <span style="border-bottom:1px solid;">${item.content}</span>`
          )
        })
        noteList.splice(0, noteList.length + 1, ...data)
      }
    })
    .catch((err) => console.error('viewNote listBookmark', err))
}
viewNote()
function onLoad() {
  loading.value = false
  finished.value = true
}
function deleteNote(idx) {
  const { bookHash, cfi } = noteList[idx]
  DB.deleteBookmark(bookHash, cfi)
    .then((data) => {
      noteList.splice(idx, 1)
      console.log('deleteNote', data)
    })
    .catch((err) => console.error('deleteNote', err))
}
</script>
<style scoped>
.align-center {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
