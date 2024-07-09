<template>
  <div class="word-share">
    <div id="wordcloud" style="height: 100vw; width: 100vw"></div>
    <van-button color="hsla(160, 100%, 37%, 1)" @click="downloadImg">保存图片</van-button>
  </div>
</template>

<script>
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { TitleComponent } from 'echarts/components'
import 'echarts-wordcloud'
echarts.use([SVGRenderer, TitleComponent])
import DB from '../db/db.js'
import { ref } from 'vue'
const showShare = ref(false)
const todayWords = ref([])
const letterArr = [...Array(26).keys()].map((i) => String.fromCharCode(i + 65))
let wordCloudChart
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
  el.download = '今日生词'
  const event = new MouseEvent('click')
  el.dispatchEvent(event)
}
function renderTodayWords(data) {
  try {
    const el = document.getElementById('wordcloud')
    wordCloudChart = echarts.init(el, null, {
      renderer: 'svg'
      // devicePixelRatio: window.devicePixelRatio
    })
    wordCloudChart.setOption({
      title: [
      {
        text: `今日 ${data.length} 生词`,
        textStyle: {
          fontSize: "8px",
        },
        x:"center",
        y:"top"
      },{
        text:`${new Date().toLocaleDateString()}`,
        textStyle: {
          fontSize: "8px",
          fontWeight: "normal"
        },
        top:12,
        y:"top",
        x:"center",
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
                  Math.round(Math.random() * 160),
                  Math.round(Math.random() * 160),
                  Math.round(Math.random() * 160)
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
    console.log("mounted")
    getTodayWords().then(renderTodayWords)
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
