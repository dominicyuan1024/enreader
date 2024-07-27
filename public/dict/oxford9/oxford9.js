// 工具栏
const sendMessage = window.top.ListenTranslateIframeMessage
let _selectedDefEn = ''
let _selectedDefCn = ''
function clickToolHandle() {
  if (typeof sendMessage !== 'function') {
    return
  }
  if (_selectedDefEn.length === 0) {
    return
  }
  hideTool()
  sendMessage('sense-def', {
    defEN: _selectedDefEn,
    defCN: _selectedDefCn
  })
}
function showTool(x = 0, y = 0) {
  let toolEl = document.querySelector('#selftool')
  if (!toolEl) {
    toolEl = document.createElement('div')
    toolEl.id = 'selftool'
    document.body.appendChild(toolEl)
  }
  toolEl.classList.add('show')
  toolEl.style.left = x - toolEl.offsetWidth / 2 + 'px'
  toolEl.style.top = y - toolEl.offsetHeight - 3 + 'px'
  toolEl.removeEventListener('click', clickToolHandle)
  toolEl.addEventListener('click', clickToolHandle)
}
function hideTool() {
  const toolEl = document.querySelector('#selftool')
  toolEl && toolEl.classList.remove('show')
}
document.body.addEventListener('click', (evt) => {
  if (evt.target.id === 'selftool') {
    return
  }
  hideTool()
})

// 选中定义，弹出工具栏
document.querySelectorAll('def').forEach((el) => {
  el.style.textDecoration = 'underline'
  const relTextDec = window.getComputedStyle(el, null).getPropertyValue('text-decoration')
  if (relTextDec.indexOf('underline') < 0) {
    return
  }
  el.addEventListener('click', (evt) => {
    evt.stopPropagation()
    if (typeof sendMessage !== 'function') {
      return
    }
    let enEl = evt.currentTarget.cloneNode(true)
    enEl.querySelectorAll('chn').forEach((el) => {
      el.innerHtml = ''
      el.innerText = ''
    })
    _selectedDefEn = enEl.innerText
    let cnEl = evt.currentTarget.parentNode.querySelector('.def+deft')
    if (!cnEl) {
      cnEl = evt.currentTarget.querySelector('chn')
    }
    _selectedDefCn = cnEl ? cnEl.innerText : ''
    const { pageX, pageY } = evt
    showTool(pageX, pageY)
  })
})

// 展开折叠内容
const sl = ['unbox', 'x-gs', 'chn']
sl.forEach((item) => {
  document.querySelectorAll(item).forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.stopPropagation()
      evt.currentTarget.classList.toggle('selfshow')
      hideTool()
    })
  })
})
