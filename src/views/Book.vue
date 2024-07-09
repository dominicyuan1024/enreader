<template>
  <main class="book">
    <div>
      <p ref="reading" id="reading"></p>
      <van-popup v-model:show="showNav" position="right" closeable>
        <van-index-bar :index-list="[]" style="width: 70vw; padding-top: 2.5rem">
          <!-- <van-index-anchor index="A" /> -->
          <van-cell
            v-for="item in navList"
            :title="item.tit"
            :key="item.id"
            @click="goToChapter(item.href)"
          ></van-cell>
        </van-index-bar>
      </van-popup>
      <van-popup v-model:show="showMark" position="right" closeable>
        <van-index-bar :index-list="[]" style="width: 70vw; padding-top: 2.5rem">
          <van-cell
            v-for="item in markList"
            :title="item.content"
            :key="item.cfi"
            @click="goToChapter(item.cfi)"
            ><p>{{ item.description }}</p></van-cell
          >
        </van-index-bar>
      </van-popup>
      <van-popup v-model:show="showTranslate" position="right" closeable>
        <div style="width: 70vw; padding: 2.5rem" id="translated" v-html="translateInfo"></div>
      </van-popup>
      <div class="tool">
        <span>{{ curPage }}</span>
        <van-button type="primary" color="hsla(160, 100%, 37%, 1)" @click="viewMark"
          >笔记</van-button
        >
        <van-button type="primary" color="hsla(160, 100%, 37%, 1)" @click="showNav = true"
          >目录</van-button
        >
      </div>
    </div>
  </main>
</template>

<script>
import Epub from 'epubjs'
import DB from '../db/db.js'
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { lookup } from '../db/translate.js'
let usingDict
let ebook
let rendition
let navList = reactive([])
const showNav = ref(false)
const curPage = ref('')
const showMark = ref(false)
const markList = reactive([])
const showTranslate = ref(false)
const translateInfo = ref('')
let bookHash
let router
async function renderBook() {
  const curRoute = router.currentRoute
  const query = curRoute.value.query
  let cfi = query.cfi
  const res = await DB.getBookContent(bookHash)
  if (!res || !res.content) {
    console.error('getBookContent', res)
  }
  ebook = Epub()
  ebook.open(res.content, 'binary')
  rendition = ebook.renderTo('reading', {
    flow: 'paginated', // 分页模式
    manager: 'continuous', // 连续滑屏模式
    snap: true, // 吸附到页面边缘
    width: '100%',
    height: '100%'
  })
  if (!cfi) {
    cfi = await DB.getBookCfi(bookHash)
  }
  cfi ? rendition.display(cfi) : rendition.display()
  ebook.ready.then(() => {
    ebook.locations.generate(1600)
    highlightHistory()
    preventDefaultTouch()
  })
  ebook.loaded.navigation.then(refreshBookNav)
  rendition.on('keyup', onKeyUp)
  rendition.themes.default(hlTheme())
  rendition.on('markClicked', onHighlightClick)
  rendition.on('selected', highlightSelected)
  rendition.on('relocated', onProgress)
}
function hlTheme() {
  return {
    '::selection': {
      background: 'rgba(255,255,0, 0.3)'
    },
    '.epubjs-hl': {
      fill: 'yellow',
      'fill-opacity': '0.3',
      'mix-blend-mode': 'multiply'
    }
  }
}
function highlightHistory() {
  DB.listBookmark(bookHash)
    .then((data) => {
      if (typeof data.splice === 'function') {
        data.forEach((item) => {
          rendition.annotations.highlight(item.cfi)
        })
      }
    })
    .catch((err) => console.error('highlightHistoryMark listBookmark', err))
}
function onHighlightClick(cfiRange) {
  // rendition.annotations.hide(cfiRange)
  rendition.annotations.remove(cfiRange)
  // rendition.manager.views.forEach(item=>{
  //     item.unhighlight(cfiRange)
  //   })
  let queryTxt
  ebook
    .getRange(cfiRange)
    .then((range) => {
      return Promise.resolve(range.toString())
    })
    .then((txt) => {
      queryTxt = txt
      if (!usingDict) {
        let dictHash = localStorage.getItem('dict-using-hash')
        return DB.getBookContent(dictHash)
      }
      return Promise.resolve(usingDict)
    })
    .then((dictFile) => {
      usingDict = dictFile
      return lookup(usingDict.content, queryTxt)
    })
    .then((translatedDom) => {
      showTranslate.value = true
      translateInfo.value = translatedDom.html()
    })
    .catch((err) => console.error('translated', err))
}
function onProgress(location) {
  if (!location || !location.start) {
    return
  }
  const displayed = location.start.displayed
  if (displayed) {
    const cur = displayed.page ? displayed.page : ''
    const total = displayed.total ? displayed.total : ''
    curPage.value = displayed.total ? `${cur}/${total}` : ''
  }
  const cfi = location.start.cfi
  const percentage = ebook.locations.percentageFromCfi(cfi) || 0
  const curRoute = router.currentRoute
  const query = curRoute.value.query
  router.replace({
    path: curRoute.value.path,
    query: { ...query, cfi: cfi }
  })
  cfi ? DB.putBookCfi(bookHash, cfi).catch((e) => console.error('putBookCfi', bookHash, e)) : null
  percentage
    ? DB.putBookPercentage(bookHash, percentage).catch((e) =>
        console.error('putBookCfi', bookHash, e)
      )
    : null
}
function highlightSelected(cfiRange, contents) {
  ebook
    .getRange(cfiRange)
    .then((range) => {
      const txt = range ? range.toString().trim() : ''
      if (!txt) {
        return
      }
      const exist = markList.filter((item) => {
        return item.cfi == cfiRange && item.content == txt
      })
      if (exist.length) {
        return
      }
      return DB.putBookmark({ bookHash, cfi: cfiRange, content: txt, description: '' })
    })
    .then((data) => {
      rendition.annotations.highlight(cfiRange, {})
      markList.push(data)
      contents.window.getSelection().removeAllRanges()
    })
    .catch((err) => console.error('highlight', cfiRange, err))
}
function onKeyUp(e) {
  if ((e.keyCode || e.which) == 37) {
    rendition.prev()
  }
  if ((e.keyCode || e.which) == 39) {
    rendition.next()
  }
}
function refreshBookNav(toc) {
  const list = []
  const addNav = (tocList, prefix) => {
    prefix = prefix ? prefix : ''
    const usePrefix = prefix.substr(1)
    tocList.forEach((chapter, idx) => {
      list.push({
        id: idx,
        tit: usePrefix + chapter.label,
        href: chapter.href
      })
      if (!chapter.subitems) {
        return
      }
      addNav(chapter.subitems, prefix + prefix + prefix)
    })
  }
  addNav(toc, '-')
  navList.splice(0, navList.length + 1, ...list)
}
function goToChapter(href) {
  rendition.display(href).catch((err) => {
    console.error('goToChapter err', href, err)
    goToSearchChapter(href)
  })
  showNav.value = false
  showMark.value = false
}
function goToSearchChapter(targetHref) {
  const spineByHref = ebook.spine ? ebook.spine.spineByHref : []
  if (spineByHref.length === 0) {
    return
  }
  if (targetHref.startsWith('/')) targetHref = targetHref.replace('/', '')
  else if (targetHref.startsWith('../')) targetHref = targetHref.replace('../', '')
  targetHref = targetHref.replace(/(?!^)#.*/, '')
  for (let href in ebook.spine.spineByHref) {
    if (href.indexOf(targetHref) >= 0) {
      targetHref = href
      break
    }
  }
  rendition
    .display(targetHref)
    .catch((err) => console.error('goToSearchChapter err', targetHref, err))
}
function viewMark() {
  DB.listBookmark(bookHash)
    .then((data) => {
      if (typeof data.splice === 'function') {
        data.sort((pre, cur) => cur.utime - pre.utime)
        markList.splice(0, markList.length + 1, ...data)
        showMark.value = true
      }
    })
    .catch((err) => console.error('viewMark listBookmark', err))
}
function preventDefaultHandler(e) {
  console.log('preventDefaultHandler')
  e.preventDefault()
}
const toucheEname = ['touchstart', 'touchmove']
function preventDefaultTouch() {
  toucheEname.forEach((ename) => {
    document.addEventListener(ename, preventDefaultHandler, {
      passive: false
    })
  })
}
function revertDefaultTouch() {
  toucheEname.forEach((ename) => {
    document.removeEventListener(ename, preventDefaultHandler)
  })
}
export default {
  setup() {
    return {
      onKeyUp,
      goToChapter,
      curPage,
      showNav,
      navList,
      showMark,
      markList,
      showTranslate,
      translateInfo,
      viewMark
    }
  },
  async mounted() {
    console.log('mount book')
    router = useRouter()
    const query = router.currentRoute.value.query
    bookHash = query.hash
    renderBook()
  },
  unmounted() {
    console.log('unmounted book')
    if (rendition) {
      rendition.clear()
      rendition.destroy()
      ebook.destroy()
      rendition = null
      ebook = null
    }
    revertDefaultTouch()
  }
}
</script>

<style scoped>
.book {
  background: #0f0;
  height: calc(100vh - 2rem);
}
#reading {
  background-color: #ccc58f;
  height: calc(100vh - 2rem);
  width: 100vw;
  padding: 1rem;
  background-color: hsla(13, 22, 33, 0);
}
.tool {
  position: absolute;
  bottom: 0;
  right: 0;
}
</style>
<style>
#translated ol {
  list-style-type: decimal;
}
#translated ul {
  list-style-type: disc;
}
#translated .def {
  font-weight: bold;
}
#translated deft chn {
  font-weight: bold;
}
</style>
