<template>
  <div class="settings fix-footer fix-header">
    <h3 class="page-header"><van-icon name="user-o" style="" />用户设置</h3>
    <van-collapse v-model="activeNames">
      <van-collapse-item name="dict" title="词典" icon="shop-o">
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
          <!-- <van-uploader class="dict-item" :after-read="uploadFileList" accept="*.mdx" multiple>
            <van-button type="primary" icon="plus" size="small">本地导入</van-button>
          </van-uploader> -->
        </div>
      </van-collapse-item>
      <van-collapse-item title="安全" name="safty" icon="shop-o">
        <div class="setting-item">
          <div class="devmode">
            <span class="label">开发者模式</span>
            <van-switch v-model="devMode" @change="switchDevMode" />
          </div>
        </div>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Md5 from 'blueimp-md5'
import DB from '../db/db.js'
import VConsole from 'vconsole'
const nameDictUsingHash = 'dict-using-hash'
const activeNames = ref(['dict', 'safty'])
const devMode = ref(false)
function switchDevMode(val) {
  localStorage.setItem('devMode', val)
  if (val) {
    if (!window.vconsole) {
      window.vconsole = new VConsole({ theme: 'dark' })
    }
  } else if (window.vconsole) {
    window.vconsole.destroy()
    window.vconsole = undefined
  }
}
// import {showLoadingToast} from "vant"
// let loadingCtrl
const dictChecked = ref(localStorage.getItem(nameDictUsingHash) || '')
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
  localStorage.setItem(nameDictUsingHash, data)
}
function downloadDict(dict) {
  dict.loading = true
  DB.registRemoteDict(dict.hash)
    .then(() => {
      dict.remote = false
      dict.loading = false
    })
    .catch((err) => {
      dict.loading = false
      console.error('registRemoteDict error', dict, err)
    })
}
onMounted(async () => {
  let res = []
  try {
    res = await DB.listDictMeta()
  } catch (error) {
    console.error('listDictMeta', error)
  }
  dictList.splice(0, dictList.length, ...res)

  let remoteList = {}
  try {
    remoteList = await DB.getRemoteDictList()
  } catch (error) {
    console.error('getRemoteDictList', error)
  }
  const dictMap = {}
  dictList.forEach((item) => (dictMap[item.hash] = true))
  remoteList.data.forEach((item) => {
    if (dictMap[item.hash]) {
      return
    }
    const { hash, title } = item
    dictList.push({ hash, title, remote: true })
  })
})
</script>

<style scoped>
.settings {
  position: relative;
}
.setting-item {
  margin-left: 2rem;
}
.devmode {
  display: flex;
  align-items: center;
}
.label {
  display: flex;
  align-items: center;
  margin-right: 1rem;
}
.dict-item {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}
</style>
