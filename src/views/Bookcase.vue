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
            </RouterLink>
            <van-progress
              :percentage="item.progress"
              stroke-width="2"
              color="hsla(160, 100%, 37%, 1)"
              :show-pivot="false"
            />
            <div class="book-editing" v-if="isEditingBook">
              <van-button
                color="hsla(2, 100%, 37%, 1)"
                icon="delete"
                @click="deleteBook(item)"
              ></van-button>
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
import { reactive, ref } from 'vue'
import { showLoadingToast } from 'vant'
const btnAddBookOffset = { y: window.innerHeight - 180 }
const btnDelBookOffset = { y: window.innerHeight - 120 }
let books = reactive([])
const uploadFileList = (file) => {
  if (!(file instanceof Array)) {
    file = [file]
  }
  let bookHashSet = new Set()
  books.forEach((item) => {
    bookHashSet.add(item.hash)
  })
  file.forEach((item) => {
    let hash = Md5(item.content)
    if (bookHashSet.has(hash)) {
      console.log(hash, 'alredy exist')
      return
    }
    bookHashSet.add(hash)
    let bookInfo = reactive({ hash: hash })
    let ebook = Epub()
    ebook.open(item.file, 'binary')
    ebook.loaded.metadata
      .then((meta) => {
        bookInfo.title = meta.title
        bookInfo.author = meta.creator
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
      })
      .catch((e) => {
        console.error(e)
      })
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

let loadingCtrl
async function refreshBookcase() {
  loadingCtrl = showLoadingToast({
    duration: 0,
    message: '',
    forbidClick: true,
    loadingType: 'spinner'
  })
  const data = await DB.listBookMeta()
  if (!data) {
    console.error('listBookMeta', data)
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
  justify-content: flex-end;
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(200, 200, 200, 0.7);
  left: 0;
  top: 0;
}
</style>
