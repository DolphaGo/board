import {CONFIG} from './config'
import axios, {AxiosResponseHeaders} from 'axios'

export const request = axios.create({
  baseURL: `${CONFIG.VITE_FRONT_API_URL || ''}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
  },
})

export const downloadOnBrowser = (data: BlobPart, headers: AxiosResponseHeaders, fileName: string) => {
  const url = window.URL.createObjectURL(new Blob([data]))
  const link = document.createElement('a')
  const contentDisposition = headers['content-disposition'] // 파일 이름
  if (contentDisposition) {
    const [fileNameMatch] = contentDisposition.split(';').filter(str => str.includes('filename'))
    if (fileNameMatch) {
      [, fileName] = fileNameMatch.split('=')
    }
  }
  link.href = url
  link.setAttribute('download', fileName)
  link.style.cssText = 'display:none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
