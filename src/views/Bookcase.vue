<template>
  <main class="bookcase fix-footer fix-header">
    <h3 class="page-header">
      书架<van-tag color="hsla(160, 100%, 37%, 1)" round size="small" style="margin-left: 5px">{{
        books.length
      }}</van-tag>
    </h3>
    <div id="book-list">
      <van-grid column-num="3" :border="false">
        <van-grid-item v-for="item in books" :key="item.hash" icon="photo-o">
          <div style="position: relative">
            <RouterLink :to="{ path: '/book', query: { hash: item.hash, title: item.title } }">
              <van-image
                class="book-case-bookcover"
                v-if="item.cover"
                :src="item.cover"
                fit="cover"
                position="contain bottom"
                style="box-shadow: 5px 0px 8px 0px #999"
              />
              <span
                class="book-case-bookcover-default"
                v-else
                style="box-shadow: 5px 0px 8px 0px #999"
              >
                {{ item.title }}
              </span>
            </RouterLink>
            <van-progress
              :percentage="item.progress"
              stroke-width="2"
              color="hsla(160, 100%, 37%, 1)"
              :show-pivot="false"
            />
            <div class="absolute-cover book-editing" v-if="isEditingBook">
              <van-icon
                style="font-size: 2rem"
                color="hsla(2, 100%, 37%, 1)"
                name="delete"
                @click="deleteBook(item)"
              ></van-icon>
            </div>
          </div>
        </van-grid-item>
      </van-grid>
    </div>
    <van-floating-bubble
      :offset="btnDelBookOffset"
      :style="
        isEditingBook
          ? 'background-color: hsla(2, 100%, 37%, 1)'
          : 'background-color: rgba(200,200,200)'
      "
      icon="delete"
      axis="y"
      @click="toggleIsEditingBook"
    >
    </van-floating-bubble>
    <van-floating-bubble
      :offset="btnAddBookOffset"
      style="background-color: hsla(160, 100%, 37%, 1)"
      axis="y"
    >
      <van-uploader :after-read="uploadFileList" accept="application/epub+zip" multiple>
        <van-icon style="font-size: 1.6rem" name="plus"></van-icon>
      </van-uploader>
    </van-floating-bubble>
  </main>
</template>

<script setup>
import Epub from 'epubjs'
import Md5 from 'blueimp-md5'
import DB from '../db/db.js'
import axios from 'axios'
import { reactive, ref } from 'vue'
import { showLoadingToast } from 'vant'
const btnAddBookOffset = { y: window.innerHeight - 180 }
const btnDelBookOffset = { y: window.innerHeight - 120 }
let loadingCtrl
let books = reactive([])
const uploadFileList = (file) => {
  loadingCtrl = showLoadingToast({
    duration: 0,
    message: '',
    forbidClick: true,
    loadingType: 'spinner'
  })
  if (!(file instanceof Array)) {
    file = [file]
  }
  let bookHashSet = new Set()
  books.forEach((item) => {
    bookHashSet.add(item.hash)
  })

  // 收集所有文件的处理 promise
  const promises = file.map((item) => {
    let hash = Md5(item.content)
    if (bookHashSet.has(hash)) {
      console.log(hash, 'already exist')
      return Promise.resolve({ status: 'skipped', hash }) // 已存在的文件返回 resolved promise
    }
    bookHashSet.add(hash)

    // 封装每个文件的处理逻辑为一个 promise
    return new Promise((resolve, reject) => {
      let bookInfo = reactive({ hash: hash })
      let ebook = Epub()
      ebook.open(item.file, 'binary')
      ebook.loaded.metadata
        .then((meta) => {
          bookInfo.title = meta.title
          bookInfo.author = meta.creator
          if (!ebook.cover) {
            return Promise.resolve('')
          }
          if (ebook.archive) {
            return ebook.archive.getBase64(ebook.cover)
          }
          return Promise.resolve(ebook.cover)
        })
        .then((url) => {
          bookInfo.cover = url
          return
        })
        .then(() => {
          return DB.putBookContent({
            hash,
            content: item.file,
            filename: item.file.name,
            format: item.file.type,
            size: item.file.size
          })
        })
        .then((data) => {
          console.log('putBookContent res', data)
          return DB.putBookMeta({
            hash: bookInfo.hash,
            title: bookInfo.title,
            author: bookInfo.author,
            cover: bookInfo.cover,
            progress: 0,
            hashAlg: 'md5'
          })
        })
        .then((data) => {
          console.log('putBookMeta res', data)
          books.unshift(bookInfo)
          resolve({ status: 'fulfilled', hash, bookInfo })
        })
        .catch((e) => {
          console.error('处理书籍失败:', hash, e)
          reject({ status: 'rejected', hash, error: e })
        })
    })
  })

  // 等待所有 promise 完成（无论成功或失败）后关闭 loading
  return Promise.allSettled(promises)
    .then((results) => {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('书籍处理失败:', result.reason)
        }
      })
      loadingCtrl.close()
    })
    .catch((e) => {
      console.error('uploadFileList', e)
      loadingCtrl.close()
    })
}

function deleteBook(book) {
  DB.deleteBook(book.hash)
    .then((res) => {
      console.log('deleteBook', book, res)
      refreshBookcase()
    })
    .catch((e) => {
      console.error('deleteBook', book, e)
    })
}

const isEditingBook = ref(false)
function toggleIsEditingBook() {
  isEditingBook.value = !isEditingBook.value
}

async function refreshBookcase() {
  loadingCtrl = showLoadingToast({
    duration: 0,
    message: '',
    forbidClick: true,
    loadingType: 'spinner'
  })

  let data
  try {
    data = await DB.listBookMeta()
  } catch (e) {
    console.error('listBookMeta', e)
    loadingCtrl.close()
    return Promise.reject(e)
  }
  if (!data || data.length === 0) {
    console.warn('listBookMeta is empty download README.epub')
    let fileRes
    try {
      fileRes = await axios.get('./public/books/README.epub', { responseType: 'blob' })
    } catch (e) {
      console.error('get README.epub', e)
      loadingCtrl.close()
      return Promise.reject(e)
    }
    const fileType = fileRes.data.type
    const title = 'README'
    const file = new File([fileRes.data], title, { type: fileType })
    const content = await file.text()
    try {
      await uploadFileList({ file, content })
    } catch (e) {
      console.error('uploadFileList', e)
      loadingCtrl.close()
      return Promise.reject(e)
    }
    loadingCtrl.close()
    return
  }
  sortBookcase(data)
  books.splice(0, books.length + 1, ...data)
  books.forEach((item) => {
    DB.getBookPercentage(item.hash).then((p) => {
      item.progress = Math.floor(p * 100)
    })
  })
  loadingCtrl.close()
}

function sortBookcase(bookArr) {
  bookArr.sort((pre, cur) => {
    return cur.utime - pre.utime
  })
}
refreshBookcase()
</script>

<style>
#book-list {
  padding: 1rem;
  font-size: 12px;
}
.load-book-btn {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
#book-list .van-grid-item__content--center {
  justify-content: end;
}
.book-editing {
  display: flex;
  justify-content: center;
  align-items: center;
}
.book-case-bookcover-default {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 10rem;
  width: 25vw;
  padding: 0.5rem;
  /* 加到渐变背景 */
  background: linear-gradient(to bottom, #4a6eb0, #2c3e50);
  /* background-color: #4a6eb0; */
  color: white;
  font-size: 1rem;
  word-break: break-all;
  overflow: hidden;
  margin-bottom: 0.4rem;
}
</style>
