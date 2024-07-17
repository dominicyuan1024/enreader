<template>
  <main class="bookcase fix-footer fix-header">
    <h3 class="page-header">
      书架<van-tag color="hsla(160, 100%, 37%, 1)" round size="small" style="margin-left: 5px;">{{ books.length }}</van-tag>
    </h3>
    <div id="book-list">
      <van-grid column-num="3" :border="false">
        <van-grid-item icon="photo-o" text="文字">
          <div class="upload-book-btn">
            <van-uploader :after-read="uploadFileList" accept="application/epub+zip" multiple>
              <p class="upload-book-btn-txt">
                <van-button
                  round
                  type="success"
                  color="rgba(200,200,200,1)"
                  icon="plus"
                ></van-button>
              </p>
            </van-uploader>
          </div>
        </van-grid-item>
        <van-grid-item v-for="item in books" :key="item.hash" icon="photo-o">
          <div>
            <RouterLink :to="{ path: '/book', query: { hash: item.hash, title: item.title } }">
              <van-image
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
            <van-text-ellipsis :content="item.title" :rows="item.ellipsisRow">*</van-text-ellipsis>
            <!-- <van-text-ellipsis :content="'-' + item.author" rows="1" /> -->
          </div>
        </van-grid-item>
      </van-grid>
    </div>
  </main>
</template>

<script setup>
import Epub from 'epubjs'
import Md5 from 'blueimp-md5'
import DB from '../db/db.js'
import { onUpdated, reactive } from 'vue'
import { showLoadingToast } from 'vant'
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
onUpdated(() => {
  books.forEach((item) => {
    if (!item.ellipsisRow) {
      item.ellipsisRow = 1
    }
  })
})
</script>

<style>
#book-list {
  padding: 1rem;
  font-size: 12px;
}
.upload-book-btn {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
}
.upload-book-btn-txt {
}
#book-list .van-grid-item__content--center {
  justify-content: end;
}
</style>
