import Dexie from 'dexie'
import { error, validateMd5 } from './utils.js'
import axios from 'axios'
export const acceptFileFormat = ['application/epub+zip', 'application/epub', '.mdx']
const originDb = new Dexie('bookcase')
let stored = false
const db = new Proxy(originDb, {
  get: function (target, key, receiver) {
    if (!stored) {
      target.version(1).stores({
        bookMeta: '++id, &hash, hashAlg, title, author, cover, progress, utime',
        bookContent: '++id, &hash, content, filename, format, size, utime',
        dictMeta: '++id, &hash, hashAlg, title, using, utime',
        bookmark: '++id, bookHash, content, description, cfi, ctx, ctime, utime'
      })
      stored = true
    }
    return Reflect.get(target, key, receiver)
  }
})
function now() {
  return new Date().getTime()
}
function putBookMeta(bookMeta) {
  if (!bookMeta) {
    return error('invalid bookMeta is null')
  }
  if (!validateMd5(bookMeta.hash)) {
    return error('invalid bookMeta.hash')
  }
  if (bookMeta.hashAlg != 'md5') {
    return error('invalid bookMeta.hash')
  }
  bookMeta.utime = now()
  return db.bookMeta.put(bookMeta)
}

function getBookMeta(hash) {
  return db.bookMeta.get({ hash })
}

function listBookMeta() {
  return db.bookMeta.orderBy('id').toArray()
}

function putDictMeta(dictMeta) {
  if (!dictMeta) {
    return error('invalid dictMeta is null')
  }
  if (!validateMd5(dictMeta.hash)) {
    return error('invalid dictMeta.hash')
  }
  if (dictMeta.hashAlg != 'md5') {
    return error('invalid dictMeta.hash')
  }
  dictMeta.utime = now()
  console.dir(dictMeta)
  return db.dictMeta.put(dictMeta)
}

function getDictMeta(hash) {
  return db.dictMeta.get({ hash })
}

function listDictMeta() {
  return db.dictMeta.orderBy('id').toArray()
}
async function registRemoteDict(hash) {
  const remoteDict = await axios.get('dict/default-dict-list.json')
  const dictInfo = remoteDict.data.filter((item) => item.hash === hash)[0]
  const { url, title } = dictInfo

  let existDict = await getDictMeta(hash)
  if (existDict && existDict.hash === hash) {
    console.log('already exist dict meta', existDict)
    return
  }

  let file = await getBookContent(hash)
  if (!file) {
    const fileRes = await axios.get(url, { responseType: 'blob' })
    const fileType = fileRes.data.type
    if (fileType.indexOf('mdx') < 0) {
      const reason = `get remote dict file invalid type=${fileType}`
      console.error(reason)
      return Promise.reject(reason)
    }
    file = new File([fileRes.data], title, { type: fileType })
    let res = await putBookContent({
      hash,
      content: file,
      filename: file.name,
      format: '.mdx',
      size: file.size
    })
    if (typeof res !== 'number' || res < 0) {
      const reason = `putBookContent default dict return ${res}`
      console.error(reason)
      return Promise.reject(reason)
    }
  } else {
    console.log('already exist dict file', file.hash, file.filename)
  }
  let res = await putDictMeta({
    hash,
    title: title,
    hashAlg: 'md5',
    using: true
  })
  if (typeof res !== 'number' || res < 0) {
    const reason = `putDictMeta default dict return ${res}`
    console.error(reason)
    return Promise.reject(reason)
  }
}

function putBookContent(bookContent) {
  if (!bookContent) {
    return error('invalid bookContent is null')
  }
  if (!validateMd5(bookContent.hash)) {
    return error('invalid hash')
  }
  if (bookContent.content.length < 10) {
    return error('invalid bookContent.content')
  }
  if (acceptFileFormat.indexOf(bookContent.format) < 0) {
    return error(
      `invalid bookContent.format=${bookContent.format} only support ${acceptFileFormat.toString()}`
    )
  }
  bookContent.utime = now()
  console.dir({ ...bookContent, content: `...+${bookContent.content.length}more` })
  return db.bookContent.put(bookContent)
}

function getBookContent(hash) {
  if (!validateMd5(hash)) {
    return error('invalid hash')
  }
  return db.bookContent.get({ hash })
}

function deleteBook(hash) {
  if (!validateMd5(hash)) {
    return error('invalid hash')
  }
  return (async function () {
    await db.bookMeta.where({ hash }).delete()
    await db.bookContent.where({ hash }).delete()
    await deleteBookCfi(hash)
    await deleteBookPercentage(hash)
  })()
}

function putBookmark(mark) {
  if (!validateMd5(mark.bookHash)) {
    return error(`invalid mark.bookHash ${mark.bookHash}`)
  }
  if (!mark.content) {
    return error('invalid mark.content is empty')
  }
  return new Promise((res, rej) => {
    const bookHash = mark.bookHash
    const cfi = mark.cfi
    db.bookmark
      .get({ bookHash, cfi })
      .then((data) => {
        mark = data instanceof Object ? data : mark
        mark.ctime = mark.ctime || now()
        mark.utime = now()
        return db.bookmark.put(mark)
      })
      .then(() => {
        res(mark)
      })
      .catch((e) => {
        rej(e)
      })
  })
}
function listBookmark(bookHash) {
  return db.bookmark.filter((data) => data.bookHash === bookHash).toArray()
}
function listBookmarkAll() {
  return db.bookmark.orderBy('utime').toArray()
}
function deleteBookmark(bookHash, cfi) {
  const wh = { bookHash, cfi }
  return db.bookmark.where(wh).delete()
}
function listWords(filterFn) {
  return db.bookmark.filter(filterFn).toArray()
}
async function putBookCfi(hash, cfi) {
  localStorage.setItem(`book-cfi-${hash}`, cfi)
  const data = await getBookMeta(hash)
  data.utime = now()
  return await putBookMeta(data)
}

function getBookCfi(hash) {
  return Promise.resolve(localStorage.getItem(`book-cfi-${hash}`))
}
function deleteBookCfi(hash) {
  return Promise.resolve(localStorage.removeItem(`book-cfi-${hash}`))
}

function putBookPercentage(hash, percentage) {
  return Promise.resolve(localStorage.setItem(`book-%-${hash}`, percentage))
}
function getBookPercentage(hash) {
  let res = parseFloat(localStorage.getItem(`book-%-${hash}`))
  isNaN(res) ? (res = 0) : null
  return Promise.resolve(res)
}
function deleteBookPercentage(hash) {
  return Promise.resolve(localStorage.removeItem(`book-cfi-${hash}`))
}
export default {
  putBookContent,
  getBookContent,
  putBookMeta,
  listBookMeta,
  getBookMeta,
  deleteBook,
  putBookmark,
  listBookmarkAll,
  listBookmark,
  deleteBookmark,
  listWords,
  putBookCfi,
  putBookPercentage,
  getBookCfi,
  getBookPercentage,
  putDictMeta,
  getDictMeta,
  listDictMeta,
  registRemoteDict
}
