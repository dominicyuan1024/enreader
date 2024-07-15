<template>
  <main class="book-wrap">
    <div class="book">
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
        <!-- <van-button type="primary" color="hsla(160, 100%, 37%, 1)" @click="viewMark"
          >笔记</van-button
        >
        <van-button type="primary" color="hsla(160, 100%, 37%, 1)" @click="showNav = true"
          >目录</van-button
        > -->
        <p style="font-size: 0.6rem; padding-right: 0.5rem; padding-top: 0.5rem">
          {{ curPage ? '本章:' + curPage : '' }}
          {{ bookProgress ? '全书:' + bookProgress + '%' : '' }}
        </p>
        <van-progress
          :percentage="bookProgress"
          stroke-width="2"
          color="hsla(160, 100%, 37%, 1)"
          :show-pivot="false"
        />
      </div>
    </div>
  </main>
</template>

<script setup>
import Epub from 'epubjs'
import DB from '../db/db.js'
import { ref, reactive, onMounted, onUnmounted } from 'vue'
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
const bookProgress = ref(0)
const themeList = [
  {
    alias: '默认',
    name: 'Default',
    style: {
      body: {
        color: '#000',
        background: '#ccc58f'
      }
    }
  },
  {
    alias: '雅致',
    name: 'Gold',
    style: {
      body: {
        color: '#5c5b56',
        background: '#c6c2b6'
      }
    }
  },
  {
    alias: '护眼',
    name: 'Eye',
    style: {
      body: {
        color: '#404c42',
        background: '#a9c1a9'
      }
    }
  },
  {
    alias: '夜晚',
    name: 'Night',
    style: {
      body: {
        color: '#cecece',
        background: '#000000'
      }
    }
  }
]
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
    flow: 'paginated', // 分页模式 'paginated' | 'scrolled'
    // flow: "scrolled-doc",
    manager: 'continuous', // 连续滑屏模式 'continuous' | 'default'
    snap: true, // 是否支持翻页
    width: '100%',
    height: '100%',
    spread: false // 是否显示双页
    // ignoreClass?: string; // 忽略类名
    // view?: 'iframe' | Object | Function; // 视图容器
    // minSpreadWidth?: number; // 最小触发双页的宽度
    // resizeOnOrientationChange?: boolean; // 在窗口 resize 时调整内容尺寸
    // script?: string; // 注入到 View 中的 js 代码
    // stylesheet?: string; // 注入到 View 中的 css 样式
    // infinite?: boolean; // 是否无限翻页
    // overflow?: string; // 设置视图的 CSS overflow 属性
    // defaultDirection?: string; // 阅读方向
    // allowScriptedContent?: boolean; // iframe 沙盒是否能够执行 js
  })
  rendition.hooks.render.register((iframeView) => {
    preventBookDefaultEvent(iframeView.document)
  })
  if (!cfi) {
    cfi = await DB.getBookCfi(bookHash)
  }
  cfi ? rendition.display(cfi) : rendition.display()
  ebook.ready
    .then(() => {
      highlightHistory()
      registTheme()
      rendition.themes.select('Default')
      return ebook.locations.generate(1600)
    })
    .then(() => {
      onProgress(rendition.currentLocation())
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
  const curRoute = router.currentRoute
  const query = curRoute.value.query
  router.replace({
    path: curRoute.value.path,
    query: { ...query, cfi: cfi }
  })
  cfi ? DB.putBookCfi(bookHash, cfi).catch((e) => console.error('putBookCfi', bookHash, e)) : null
  const percentage = ebook.locations.percentageFromCfi(cfi)
  if (typeof percentage !== 'number') {
    return
  }
  DB.putBookPercentage(bookHash, percentage)
    .then(() => {
      viewProgress(percentage)
    })
    .catch((e) => console.error('putBookCfi', bookHash, e))
}

function getSelectCtx(range) {
  const txt = range.commonAncestorContainer.data
  const startOffset = range.startOffset
  const endOffset = range.endOffset
  let ctxStart = 0
  let ctxEnd = txt.length
  const alphabet = [...'abcdefghijklmnopqrstuvwxyz- ']
  for (let i = startOffset; i >= 0; i--) {
    const letter = txt[i].toLowerCase()
    if (alphabet.indexOf(letter) < 0) {
      ctxStart = i
      break
    }
  }
  for (let i = endOffset; i < txt.length; i++) {
    const letter = txt[i].toLowerCase()
    if (alphabet.indexOf(letter) < 0) {
      ctxEnd = i
      break
    }
  }
  ctxStart > 0 ? ctxStart++ : null
  return txt.substring(ctxStart, ctxEnd).trim()
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
      const ctx = getSelectCtx(range)
      return DB.putBookmark({
        bookHash,
        cfi: cfiRange,
        content: txt,
        description: '',
        ctx: ctx
      })
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
  e.preventDefault()
}
function preventBookDefaultEvent(doc) {
  ;['touchmove'].forEach((ename) => {
    doc.removeEventListener(ename, preventDefaultHandler)
    doc.addEventListener(ename, preventDefaultHandler, {
      passive: false
    })
  })
}
function registTheme() {
  themeList.forEach((theme) => {
    // 'padding-bottom': `${realPx(30)}px!important`
    theme.style.body['padding-bottom'] = '2rem!important'
    rendition.themes.register(theme.name, theme.style)
  })
}
function viewProgress(percentage) {
  bookProgress.value = Math.floor(percentage * 100)
}
onMounted(async () => {
  console.log('mount book')
  router = useRouter()
  const query = router.currentRoute.value.query
  bookHash = query.hash
  renderBook()
  DB.getBookPercentage(bookHash)
    .then(viewProgress)
    .catch((e) => console.error('mount getBookPercentage', bookHash, e))
})
onUnmounted(() => {
  console.log('unmounted book')
  if (rendition) {
    rendition.clear()
    rendition.destroy()
    ebook.destroy()
    rendition = null
    ebook = null
  }
  // revertDefaultTouch()
})
</script>

<style scoped>
.book {
  height: calc(100vh - 3rem);
  overflow: hidden;
  position: relative;
}
#reading {
  height: 100%;
  /* padding-bottom: 3rem; */
  width: 100vw;
}
.tool {
  padding-top: 2px;
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100%;
  /* height: 3rem; */
  text-align: right;
  vertical-align: text-bottom;
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
