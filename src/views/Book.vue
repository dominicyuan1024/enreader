<template>
  <main class="book-wrap">
    <div class="book">
      <p ref="reading" id="reading"></p>
      <div class="book-footer">
        <p>{{ bookTitle }}</p>
        <p>{{ chaptertitle }}</p>
        <p class="book-progress">
          {{ curPage ? '本章:' + curPage : '' }}
          {{ bookProgress ? '全书:' + bookProgress + '%' : '' }}
        </p>
      </div>
      <van-popup v-model:show="showNav" position="left">
        <van-list disabled style="min-height: 100vh; width: 85vw; padding-top: 2.5rem">
          <van-cell
            v-for="item in navList"
            :key="item.href"
            :title="item.tit"
            @click="goToChapter(item.href)"
          >
            <van-icon v-if="item.href === curBookNavHref" name="eye"></van-icon>
          </van-cell>
        </van-list>
      </van-popup>
      <van-popup v-model:show="showMark" position="left">
        <van-list disabled style="min-height: 100vh; width: 85vw; padding-top: 2.5rem">
          <van-cell
            v-for="item in markList"
            :key="item.id"
            :title="item.content"
            @click="goToChapter(item.cfi)"
          >
            {{ item.ctx }}
          </van-cell>
        </van-list>
      </van-popup>
      <van-popup v-model:show="showTranslate" position="left">
        <div style="width: 85vw; padding: 2.5rem" id="translated" v-html="translateInfo"></div>
      </van-popup>
      <van-popup v-model:show="showTheme" position="bottom">
        <div style="padding: 1rem">
          <div style="padding: 1rem; display: flex; align-items: center">
            <span style="flex-shrink: 0; text-align: right; margin-right: 1rem"
              >字体大小<br />{{ curFontSize }}px</span
            >
            <van-slider
              v-model="curFontSize"
              step="1"
              :max="maxFontSize"
              :min="minFontSize"
              @change="setFontSize"
            >
            </van-slider>
          </div>
          <van-radio-group v-model="curTheme" @change="setTheme">
            <van-cell-group inset>
              <van-cell
                clickable
                v-for="item in themeList"
                :key="item.name"
                :title="item.alias"
                @click="curTheme = item.name"
              >
                <template #right-icon>
                  <van-radio :name="item.name"></van-radio>
                </template>
              </van-cell>
            </van-cell-group>
          </van-radio-group>
        </div>
      </van-popup>
      <van-popup v-model:show="showImage" position="top">
        <div class="clicked-image-box">
          <img :src="clickedImageSrc" />
        </div>
      </van-popup>
      <div class="book-tool" v-if="isShowTool">
        <van-button
          square
          type="primary"
          icon="wap-nav"
          color="hsla(160, 100%, 37%, 1)"
          @click="showNav = true"
          >目录</van-button
        >
        <van-button
          square
          type="primary"
          icon="records-o"
          color="hsla(160, 100%, 37%, 1)"
          @click="viewMark"
          >生词</van-button
        >
        <van-button
          square
          type="primary"
          icon="setting-o"
          color="hsla(160, 100%, 37%, 1)"
          @click="showThemeEditor"
          >字体/风格</van-button
        >
        <div class="triangle"></div>
      </div>
      <div id="mark-tool" style="z-index: -1">
        <div v-for="item in markActions" class="button-wrap" :key="item.text">
          <van-button
            square
            size="small"
            type="primary"
            :icon="item.icon"
            color="hsla(160, 100%, 37%, 1)"
            @click="item.handler(item, $event)"
            >{{ item.text }}</van-button
          >
        </div>
        <div class="triangle"></div>
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
import { ebus, ename } from '../stores/events.js'
import { copyToClipboard } from '@/stores/copyToClipboard.js'
import Hammer from 'hammerjs'

let usingDict
let ebook
let rendition
let navList = reactive([])
const curBookNavHref = ref('')
const showNav = ref(false)
const curPage = ref('')
const showMark = ref(false)
const markList = reactive([])
const showTranslate = ref(false)
const translateInfo = ref('')
const bookProgress = ref(0)
const isShowTool = ref(false)
const bookTitle = ref('')
const chaptertitle = ref('')
const clickedImageSrc = ref('')
const showImage = ref(false)
const showTheme = ref(false)
const curTheme = ref('Default')
let defaultFontSize = window.getComputedStyle(document.body).fontSize
defaultFontSize = defaultFontSize.replace('px', '')
defaultFontSize = defaultFontSize ? defaultFontSize : 16
console.log('defaultFontSize', defaultFontSize)
const curFontSize = ref(defaultFontSize)
const minFontSize = 8
const maxFontSize = 36
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
        background: '#ccc58f'
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
let cfiBeforShowTheme = ''
function showMarkTool(isShow = false, left = 0, top = 0) {
  const el = document.querySelector('#mark-tool')
  const rightBorder = left + el.offsetWidth
  if (rightBorder > window.innerWidth) {
    el.style.left = left - el.offsetWidth + 'px'
    el.classList.remove('posi-left')
    el.classList.add('posi-right')
  } else {
    el.style.left = left + 'px'
    el.classList.remove('posi-right')
    el.classList.add('posi-left')
  }
  el.style.top = top + 'px'
  const zindex = isShow ? 1 : -1
  el.style.zIndex = zindex
}
function showThemeEditor() {
  DB.getBookCfi(bookHash).then((res) => {
    showTheme.value = true
    cfiBeforShowTheme = res
  })
}
function setTheme(name) {
  console.log(`set theme ${name}`)
  rendition.themes.select(name)
  showTheme.value = false
  redrawAnnotations()
}
function setFontSize(val) {
  rendition.themes.fontSize(`${val}px`)
  rendition.display(cfiBeforShowTheme)
}

const markActions = [
  { handler: clearHighlight, text: '', icon: 'delete-o' },
  { handler: handleTranslate, text: '', icon: 'question-o' },
  { handler: handleCopy, text: 'copy', icon: '' }
]

function redrawAnnotations() {
  rendition.views().forEach((view) => (view.pane ? view.pane.render() : null))
}

const touchBookEvents = 'swiperight swipeleft'
function touchBook(evt) {
  switch (evt.type) {
    case 'swiperight':
      rendition.prev()
      break
    case 'swipeleft':
      rendition.next()
      break
  }
}

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
    // infinite: true // 是否无限翻页
    // ignoreClass?: string; // 忽略类名
    // view?: 'iframe' | Object | Function; // 视图容器
    // minSpreadWidth?: number; // 最小触发双页的宽度
    // resizeOnOrientationChange?: boolean; // 在窗口 resize 时调整内容尺寸
    // script?: string; // 注入到 View 中的 js 代码
    // stylesheet?: string; // 注入到 View 中的 css 样式
    // overflow?: string; // 设置视图的 CSS overflow 属性
    // defaultDirection?: string; // 阅读方向
    // allowScriptedContent?: boolean; // iframe 沙盒是否能够执行 js
  })
  rendition.on('rendered', () =>
    rendition.views().forEach((view) => (view.pane ? view.pane.render() : null))
  )
  rendition.hooks.render.register((iframeView) => {
    preventBookDefaultEvent(iframeView.document)
    iframeView.document.removeEventListener('click', posiMarkPopover)
    iframeView.document.addEventListener('click', posiMarkPopover)
    iframeView.document.removeEventListener('click', showClickedImg)
    iframeView.document.addEventListener('click', showClickedImg)
    const mc = new Hammer(iframeView.document)
    mc.on(touchBookEvents, touchBook)
  })

  if (!cfi) {
    cfi = await DB.getBookCfi(bookHash)
  }
  cfi ? rendition.display(cfi) : rendition.display()

  ebook.ready
    .then(() => {
      highlightHistory()
      registTheme()
      rendition.themes.select(curTheme.value)
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
function showClickedImg(evt) {
  if (evt.target.tagName === 'image' && evt.target.href) {
    return
  }
  if (evt.target.tagName === 'IMG' && evt.target.src) {
    clickedImageSrc.value = evt.target.src
    showImage.value = true
  }
}
function hlTheme() {
  return {
    '::selection': {
      background: 'rgba(255,255,0, 1)'
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
let isClickHightLight = false
let clickHightLightCfi
let clickHightLightRange
function onHighlightClick(cfiRange) {
  ebook.getRange(cfiRange).then((range) => {
    clickHightLightCfi = cfiRange
    clickHightLightRange = range
    isClickHightLight = true
  })
}
function posiMarkPopover(evt) {
  if (isClickHightLight && clickHightLightRange) {
    isClickHightLight = false
    showMarkTool(true, evt.screenX, evt.pageY)
  } else {
    showMarkTool(false)
    clickHightLightRange = undefined
    clickHightLightCfi = undefined
  }
  isShowTool.value = false
}

function clearHighlight(item, evt) {
  evt.stopPropagation()
  DB.deleteBookmark(bookHash, clickHightLightCfi)
    .then((data) => {
      console.log('deleteBookmark', data)
      rendition.annotations.remove(clickHightLightCfi)
      showMarkTool(false)
    })
    .catch((err) => console.error('clearHighlight', err))
}

function handleTranslate() {
  let queryTxt
  ebook
    .getRange(clickHightLightCfi)
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

function handleCopy() {
  copyToClipboard(clickHightLightRange.toString())
    .then(() => {
      showMarkTool(false)
    })
    .catch((err) => console.error('copyToClipboard', err))
}
function onProgress(location) {
  if (!location || !location.start) {
    return
  }
  const chapterHref = location.start.href
  const hrefArr = chapterHref.split('/')
  let navHref = hrefArr[hrefArr.length - 1]
  const navIdx = navList.findIndex((item) => item.href.indexOf(navHref) >= 0)
  if (navIdx >= 0) {
    curBookNavHref.value = navList[navIdx].href
    chaptertitle.value = navList[navIdx].tit
  } else {
    chaptertitle.value = ''
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
  const alphabet = [..."abcdefghijklmnopqrstuvwxyz-—'’ 0123456789"]
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
      ctxEnd = i + 1
      break
    }
  }
  ctxStart > 0 ? ctxStart++ : null
  return txt.substring(ctxStart, ctxEnd).trim()
}
function highlightSelected(cfiRange, contents) {
  contents.window.getSelection().removeAllRanges()
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
    tocList.forEach((chapter) => {
      list.push({
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
    const relHref = searchChapter(href)
    rendition.display(relHref).catch((err) => console.error('goToSearchChapter err', relHref, err))
  })
  showNav.value = false
  showMark.value = false
}
function searchChapter(targetHref) {
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
  return targetHref
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
    theme.style.body['padding-bottom'] = '1rem!important'
    rendition.themes.register(theme.name, theme.style)
  })
}
function viewProgress(percentage) {
  bookProgress.value = Math.floor(percentage * 100)
}
function showTool() {
  isShowTool.value = !isShowTool.value
}
onMounted(async () => {
  ebus.on(ename.NavMore, showTool)
  console.log('mount book')
  router = useRouter()
  const query = router.currentRoute.value.query
  bookHash = query.hash
  bookTitle.value = `《${query.title}》`
  renderBook()
  DB.getBookPercentage(bookHash)
    .then(viewProgress)
    .catch((e) => console.error('mount getBookPercentage', bookHash, e))
})
onUnmounted(() => {
  ebus.off(ename.NavMore, showTool)
  console.log('unmounted book')
  if (rendition) {
    rendition.clear()
    rendition.destroy()
    ebook.destroy()
    rendition = null
    ebook = null
  }
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
.book-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.5rem;
  background-color: #fff;
  position: absolute;
  bottom: 0;
  bottom: 0;
  width: 100%;
  text-align: right;
  vertical-align: text-bottom;
  padding: 0 0.6rem;
}
.book-footer p {
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-tool {
  background-color: hsla(160, 100%, 37%, 1);
  margin-right: 0.5rem;
  margin-bottom: 2px;
  display: flex;
  flex-direction: column;
  align-items: start;
  position: absolute;
  right: 0;
  bottom: 0.5rem;
}
.book-tool .triangle {
  width: 0;
  height: 0;
  border-top: 0.5rem solid hsla(160, 100%, 37%, 1);
  border-right: 0.5rem solid transparent;
  border-left: 0.5rem solid transparent;
  margin-right: 0.5rem;
  position: absolute;
  bottom: -0.5rem;
  right: 0;
}
#mark-tool {
  display: flex;
  position: fixed;
  z-index: 1000;
  margin-top: 1rem;
}
#mark-tool .triangle {
  width: 0;
  height: 0;
  border-bottom: 0.5rem solid hsla(160, 100%, 37%, 1);
  border-right: 0.5rem solid transparent;
  border-left: 0.5rem solid transparent;
  margin-right: 0.5rem;
  position: absolute;
  top: -0.5rem;
}
.posi-left .triangle {
  left: 0;
}
.posi-right .triangle {
  right: 0;
}
#mark-tool {
  background-color: hsla(160, 100%, 37%, 1);
}
#mark-tool .button-wrap + .button-wrap {
  border-left: 1px solid hsla(160, 100%, 34%, 1);
}
.clicked-image-box {
  width: 100vw;
  display: flex;
  min-height: 50vh;
  justify-content: center;
  align-items: center;
  max-height: 90vh;
  background-color: rgba(0, 0, 0, 0);
  padding: 1rem;
}
.clicked-image-box img {
  display: inline-block;
  max-width: 100%;
  max-height: 100%;
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
