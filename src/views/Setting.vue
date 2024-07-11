<template>
  <div class="settings">
    <h1>词典</h1>
    <van-uploader :after-read="uploadFileList" accept=".mdx,.mdd" multiple>
      <van-button type="primary" icon="plus" size="small"></van-button>
    </van-uploader>
    <van-radio-group v-model="dictChecked" @change="usingDict">
      <van-radio v-for="item in dictList" :name="item.hash" :key="item.hash">{{
        item.title
      }}</van-radio>
    </van-radio-group>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import Md5 from 'blueimp-md5'
import DB from '../db/db.js'
// import {showLoadingToast} from "vant"
// let loadingCtrl
const dictChecked = ref(localStorage.getItem('dict-using-hash') || '')
let dictList = reactive([])
async function uploadFileList(file) {
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
export default {
  setup() {
    DB.listDictMeta()
      .then((res) => {
        dictList.splice(0, dictList.length, ...res)
      })
      .catch((err) => {
        console.error('listDictMeta', err)
      })
    return { dictChecked, dictList, uploadFileList, usingDict }
  }
}
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
