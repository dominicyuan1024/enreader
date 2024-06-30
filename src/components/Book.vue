<template>
  <div>
    <van-button type="primary" @click="showNav = true">目录</van-button>
    <div ref="reading" id="reading"></div>
    <van-popup v-model:show="showNav" position="right">
      <van-index-bar :index-list="[]">
        <!-- <van-index-anchor index="A" /> -->
        <van-cell
          v-for="item in navList"
          :title="item.tit"
          :key="item.id"
          @click="goToChapter(item)"
        />
      </van-index-bar>
    </van-popup>
  </div>
</template>

<script>
import Epub from 'epubjs'
import DB from '../db/bookCase.js'
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
let ebook
let rendition
let navList = reactive([])
const showNav = ref(false)
async function renderBook() {
  const router = useRouter()
  const curRoute = router.currentRoute
  const query = curRoute.value.query
  console.debug(query)
  const bookHash = query.hash
  let cfi = query.cfi
  const res = await DB.getBookContent(bookHash)
  if (!res || !res.content) {
    console.error('getBookContent', res)
  }
  ebook = Epub()
  ebook.open(res.content, 'binary')
  rendition = ebook.renderTo('reading', {
    width: '100%',
    height: '100%'
  })
  if (!cfi) {
    cfi = await DB.getBookCfi(bookHash)
  }
  cfi ? rendition.display(cfi) : rendition.display()
  ebook.ready.then(() => ebook.locations.generate(1600))
  ebook.loaded.navigation.then((toc) => {
    const list = []
    const addNav = (tocList) => {
      tocList.forEach((chapter, idx) => {
        list.push({
          id: idx,
          tit: chapter.label,
          href: chapter.href
        })
        if (!chapter.subitems) {
          return
        }
        addNav(chapter.subitems)
      })
    }
    addNav(toc)
    navList.splice(0, navList.length + 1, ...list)
    // rendition.display(url)
  })
  rendition.on('keyup', function (e) {
    if ((e.keyCode || e.which) == 37) {
      rendition.prev()
    }
    if ((e.keyCode || e.which) == 39) {
      rendition.next()
    }
  })
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
  rendition.on('selected', function (cfiRange, contents) {
    rendition.annotations.highlight(cfiRange, {}, (e) => {
      console.log('highlight clicked', e.target)
    })
    contents.window.getSelection().removeAllRanges()
  })
  rendition.on('relocated', function (location) {
    if (!location || !location.start) {
      return
    }
    const cfi = location.start.cfi
    const percentage = ebook.locations.percentageFromCfi(cfi) || 0
    router.replace({
      path: curRoute.value.path,
      query: { ...query, cfi: cfi }
    })
    console.log(cfi, percentage)
    cfi ? DB.putBookCfi(bookHash, cfi).catch((e) => console.error('putBookCfi', bookHash, e)) : null
    percentage
      ? DB.putBookPercentage(bookHash, percentage).catch((e) =>
          console.error('putBookCfi', bookHash, e)
        )
      : null
  })
}
function goToChapter(chapter) {
  console.log('goToChapter', chapter)
  rendition.display(chapter.href)
  showNav.value = false
}
export default {
  setup() {
    return {
      showNav: showNav,
      navList: navList,
      goToChapter: goToChapter
    }
  },
  async mounted() {
    renderBook()
  },
  unmounted() {
    console.log('unmounted')
    if (rendition) {
      rendition.destroy()
      rendition = null
      ebook = null
    }
  }
}
</script>

<style scoped>
#reading {
  height: 60vh;
  width: 50vw;
  background-color: hsla(13, 22, 33, 0);
}
</style>
