import { describe, it, expect, vi, beforeEach } from 'vitest'

// Types NetEase's CDN lacks (new Equinox items). It answers HEAD with a 302 to
// /Type/1_{N}.png, which the probe detects via Response.url.
const NETEASE_MISSING = new Set([92819, 92570])
// Types evetech's CDN lacks (国服-only hulls).
const EVETECH_MISSING = new Set([84004])

vi.stubGlobal('fetch', vi.fn(async (url) => {
  const s = String(url)
  const id = Number(s.match(/(?:types\/|Type\/|Render\/)(\d+)/)?.[1])
  const missing = NETEASE_MISSING.has(id)
  return { url: missing ? 'https://image.evepc.163.com/Type/1_32.png' : s, status: 200 }
}))

const { typeIcon } = await import('./typeIcon.js')

function mountImg(src) {
  const img = document.createElement('img')
  document.body.appendChild(img)
  img.src = src
  return img
}

// Let the probe promise and any resulting src swap settle.
const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('typeIcon', () => {
  it('picks the NetEase CDN on 国服 and evetech on 世界服', () => {
    localStorage.setItem('eve_server', 'gf')
    expect(typeIcon(18)).toBe('https://image.evepc.163.com/Type/18_32.png')
    localStorage.setItem('eve_server', 'of')
    expect(typeIcon(18)).toBe('https://images.evetech.net/types/18/icon?size=32')
  })

  it('caps NetEase icons at their two real sizes and renders at the next size up', () => {
    localStorage.setItem('eve_server', 'gf')
    expect(typeIcon(18, 64)).toBe('https://image.evepc.163.com/Type/18_64.png')
    expect(typeIcon(18, 128, 'render')).toBe('https://image.evepc.163.com/Render/18_128.png')
    expect(typeIcon(18, 200, 'render')).toBe('https://image.evepc.163.com/Render/18_256.png')
  })
})

describe('cross-host icon fallback', () => {
  it('swaps a NetEase placeholder to evetech after load', async () => {
    localStorage.setItem('eve_server', 'gf')
    const img = mountImg(typeIcon(92819))
    img.dispatchEvent(new Event('load'))
    await settle()
    expect(img.src).toBe('https://images.evetech.net/types/92819/icon?size=32')
  })

  it('leaves an icon NetEase really has alone', async () => {
    localStorage.setItem('eve_server', 'gf')
    const img = mountImg(typeIcon(18))
    img.dispatchEvent(new Event('load'))
    await settle()
    expect(img.src).toBe('https://image.evepc.163.com/Type/18_32.png')
    expect(img.dataset.fallbackDone).toBeUndefined()
  })

  it('falls back to NetEase when evetech 404s a 国服-only item', () => {
    localStorage.setItem('eve_server', 'of')
    const img = mountImg(typeIcon(84004))
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe('https://image.evepc.163.com/Type/84004_32.png')
  })

  it('walks the whole chain and then stops instead of looping', async () => {
    localStorage.setItem('eve_server', 'gf')
    // 92570 is missing on NetEase; force evetech to reject both variants too.
    const img = mountImg(typeIcon(92570))
    img.dispatchEvent(new Event('load'))
    await settle()
    expect(img.src).toBe('https://images.evetech.net/types/92570/icon?size=32')

    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe('https://images.evetech.net/types/92570/render?size=32')

    img.dispatchEvent(new Event('error'))
    expect(img.dataset.fallbackDone).toBe('1')

    const exhausted = img.src
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe(exhausted)
  })

  it('never returns to NetEase once its placeholder confirmed the type is absent', async () => {
    localStorage.setItem('eve_server', 'gf')
    const img = mountImg(typeIcon(92819))
    img.dispatchEvent(new Event('load'))
    await settle()
    expect(img.dataset.skipNes).toBe('1')

    // evetech failing too must not walk back into NetEase's render placeholder.
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe('https://images.evetech.net/types/92819/render?size=32')
    expect(img.dataset.tried).not.toContain('image.evepc.163.com/Render')
  })

  it('never falls back for the placeholder type itself', () => {
    localStorage.setItem('eve_server', 'gf')
    const img = mountImg('https://image.evepc.163.com/Type/1_32.png')
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe('https://image.evepc.163.com/Type/1_32.png')
  })

  it('ignores images from unrelated hosts', () => {
    const img = mountImg('https://example.com/a.png')
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe('https://example.com/a.png')
  })
})
