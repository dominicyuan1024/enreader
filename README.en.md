# enreader

An English original text reader for easy reading, translation, and vocabulary recording  
https://dominicyuan1024.github.io/enreader/

## ✔ File Format

Currently only supports EPUB format  
Other book file formats are not supported yet, but will be added in the future

## ✔ Bookshelf

<img src="docs/bordered_书架.jpg" width="200px" />
<img src="docs/bordered_书架删除.jpg" width="200px">

## ✔ Reading

Read books, comics, and table of contents  
<img src="docs/bordered_阅读工具.jpg" width="200px" />
<img src="docs/bordered_漫画.jpg" width="200px" />
<img src="docs/bordered_目录.jpg" width="200px" />

## ✔ Vocabulary Notebook

- Tap to highlight words in the book  
  <img src="docs/bordered_高亮选中.jpg" width="200px" />

- Selected words are automatically added to notes with sentence context  
  <img src="docs/bordered_笔记2.jpg" width="200px" />

## ✔ Translation

- Offline dictionary: Oxford Advanced Learner's English-Chinese Dictionary (10th Edition)  
  <img src="docs/bordered_词典.jpg" width="200px" />

- Chinese translations are hidden by default with mosaic effect for immersive English reading, tap to reveal  
  <img src="docs/bordered_翻译2.jpg" width="200px" />

## ✔ Theme Settings

- Font size and color scheme  
  <img src="docs/bordered_风格设置.jpg" width="200px" />

## ✔ Check-in & Share

- Word cloud  
  <img src="docs/bordered_词云分享.jpg" width="200px" />

## ✔ Storage

Data is stored using IndexedDB and localStorage. Data persists after page refresh, but cannot be shared between different browsers

## Todo

- Support PDF format
- Automatically estimate vocabulary level based on notes
- Word pronunciation
- Sentence audio playback
- Sentence translation
- Context-aware word translation
- Offline PWA support

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## Thanks

[mdict-js](https://github.com/fengdh/mdict-js/)
