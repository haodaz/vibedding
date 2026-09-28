import { useEffect, useState } from 'react'

// 极简 hash 路由：#/path 、#/doc/<content 路径>
export function useHashRoute(): string {
  const get = () => decodeURIComponent(location.hash.replace(/^#/, '') || '/')
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const onChange = () => setRoute(get())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function href(path: string) {
  return '#' + path
}
