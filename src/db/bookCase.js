import Dexie from 'dexie'
import { error, validateMd5 } from './utils.js'
export const acceptFileFormat = ['application/epub+zip', 'application/epub']
const originDb = new Dexie('bookcase')
let stored = false
const db = new Proxy(originDb, {
  get: function (target, key, receiver) {
    if (!stored) {
      target.version(1).stores({
        bookMeta: '++id, &hash, hashAlg, title, author, cover, progress, utime',
        bookContent: '++id, &hash, content, filename, format, size, utime'
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
    bookMeta.hashAlg = 'bookMeta.hashAlg'
    return error('invalid bookMeta.hash')
  }
  bookMeta.utime = now()
  console.dir(bookMeta)
  return db.bookMeta.put(bookMeta)
}

function getBookMeta(hash) {
  return db.bookMeta.get({ hash })
}

function listBookMeta() {
  return db.bookMeta.orderBy('id').toArray()
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
  putBookCfi,
  putBookPercentage,
  getBookCfi,
  getBookPercentage
}
