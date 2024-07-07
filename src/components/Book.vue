<template>
  <div>
    <p ref="reading" id="reading"></p>
    <van-popup v-model:show="showNav" position="right" closeable>
      <van-index-bar :index-list="[]" style="width: 70vw; padding-top: 2.5rem">
        <!-- <van-index-anchor index="A" /> -->
        <van-cell
          v-for="item in navList"
          :title="item.tit"
          :key="item.id"
          @click="goToChapter(item)"
        ></van-cell>
      </van-index-bar>
    </van-popup>
    <van-popup v-model:show="showMark" position="right" closeable>
      <van-index-bar :index-list="[]" style="width: 70vw; padding-top: 2.5rem">
        <van-cell
          v-for="item in markList"
          :title="item.txt"
          :key="item.href"
          @click="goToChapter(item)"
          ><p>{{ item.num }}</p></van-cell
        >
      </van-index-bar>
    </van-popup>
    <van-popup v-model:show="showTranslate" position="right" closeable>
      <div style="width: 70vw; padding: 2.5rem" id="translated" v-html="translateInfo"></div>
    </van-popup>
    <div class="tool">
      <span>{{ curPage }}</span>
      <van-button type="primary" color="hsla(160, 100%, 37%, 1)" @click="showMark = true"
        >笔记</van-button
      >
      <van-button type="primary" color="hsla(160, 100%, 37%, 1)" @click="showNav = true"
        >目录</van-button
      >
    </div>
  </div>
</template>

<script>
import Epub from 'epubjs'
import DB from '../db/bookCase.js'
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
async function renderBook() {
  const router = useRouter()
  const curRoute = router.currentRoute
  const query = curRoute.value.query
  const bookHash = query.hash
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
  ebook.ready.then(() => ebook.locations.generate(1600))
  ebook.loaded.navigation.then(refreshBookNav)
  rendition.on('keyup', onKeyUp)
  rendition.themes.default({
    '::selection': {
      background: 'rgba(255,255,0, 0.3)'
    },
    '.epubjs-hl': {
      fill: 'yellow',
      'fill-opacity': '0.3',
      'mix-blend-mode': 'multiply'
    }
  })
  rendition.on('markClicked', (cfiRange) => {
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
        console.log(translatedDom.html())
      })
      .catch((err) => console.error('translated', err))
  })

  rendition.on('selected', (cfiRange, contents) => {
    rendition.annotations.highlight(cfiRange, {})
    contents.window.getSelection().removeAllRanges()
    ebook.getRange(cfiRange).then((range) => {
      const txt = range ? range.toString().trim() : ''
      if (!txt) {
        return
      }
      const exist = markList.filter((item) => {
        return item.txt === txt
      })
      if (!exist.length) {
        markList.push({ href: cfiRange, txt: txt, num: 1 })
      } else {
        exist[0].num++
      }
    })
  })
  rendition.on('relocated', (location) => {
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
    router.replace({
      path: curRoute.value.path,
      query: { ...query, cfi: cfi }
    })
    console.log('progress', cfi, percentage)
    cfi ? DB.putBookCfi(bookHash, cfi).catch((e) => console.error('putBookCfi', bookHash, e)) : null
    percentage
      ? DB.putBookPercentage(bookHash, percentage).catch((e) =>
          console.error('putBookCfi', bookHash, e)
        )
      : null
  })
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
function goToChapter(chapter) {
  const href = chapter.href
  rendition
    .display(href)
    .then((res) => {
      console.log('goToChapter', res)
    })
    .catch((err) => {
      console.log('goToChapter err', href, err)
      goToSearchChapter(href)
    })
  showNav.value = false
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
    .then((res) => {
      console.log('goToSearchChapter', res)
    })
    .catch((err) => console.error('goToSearchChapter err', targetHref, err))
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
      translateInfo
    }
  },
  async mounted() {
    renderBook()
  },
  unmounted() {
    console.log('unmounted')
    if (rendition) {
      rendition.clear()
      rendition.destroy()
      ebook.destroy()
      rendition = null
      ebook = null
    }
  }
}
</script>

<style scoped>
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
#translated {
  list-style-type: disc;
}
</style>
