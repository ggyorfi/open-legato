const CAPACITY = 10

type CacheItem = {
  key: string
  canvas: HTMLCanvasElement
}

const items: CacheItem[] = new Array(CAPACITY)

export const setPage = (key: string, canvas: HTMLCanvasElement) => {
  const idx = items.findIndex((item) => key === item?.key)

  if (idx !== -1) {
    items.push(items.splice(idx, 1)[0])
  } else {
    items.push({ key, canvas })
  }

  while (items.length > CAPACITY) items.shift()
}

export const getPage = (key: string) =>
  items.find((item) => key === item?.key)?.canvas
