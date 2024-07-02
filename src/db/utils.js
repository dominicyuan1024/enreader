export function validateMd5(hash) {
  if (!hash) {
    return false
  }
  if (hash.length != 32) {
    return false
  }
  return true
}

export function error(errData) {
  return Promise.reject(errData)
}
