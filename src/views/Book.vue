<template>
  <main class="book-wrap">
    <div class="book">
      <div ref="reading" id="reading"></div>
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
      <van-popup v-model:show="showMark" position="top">
        <van-list disabled style="width: 100vw; max-height: 85vh; padding-top: 2.5rem">
          <van-cell
            v-for="item in markList"
            :key="item.id"
            :title="item.content"
            @click="goToChapter(item.cfi)"
          >
            <p
              v-html="
                item.ctx.replace(item.content, `<span class='underline'>${item.content}</span>`)
              "
            ></p>
            <!-- {{ item.ctx }} -->
          </van-cell>
        </van-list>
      </van-popup>
      <van-popup v-model:show="showTranslate" position="top">
        <iframe :srcdoc="translateInfo" id="translated"></iframe>
      </van-popup>
      <van-popup v-model:show="showRecord" position="bottom">
        <div v-if="showRecord" style="padding: 1rem">
          <h4 style="font-weight: bold">
            {{ clickHighlightInfo.content }}
          </h4>
          <p>{{ clickHighlightInfo.defEN }}</p>
          <p class="mosaic" @click="(evt) => evt.target.classList.toggle('mosaic')">
            {{ clickHighlightInfo.defCN }}
          </p>
        </div>
      </van-popup>
      <van-popup v-model:show="showTheme" position="bottom">
        <div style="padding: 1rem">
          <div style="padding: 1rem; display: flex; align-items: center">
            <span style="margin-right: 0.5rem">{{ curFontSize }}</span>
            <span style="flex-shrink: 0; text-align: right; margin-right: 1rem">A-</span>
            <van-slider
              v-model="curFontSize"
              step="1"
              :max="maxFontSize"
              :min="minFontSize"
              @change="setFontSize"
            >
            </van-slider>
            <span style="flex-shrink: 0; text-align: right; margin-left: 1rem">A+</span>
          </div>
          <van-radio-group v-model="curTheme" @change="setTheme">
            <van-cell-group inset>
              <van-cell
                clickable
                v-for="item in themeList"
                :style="genThemeStyle(item)"
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
          <div style="padding: 1rem; display: flex; align-items: center">
            选词方式：
            <van-button
              :color="isHighlightWhenClick ? 'hsla(160, 100%, 37%, 1)' : ''"
              square
              @click="switchHighlightOnClick(true)"
              >单击</van-button
            >
            <van-button
              :color="isHighlightWhenClick ? '' : 'hsla(160, 100%, 37%, 1)'"
              square
              @click="switchHighlightOnClick(false)"
              >系统</van-button
            >
          </div>
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
          block
          type="primary"
          icon="wap-nav"
          color="hsla(160, 100%, 37%, 1)"
          @click="showNav = true"
          >目录</van-button
        >
        <van-button
          square
          block
          type="primary"
          icon="records-o"
          color="hsla(160, 100%, 37%, 1)"
          @click="viewMark"
          >笔记</van-button
        >
        <van-button
          square
          type="primary"
          icon="setting-o"
          color="hsla(160, 100%, 37%, 1)"
          @click="showThemeEditor"
          >风格</van-button
        >
        <div class="triangle"></div>
      </div>
      <div id="mark-tool" style="z-index: -1">
        <div v-for="item in markActions" class="button-wrap" :key="item.name">
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
import { lookup, generateHtml } from '../db/translate.js'
import { ebus, ename } from '../stores/events.js'
import { copyToClipboard } from '@/stores/copyToClipboard.js'
import { showLoadingToast } from 'vant'
import { showConfirmDialog } from 'vant'
const router = useRouter()
let ebook
let rendition
let navList = reactive([])
const curBookNavHref = ref('')
const showNav = ref(false)
const curPage = ref('')
const showMark = ref(false)
const markList = reactive([])
const showTranslate = ref(false)
const showRecord = ref(false)
const clickHighlightInfo = ref({})
const translateInfo = ref('')
const bookProgress = ref(0)
const isShowTool = ref(false)
const isShowMarktool = ref(false)
const bookTitle = ref('')
const chaptertitle = ref('')
const clickedImageSrc = ref('')
const showImage = ref(false)
const showTheme = ref(false)
const storedTheme = localStorage.getItem('book-theme')
const curTheme = ref(storedTheme ? storedTheme : 'Default')
const storedFontSize = localStorage.getItem('book-font-size')
let defaultFontSize = window.getComputedStyle(document.body).fontSize
defaultFontSize = defaultFontSize.replace('px', '')
defaultFontSize = defaultFontSize ? parseInt(defaultFontSize) : 18
const curFontSize = ref(storedFontSize ? parseInt(storedFontSize) : defaultFontSize)
const minFontSize = 8
const maxFontSize = 36
const storedHighlightWhenClick = localStorage.getItem('isHighlightWhenClick')
const isHighlightWhenClick = ref(storedHighlightWhenClick !== 'false')
const themeList = [
  {
    alias: '默认',
    name: 'Default',
    style: {
      body: {
        'padding-bottom': '1rem!important',
        color: '#222',
        background: '#ccc58f'
      }
    }
  },
  {
    alias: '夜晚',
    name: 'Night',
    style: {
      body: {
        'padding-bottom': '1rem!important',
        color: '#cecece',
        background: '#000000'
      }
    }
  },
  {
    alias: '黑白',
    name: 'Day',
    style: {
      body: {
        'padding-bottom': '1rem!important',
        background: '#fff',
        color: '#000'
      }
    }
  },
  {
    alias: '雅致',
    name: 'Gold',
    style: {
      body: {
        'padding-bottom': '1rem!important',
        color: '#222',
        background: 'tan'
      }
    }
  },
  {
    alias: '护眼',
    name: 'Eye',
    style: {
      body: {
        'padding-bottom': '1rem!important',
        color: '#cecece',
        background: '#080'
      }
    }
  }
]
const markActions = [
  { name: 'delete', handler: clearHighlight, text: '', icon: 'delete-o' },
  { name: 'question', handler: handleTranslate, text: '', icon: 'question-o' },
  { name: 'record', handler: handleRecordNote, text: '', icon: 'records-o' },
  { name: 'copy', handler: handleCopy, text: 'copy', icon: '' }
]
let cfiBeforShowTheme = ''
let bookHash
let loadingCtrl

async function renderBook(registed) {
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
  let bookClickHandler
  rendition.hooks.render.register((iframeView) => {
    preventBookDefaultEvent(iframeView.document)
    iframeView.document.removeEventListener('click', showClickedImg)
    iframeView.document.addEventListener('click', showClickedImg)

    bookClickHandler && iframeView.document.removeEventListener('click', bookClickHandler)
    bookClickHandler = (evt) => {
      if (isHighlightWhenClick.value && !isShowTool.value) {
        selectCursorWord(evt, iframeView)
        // this will emit the event 'selected' of rendition，see how function highlightSelected works
      }
      hideAllTools()
    }
    iframeView.document.addEventListener('click', bookClickHandler)

    iframeView.document.removeEventListener('touchmove', hideAllTools)
    iframeView.document.addEventListener('touchmove', hideAllTools)

    registed && registed()
  })

  const cfi = await DB.getBookCfi(bookHash)
  cfi ? rendition.display(cfi) : rendition.display()

  ebook.ready
    .then(() => {
      highlightHistory()
      setTheme(curTheme.value)
      setFontSize(curFontSize.value)
      return ebook.locations.generate(1600)
    })
    .then(() => {
      onProgress(rendition.currentLocation())
    })
  ebook.loaded.navigation.then(refreshBookNav)
  rendition.on('keyup', onKeyUp)
  rendition.on('markClicked', onMarkClick)
  rendition.on('selected', highlightSelected)
  rendition.on('relocated', onProgress)
}
function hideAllTools() {
  isShowTool.value = false
  showMarkTool(false)
}
function switchHighlightOnClick(val) {
  isHighlightWhenClick.value = val
  localStorage.setItem('isHighlightWhenClick', val)
}
function selectCursorWord(evt, HookIframeView) {
  const window = HookIframeView.window
  const document = HookIframeView.document
  const x = evt.clientX
  const y = evt.clientY

  let offsetNode
  let offset

  const sel = window.getSelection()
  sel && sel.removeAllRanges()

  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y)
    if (!pos) {
      return
    }
    offsetNode = pos.offsetNode
    offset = pos.offset
  } else if (document.caretRangeFromPoint) {
    const pos = document.caretRangeFromPoint(x, y)
    if (!pos) {
      return
    }
    offsetNode = pos.startContainer
    offset = pos.startOffset
  } else {
    return
  }


  if (offsetNode.nodeType !== Node.TEXT_NODE) {
    return
  }

  const textNode = offsetNode
  const content = textNode.data
  const head = (content.slice(0, offset).match(/[-_a-zA-Z]+$/i) || [''])[0]
  const tail = (content.slice(offset).match(/^([-_a-zA-Z]+|[\u4e00-\u9fa5])/i) || [''])[0]
  if (head.length <= 0 && tail.length <= 0) {
    return
  }
  if ((head + tail).trim().length === 0) {
    return
  }

  const range = document.createRange()
  range.setStart(textNode, offset - head.length)
  range.setEnd(textNode, offset + tail.length)
  const rangeRect = range.getBoundingClientRect()
  const { left, right, top, bottom } = rangeRect
  const isIn = left <= x && right >= x && top <= y && bottom >= y
  if (!isIn) {
    return
  }

  sel.addRange(range)
  return range
}

function highlightSelected(cfiRange, contents) {
  console.log('highlightSelected')
  const selection = contents.window.getSelection()
  if (selection.toString().trim() === '') {
    return
  }
  const range = selection.getRangeAt(0)
  selection.removeAllRanges()
  const txt = range ? range.toString().trim() : ''
  if (!txt) {
    return
  }
  const rect = range.getBoundingClientRect()
  const [left, top] = calcRectPosition(rect)
  const exist = markList.findIndex((item) => item.cfi === cfiRange) >= 0
  if (exist) {
    console.log(`cursorWord ${cfiRange.toString()} already exist`)
    showMarkTool(true, left, top)
    return
  }
  const ctx = getSentenceOfWord(
    range.commonAncestorContainer.data,
    range.startOffset,
    range.endOffset
  )
  DB.putBookmark({
    bookHash,
    cfi: cfiRange,
    content: txt,
    ctx: ctx
  })
    .then((data) => {
      if (!data) return
      rendition.annotations.highlight(cfiRange, {})
      console.log('highlight', cfiRange)
      return markList.push(data)
    })
    .then(() => {
      clickHighLightCfi = cfiRange
      showMarkTool(true, left, top)
    })
    .catch((err) => console.error('highlight', cfiRange, err))
}

function calcRectPosition(rect) {
  let left = rect.left + rect.width / 2
  const pageWith = window.document.body.clientWidth
  const near = Math.floor(left / pageWith)
  left = left - pageWith * near
  const top = rect.top + rect.height / 2
  return [left, top]
}

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
  isShowMarktool.value = isShow
}
function showThemeEditor() {
  DB.getBookCfi(bookHash).then((res) => {
    showTheme.value = true
    cfiBeforShowTheme = res
  })
}
function setTheme(name) {
  console.log(`set theme ${name}`)
  const idx = themeList.findIndex((item) => item.name === name)
  const theme = themeList[idx].style.body
  for (let rule in theme) {
    rendition.themes.override(rule, theme[rule], 1)
  }
  redrawAnnotations()
  localStorage.setItem('book-theme', name)
}
function setFontSize(val) {
  rendition.themes.fontSize(`${val}px`)
  if (cfiBeforShowTheme) {
    rendition.display(cfiBeforShowTheme)
  }
  redrawAnnotations()
  localStorage.setItem('book-font-size', val)
}
function genThemeStyle(theme) {
  const style = theme.style.body
  return `color:${style.color};background:${style.background};`
}
function redrawAnnotations() {
  rendition.views().forEach((view) => (view.pane ? view.pane.render() : null))
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
function highlightHistory() {
  DB.listBookmark(bookHash)
    .then((data) => {
      if (typeof data.splice === 'function') {
        data.forEach((item) => {
          rendition.annotations.highlight(item.cfi)
        })
        markList.splice(0, markList.length + 1, ...data)
      }
    })
    .catch((err) => console.error('highlightHistoryMark listBookmark', err))
}

let clickHighLightCfi
function onMarkClick(cfiRange) {
  clickHighLightCfi = cfiRange
}

function clearHighlight(item, evt) {
  evt.stopPropagation()
  DB.deleteBookmark(bookHash, clickHighLightCfi)
    .then((data) => {
      const idx = markList.findIndex((item) => item.cfi === clickHighLightCfi)
      markList.splice(idx, 1)
      console.log('deleteBookmark', data)
      rendition.annotations.remove(clickHighLightCfi)
      rendition.manager.views.forEach((item) => {
        item.unhighlight(clickHighLightCfi)
      })
      showMarkTool(false)
    })
    .catch((err) => console.error('clearHighlight', err))
}
function ListenTranslateIframeMessage(type = '', val) {
  if (type === 'sense-def') {
    const idx = markList.findIndex((item) => item.cfi === clickHighLightCfi)
    if (idx < 0) {
      return
    }
    const mark = markList[idx]
    mark.defCN = val.defCN
    mark.defEN = val.defEN
    DB.putBookmark(mark)
      .then((res) => {
        console.log(type, val, `res=${res}`)
      })
      .catch((err) => console.error(type, err))
  }
}
function handleRecordNote() {
  showRecord.value = true
  const idx = markList.findIndex((item) => item.cfi === clickHighLightCfi)
  return idx >= 0 ? (clickHighlightInfo.value = markList[idx]) : (clickHighlightInfo.value = {})
}

function handleTranslate() {
  ebook
    .getRange(clickHighLightCfi)
    .then((range) => {
      return Promise.resolve(range.toString())
    })
    .then((txt) => {
      let dictHash = localStorage.getItem('dict-using-hash')
      if (!dictHash) {
        showConfirmDialog({
          message: '无可用词典，是否跳转至安装页面？'
        }).then(() => {
          router.push('/setting')
        })
        return
      }
      return lookup(dictHash, txt)
    })
    .then((translatedDom) => {
      return generateHtml(translatedDom.html())
    })
    .then((res) => {
      translateInfo.value = res
      showTranslate.value = true
      window.ListenTranslateIframeMessage = ListenTranslateIframeMessage
    })
    .catch((err) => console.error('translated', err))
}

function handleCopy() {
  ebook
    .getRange(clickHighLightCfi)
    .then((range) => {
      copyToClipboard(range.toString())
    })

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

function getSentenceOfWord(txt, startOffset, endOffset) {
  let ctxStart = 0
  let ctxEnd = txt.length
  const punctuationMark = [...'.,;:?!()']
  for (let i = startOffset; i >= 0; i--) {
    const letter = txt[i].toLowerCase()
    if (punctuationMark.indexOf(letter) >= 0) {
      ctxStart = i
      break
    }
  }
  for (let i = endOffset; i < txt.length; i++) {
    const letter = txt[i].toLowerCase()
    if (punctuationMark.indexOf(letter) >= 0) {
      ctxEnd = i + 1
      break
    }
  }
  ctxStart > 0 ? ctxStart++ : null
  return txt.substring(ctxStart, ctxEnd).trim()
}
function onKeyUp(e) {
  if ((e.keyCode || e.which) == 37) {
    rendition.prev()
    hideAllTools()
  }
  if ((e.keyCode || e.which) == 39) {
    rendition.next()
    hideAllTools()
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
function viewProgress(percentage) {
  bookProgress.value = Math.floor(percentage * 100)
}
function showTool() {
  isShowTool.value = !isShowTool.value
  isShowTool.value ? showMarkTool(false) : null
}
onMounted(async () => {
  loadingCtrl = showLoadingToast({
    duration: 0,
    message: '',
    forbidClick: true,
    loadingType: 'spinner'
  })
  ebus.on(ename.NavMore, showTool)
  const query = router.currentRoute.value.query
  bookHash = query.hash
  bookTitle.value = `《${query.title}》`
  renderBook(() => {
    loadingCtrl.close()
  })
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
#translated {
  overflow-x: hidden;
  width: 100vw;
  height: 85vh;
  padding: 1rem;
  margin: 0;
  border: none;
}
</style>
