<template>
  <div class="settings fix-footer fix-header">
    <h3 class="page-header">我的</h3>
    <van-collapse v-model="activeNames">
      <van-collapse-item name="1" title="词典" icon="shop-o">
        <van-uploader :after-read="uploadFileList" accept="*.mdx" multiple>
          <van-button type="primary" icon="plus" size="small"></van-button>
        </van-uploader>
        <van-radio-group v-model="dictChecked" @change="usingDict">
          <van-radio v-for="item in dictList" :name="item.hash" :key="item.hash">{{
            item.title
          }}</van-radio>
        </van-radio-group>
      </van-collapse-item>
      <van-collapse-item title="布局" name="2" icon="shop-o"> </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Md5 from 'blueimp-md5'
import DB from '../db/db.js'
const activeNames = ref(['1'])
// import {showLoadingToast} from "vant"
// let loadingCtrl
const dictChecked = ref(localStorage.getItem('dict-using-hash') || '')
let dictList = reactive([])
async function uploadFileList(file) {
  console.log('filefilefilefilefilefile', file)
  // loadingCtrl = showLoadingToast({
  //   duration: 0,
  //   message: '',
  //   forbidClick: true,
  //   loadingType: 'spinner'
  // })
  if (!(file instanceof Array)) {
    file = [file]
  }
  let fileSet = new Set()
  dictList.forEach((item) => {
    fileSet.add(item.hash)
  })
  for (let i in file) {
    const item = file[i]
    if (item.file.name.indexOf('.mdx') < 0) {
      return
    }
    let hash = Md5(item.content)
    if (fileSet.has(hash)) {
      console.log(hash, 'alredy exist')
      continue
    }
    let res = await DB.putBookContent({
      hash,
      content: item.file,
      filename: item.file.name,
      format: '.mdx',
      size: item.file.size
    })
    if (typeof res !== 'number' || res < 0) {
      console.error('putBookContent dict', res)
      continue
    }
    res = await DB.putDictMeta({
      hash,
      title: item.file.name,
      hashAlg: 'md5',
      using: false
    })
    if (typeof res !== 'number' || res < 0) {
      console.error('putDictMeta', res)
      continue
    }
    fileSet.add(hash)
    dictList.push({
      hash,
      title: item.file.name
    })
  }
  // loadingCtrl.close()
}
function usingDict(data) {
  localStorage.setItem('dict-using-hash', data)
}
onMounted(() => {
  DB.listDictMeta()
    .then((res) => {
      dictList.splice(0, dictList.length, ...res)
    })
    .catch((err) => {
      console.error('listDictMeta', err)
    })
})
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
