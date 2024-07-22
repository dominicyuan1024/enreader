<template>
  <div class="settings fix-footer fix-header">
    <h3 class="page-header">我的</h3>
    <van-collapse v-model="activeNames">
      <van-collapse-item name="1" title="词典" icon="shop-o">
        <div class="setting-item">
          <van-radio-group v-model="dictChecked" @change="usingDict">
            <div class="dict-item" v-for="item in dictList" :key="item.hash">
              {{ item.title }}
              <van-button
                v-if="item.remote"
                type="primary"
                icon="down"
                size="small"
                :loading="item.loading"
                @click="downloadDict(item)"
              ></van-button>
              <van-radio v-else :name="item.hash"></van-radio>
            </div>
          </van-radio-group>
          <van-uploader class="dict-item" :after-read="uploadFileList" accept="*.mdx" multiple>
            <van-button type="primary" icon="plus" size="small">本地导入</van-button>
          </van-uploader>
        </div>
      </van-collapse-item>
      <van-collapse-item title="布局" name="2" icon="shop-o"> </van-collapse-item>
      <van-collapse-item title="安全" name="3" icon="shop-o">
        <div class="setting-item">
          <div>开发者模式 <van-switch v-model="devMode" @change="switchDevMode" /></div>
        </div>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Md5 from 'blueimp-md5'
import DB from '../db/db.js'
import axios from 'axios'
import VConsole from 'vconsole'
const activeNames = ref(['1'])
const devMode = ref(window.vconsole ? true : false)
function switchDevMode(val) {
  localStorage.setItem('devMode', val)
  if (val) {
    window.vconsole = new VConsole({ theme: 'dark' })
  } else if (window.vconsole) {
    window.vconsole.destroy()
    window.vconsole = undefined
  }
}
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
function downloadDict(dict) {
  dict.loading = true
  DB.registRemoteDict(dict.hash)
    .then(() => {
      dict.remote = false
      dict.loading = false
    })
    .catch((err) => console.error('registRemoteDict error', dict, err))
}
onMounted(async () => {
  DB.listDictMeta()
    .then((res) => {
      dictList.splice(0, dictList.length, ...res)
    })
    .then(() => {
      return axios.get('dict/default-dict-list.json')
    })
    .then((res) => {
      if (res.status !== 200) {
        return Promise.reject(`query dict/default-dict-list.json ${res.status}`)
      }
      return res
    })
    .then((res) => {
      const dictMap = {}
      dictList.forEach((item) => (dictMap[item.hash] = true))
      res.data.forEach((item) => {
        if (dictMap[item.hash]) {
          return
        }
        const { hash, title } = item
        dictList.push({ hash, title, remote: true })
      })
    })
    .catch((err) => {
      console.error('listDictMeta', err)
    })
})
</script>

<style scoped>
.setting-item {
  margin-left: 2rem;
}
.dict-item {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}
</style>
