// Разбор стримов для секции #streams: принимает ссылку на канал/видео, адрес плеера
// или целиком код <iframe> с площадки и собирает из него безопасный адрес встраивания.
// Поддерживаемые форматы описаны в docs/STREAMS.md.

export type StreamPlatform = 'kick' | 'twitch' | 'youtube' | 'vk' | 'rutube'

export interface StreamEmbed {
  platform: StreamPlatform
  /** Канал или ID видео — для подписи плеера */
  name: string
  /** Адрес для <iframe src> */
  src: string
}

export const streamPlatformNames: Record<StreamPlatform, string> = {
  kick: 'Kick',
  twitch: 'Twitch',
  youtube: 'YouTube',
  vk: 'VK Видео',
  rutube: 'Rutube',
}

const NAME = /^[\w-]+$/
const YOUTUBE_ID = /^[\w-]{11}$/
const YOUTUBE_CHANNEL = /^UC[\w-]{22}$/
const VK_VIDEO = /(?:video|clip)(-?\d+)_(\d+)/
const RUTUBE_ID = /^[\da-f]{32}$/i

// Первый сегмент пути twitch.tv/<…>, который не является каналом
const TWITCH_RESERVED = new Set(['directory', 'videos', 'settings', 'search', 'downloads', 'p', 'subscriptions', 'inventory', 'wallet', 'drops', 'friends'])

type Parsed = { platform: StreamPlatform, name: string, src: (host: string) => string }

/**
 * Превращает строку из `streams` (app/data/site.ts) в плеер.
 * `host` — домен текущей страницы, его требует Twitch (параметр parent).
 * Возвращает null, если площадка не поддерживается или ссылка не распознана.
 */
export function parseStream(input: string, host: string): StreamEmbed | null {
  const parsed = parse(input.trim())
  if (!parsed)
    return null
  return { platform: parsed.platform, name: parsed.name, src: parsed.src(host) }
}

function parse(input: string): Parsed | null {
  if (!input)
    return null

  // Код <iframe …> — берём только src, остальные атрибуты задаёт компонент
  if (input.startsWith('<')) {
    const src = input.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const value = src?.[1] ?? src?.[2] ?? src?.[3]
    return value ? parse(value.replaceAll('&amp;', '&')) : null
  }

  // Короткая запись «площадка:канал», например «kick:gmhikaru»
  const short = input.match(/^(kick|twitch|youtube|rutube):(.+)$/i)
  if (short)
    return parseShort(short[1]!.toLowerCase() as StreamPlatform, short[2]!.trim())

  let url: URL
  try {
    url = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input.replace(/^\/\//, '')}`)
  }
  catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
  const path = url.pathname.split('/').filter(Boolean)

  if (host === 'kick.com' || host === 'player.kick.com')
    return kick(path[0])

  if (host === 'player.twitch.tv') {
    const video = url.searchParams.get('video')
    return video ? twitchVideo(video) : twitch(url.searchParams.get('channel') ?? undefined)
  }
  if (host === 'twitch.tv' || host === 'go.twitch.tv') {
    if (path[0] === 'videos')
      return twitchVideo(path[1])
    if (path[1] === 'video' || path[1] === 'v')
      return twitchVideo(path[2])
    return path[0] && TWITCH_RESERVED.has(path[0].toLowerCase()) ? null : twitch(path[0])
  }

  if (host === 'youtu.be')
    return youtube(path[0])
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (path[0] === 'watch')
      return youtube(url.searchParams.get('v') ?? undefined)
    if (path[0] === 'embed' && path[1] === 'live_stream')
      return youtubeChannel(url.searchParams.get('channel') ?? undefined)
    if (path[0] === 'channel')
      return youtubeChannel(path[1])
    if (path[0] === 'live' || path[0] === 'embed' || path[0] === 'shorts' || path[0] === 'v')
      return youtube(path[1])
    return null
  }

  if (host === 'vk.com' || host === 'vk.ru' || host === 'vkvideo.ru') {
    if (path[0] === 'video_ext.php')
      return vk(url.searchParams.get('oid') ?? undefined, url.searchParams.get('id') ?? undefined, url.searchParams.get('hash') ?? undefined)
    const match = (url.pathname + (url.searchParams.get('z') ?? '')).match(VK_VIDEO)
    return match ? vk(match[1], match[2]) : null
  }

  if (host === 'rutube.ru') {
    // /video/<id>/, /live/video/<id>/, /play/embed/<id>, /shorts/<id>/
    const id = path.find(segment => RUTUBE_ID.test(segment))
    return rutube(id, url.searchParams.get('p') ?? undefined)
  }

  return null
}

function parseShort(platform: StreamPlatform, value: string): Parsed | null {
  switch (platform) {
    case 'kick': return kick(value)
    case 'twitch': return twitch(value)
    case 'youtube': return YOUTUBE_CHANNEL.test(value) ? youtubeChannel(value) : youtube(value)
    case 'rutube': return rutube(value)
    default: return null
  }
}

function kick(channel?: string): Parsed | null {
  if (!channel || !NAME.test(channel))
    return null
  return { platform: 'kick', name: channel, src: () => `https://player.kick.com/${channel}` }
}

function twitch(channel?: string): Parsed | null {
  if (!channel || !NAME.test(channel))
    return null
  return {
    platform: 'twitch',
    name: channel,
    src: host => `https://player.twitch.tv/?channel=${channel}&parent=${encodeURIComponent(host)}`,
  }
}

function twitchVideo(video?: string): Parsed | null {
  const id = video?.replace(/^v/i, '')
  if (!id || !/^\d+$/.test(id))
    return null
  return {
    platform: 'twitch',
    name: `v${id}`,
    src: host => `https://player.twitch.tv/?video=v${id}&parent=${encodeURIComponent(host)}`,
  }
}

function youtube(id?: string): Parsed | null {
  if (!id || !YOUTUBE_ID.test(id))
    return null
  return { platform: 'youtube', name: id, src: () => `https://www.youtube.com/embed/${id}` }
}

function youtubeChannel(channel?: string): Parsed | null {
  if (!channel || !YOUTUBE_CHANNEL.test(channel))
    return null
  return { platform: 'youtube', name: channel, src: () => `https://www.youtube.com/embed/live_stream?channel=${channel}` }
}

function vk(oid?: string, id?: string, hash?: string): Parsed | null {
  if (!oid || !id || !/^-?\d+$/.test(oid) || !/^\d+$/.test(id))
    return null
  const params = new URLSearchParams({ oid, id, hd: '2' })
  if (hash && /^\w+$/.test(hash))
    params.set('hash', hash)
  return { platform: 'vk', name: `video${oid}_${id}`, src: () => `https://vkvideo.ru/video_ext.php?${params}` }
}

function rutube(id?: string, privateKey?: string): Parsed | null {
  if (!id || !RUTUBE_ID.test(id))
    return null
  const query = privateKey && /^[\w-]+$/.test(privateKey) ? `?p=${privateKey}` : ''
  return { platform: 'rutube', name: id, src: () => `https://rutube.ru/play/embed/${id}${query}` }
}
