# enreader 伊恩阅读器

一款英文原著阅读器，便于阅读、翻译与记录生词  
https://dominicyuan1024.github.io/enreader/

## ✔文件格式
目前仅支持 epub 格式  
暂不支持其他格式书籍文件，后续会陆续支持

## ✔书架  
![书架](docs/书架.jpg)  
![书架删除](docs/书架删除.jpg)

## ✔阅读
![阅读工具](docs/阅读工具.jpg)
![目录](docs/目录.jpg)
![漫画](docs/漫画.jpg)

## ✔生词本
可点选标记书中单词，自动加入生词本，自动记录单词所在句子  
![点选](docs/高亮选中.jpg)
![笔记](docs/笔记2.jpg)

## ✔翻译
离线词典 《牛津高阶英汉双解词典（第10版）》 
默认隐藏中文，沉浸阅读   
![翻译](docs/翻译2.jpg)
![词典](docs/词典.jpg)

## ✔主题设置
字体大小  
配色  
![风格设置](docs/风格设置.jpg)   

## ✔打卡分享：生词云图  
![分享](docs/词云分享.jpg)

## ✔存储
使用 indexDB、localStorage 存储数据，刷新页面不会丢失，但不同浏览器之间数据无法共享

## Todo
* 支持 pdf 格式
* 支持单词分级（初中 高中 四级 六级 雅思 托福）
* 根据笔记自动估算词汇量水平
* 单词发音
* 句子朗读
* 句子翻译
* 结合句子上下文精准翻译单词
* 离线应用 pwa


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
