<template>
  <div class="word-share">
    <div id="wordcloud" style="height: 100vw; width: 100vw;max-height: 70vh;"></div>
    <van-button color="hsla(160, 100%, 37%, 1)" @click="downloadImg">保存图片</van-button>
  </div>
</template>

<script>
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { TitleComponent } from 'echarts/components'
import 'echarts-wordcloud'
echarts.use([CanvasRenderer, TitleComponent])
import DB from '../db/db.js'
import { ref } from 'vue'
const showShare = ref(false)
const todayWords = ref([])
const letterArr = [...Array(26).keys()].map((i) => String.fromCharCode(i + 65))
let wordCloudChart
const imgTitle = '今日新词'
function getTodayWords() {
  return DB.listWords((bookmark) => {
    const utimestamp = bookmark.utime
    const start = new Date(new Date().toLocaleDateString()).getTime()
    const end = start + 24 * 60 * 60 * 1000 - 1
    return utimestamp >= start && utimestamp <= end
  })
    .then((data) => {
      if (typeof data.splice === 'function') {
        const words = {}
        data.forEach((item) => {
          words[item.content] = words[item.content] ? words[item.content] + 1 : 1
        })
        const wordArr = []
        for (let k in words) {
          wordArr.push({ name: k, value: words[k] })
        }
        todayWords.value = [...wordArr]
        return wordArr
      }
      return []
    })
    .catch((err) => console.error('listBookmark', err))
}
function wordsColor([txt]) {
  const letter = txt.trim()[0].toUpperCase()
  let count = letterArr.indexOf(letter)
  if (count < 100) {
    count = 50
  }
  if (count > 200) {
    count = 50
  }
  const cl = `rgb(${count * Math.random() * 10},${count * Math.random() * 10},${count * Math.random() * 10})`
  return cl
}
function wordsRotate([txt]) {
  const letter = txt.trim()[0].toUpperCase()
  const count = letterArr.indexOf(letter)
  return count * 6 - 90
}
function downloadImg() {
  const el = document.createElement('a')
  el.href = wordCloudChart.getDataURL()
  el.download = `${imgTitle}-${dayString('_')}`
  const event = new MouseEvent('click')
  el.dispatchEvent(event)
}
function dayString(seq) {
  if (!seq) {
    seq = '.'
  }
  const now = new Date()
  const res = [now.getFullYear(), now.getMonth(), now.getDay()].join(seq)
  return res
}
function renderTodayWords(data) {
  try {
    data = data.filter((word) => {
      const idx = word.name.trim().indexOf(' ')
      return idx === -1
    })
    const el = document.getElementById('wordcloud')
    wordCloudChart = echarts.init(el, null, {
      devicePixelRatio: window.devicePixelRatio
    })
    wordCloudChart.setOption({
      backgroundColor: '#333',
      title: [
        {
          text: `${imgTitle} {big|${data.length}} ${dayString()}`,
          textStyle: {
            // fontWeight: 'normal',
            fontSize: 10,
            color: '#fff',
            verticalAlign: 'bottom',
            rich: {
              big: {
                fontSize: 20,
                fontWeight: 700,
                color: '#EEA644',
                verticalAlign: 'bottom',
                align: 'bottom',
                padding: [0, 0, 5, 0]
              }
            }
          },
          x: 'center',
          y: 'bottom'
        }
      ],
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          keepAspect: false,
          // maskImage: maskImage,
          left: 'center',
          top: 'center',
          width: '100%',
          height: '100%',
          right: null,
          bottom: null,
          sizeRange: [22, 42],
          rotationRange: [-70, 90],
          rotationStep: 45,
          gridSize: 1,
          drawOutOfBound: false,
          shrinkToFit: false,
          layoutAnimation: true,
          textStyle: {
            fontFamily: 'sans-serif',
            // fontWeight: 'bold',
            color: function () {
              return (
                'rgb(' +
                [
                  Math.round(Math.random() * 160 + 100),
                  Math.round(Math.random() * 160 + 100),
                  Math.round(Math.random() * 160 + 100)
                ].join(',') +
                ')'
              )
            }
          },
          data
        }
      ]
    })
  } catch (e) {
    console.error(e)
  }
}
export default {
  setup() {
    return {
      getTodayWords,
      showShare,
      todayWords,
      wordsColor,
      wordsRotate,
      downloadImg
    }
  },
  mounted() {
    console.log('mounted')
    getTodayWords().then(renderTodayWords)
  },
  unmounted() {
    wordCloudChart && wordCloudChart.clear()
    wordCloudChart = null
  }
}
</script>
<style scoped>
.word-share {
  color: #fff;
  background: #fff;
  display: flex;
  flex-flow: column;
  justify-content: center;
}
.share-anno {
  text-align: right;
  padding-right: 0.5rem;
}
</style>
