import { createClient } from '@/types/clients'
import { createEndpoint } from '@/types/endpoints'
import { createInbound } from '@/types/inbounds'
import { createOutbound } from '@/types/outbounds'
import { createSrv } from '@/types/services'
import type { Client } from '@/types/clients'
import type { Endpoint } from '@/types/endpoints'
import type { Inbound } from '@/types/inbounds'
import type { Outbound } from '@/types/outbounds'
import type { Srv } from '@/types/services'
import type { tls } from '@/types/tls'

interface DevMockMsg {
  success: boolean
  msg: string
  obj: any | null
}

type HttpMethod = 'get' | 'post'
type RequestData = Record<string, any> | FormData | null | undefined

const envEnabled = (value?: string): boolean => {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase())
}

export const isDevBypassAuthEnabled = (): boolean => {
  return import.meta.env.DEV && envEnabled(import.meta.env.VITE_DEV_BYPASS_AUTH)
}

export const isDevMockEnabled = (): boolean => {
  return import.meta.env.DEV && envEnabled(import.meta.env.VITE_DEV_MOCK)
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const nowSeconds = (): number => Math.floor(Date.now() / 1000)

const mockSettings: Record<string, string> = {
  webListen: '',
  webDomain: '',
  webPort: '2095',
  webCertFile: '',
  webKeyFile: '',
  webPath: '/app/',
  webURI: '',
  sessionMaxAge: '0',
  trafficAge: '30',
  timeLocation: 'Asia/Shanghai',
  subListen: '',
  subPort: '2096',
  subPath: '/sub/',
  subDomain: '',
  subCertFile: '',
  subKeyFile: '',
  subUpdates: '12',
  subEncode: 'true',
  subShowInfo: 'false',
  subURI: 'http://localhost:2096/sub/',
  subJsonExt: '',
  subClashExt: '',
}

const mockState = {
  config: {
    log: {
      level: 'info',
      timestamp: true,
      output: '',
    },
    dns: {
      servers: [
        { tag: 'local', type: 'local' },
        { tag: 'google', type: 'tls', server: '8.8.8.8', server_port: 853, tls: { enabled: true, server_name: 'dns.google' } },
      ],
      rules: [
        { domain_suffix: ['local'], action: 'route', server: 'local' },
      ],
      final: 'local',
      strategy: 'prefer_ipv4',
    },
    route: {
      rules: [
        { domain_suffix: ['example.com'], action: 'route', outbound: 'direct' },
      ],
      rule_set: [
        { tag: 'dev-geosite-cn', type: 'remote', format: 'binary', url: 'https://example.com/geosite-cn.srs', download_detour: 'direct', update_interval: '1d' },
      ],
      final: 'direct',
      auto_detect_interface: true,
    },
    ntp: {},
    experimental: {},
  },
  clients: [
    createClient({
      id: 1,
      enable: true,
      name: 'demo-user',
      inbounds: [1, 2],
      volume: 107374182400,
      expiry: nowSeconds() + 30 * 86400,
      up: 104857600,
      down: 524288000,
      totalUp: 104857600,
      totalDown: 524288000,
      desc: 'Mock client for frontend development',
      group: 'dev',
    }),
  ] as Client[],
  inbounds: [
    createInbound('mixed', { id: 1, type: 'mixed', tag: 'mixed-in', tls_id: 0, listen: '::', listen_port: 2080, users: ['demo-user'], addrs: [], out_json: {} }),
    createInbound('shadowsocks', {
      id: 2,
      type: 'shadowsocks',
      tag: 'ss-in',
      tls_id: 0,
      listen: '::',
      listen_port: 8388,
      method: '2022-blake3-aes-128-gcm',
      password: 'dev-password',
      users: ['demo-user'],
      addrs: [],
      out_json: {},
    }),
  ] as Inbound[],
  outbounds: [
    createOutbound('direct', { id: 1, type: 'direct', tag: 'direct' }),
    createOutbound('selector', { id: 2, type: 'selector', tag: 'auto', outbounds: ['direct'], interrupt_exist_connections: false }),
  ] as Outbound[],
  endpoints: [
    createEndpoint('tailscale', { id: 1, type: 'tailscale', tag: 'dev-tailscale', domain_resolver: 'local', listen_port: 0 }),
  ] as Endpoint[],
  services: [
    createSrv('resolved', { id: 1, type: 'resolved', tag: 'local-resolved', listen: '::', listen_port: 53, tls_id: 0 }),
  ] as Srv[],
  tls: [
    {
      id: 1,
      name: 'dev-tls',
      server: { enabled: true, server_name: 'example.com' },
      client: { enabled: true, server_name: 'example.com', insecure: true },
    },
  ] as tls[],
  settings: mockSettings,
  users: [
    { id: 1, username: 'admin', lastLogin: '2026-05-12 10:20:00 127.0.0.1' },
  ],
  tokens: [
    { id: 1, token: '****', desc: 'dev-token', expiry: nowSeconds() + 30 * 86400 },
  ],
  nextIds: {
    clients: 2,
    inbounds: 3,
    outbounds: 3,
    endpoints: 2,
    services: 2,
    tls: 2,
    tokens: 2,
    changes: 3,
  },
}

const ok = (obj: any = null, msg = ''): DevMockMsg => ({
  success: true,
  msg,
  obj: clone(obj),
})

const fail = (msg: string): DevMockMsg => ({
  success: false,
  msg,
  obj: null,
})

const panelData = () => ({
  config: mockState.config,
  clients: mockState.clients,
  tls: mockState.tls,
  inbounds: mockState.inbounds,
  outbounds: mockState.outbounds,
  endpoints: mockState.endpoints,
  services: mockState.services,
  subURI: mockState.settings.subURI,
  enableTraffic: mockState.settings.trafficAge !== '0',
  onlines: {
    inbound: ['mixed-in', 'ss-in'],
    outbound: ['direct'],
    user: ['demo-user'],
  },
})

const normalizeUrl = (url: string): string => {
  return url.replace(/^\.?\//, '').replace(/^app\//, '').split('?')[0]
}

const requestValue = (data: RequestData, key: string): any => {
  if (!data) return undefined
  if (data instanceof FormData) return data.get(key)
  return data[key]
}

const parsePayload = (data: RequestData): any => {
  const raw = requestValue(data, 'data')
  if (typeof raw !== 'string') return raw ?? null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const idFrom = (value: any): number => Number(value?.id ?? 0)

const nextId = (key: keyof typeof mockState.nextIds): number => {
  const id = mockState.nextIds[key]
  mockState.nextIds[key] += 1
  return id
}

const upsertById = (items: any[], item: any, key: keyof typeof mockState.nextIds): void => {
  if (!item.id || item.id <= 0) item.id = nextId(key)
  const index = items.findIndex((i) => i.id === item.id)
  if (index >= 0) items[index] = item
  else items.push(item)
}

const deleteByIdOrTag = (items: any[], value: any): void => {
  const valueId = Number(value)
  const valueTag = String(value)
  const index = items.findIndex((item) => item.id === valueId || item.tag === valueTag)
  if (index >= 0) items.splice(index, 1)
}

const handleSave = (data: RequestData): DevMockMsg => {
  const objectName = String(requestValue(data, 'object') ?? '')
  const action = String(requestValue(data, 'action') ?? '')
  const payload = parsePayload(data)

  switch (objectName) {
    case 'settings':
      mockState.settings = { ...mockState.settings, ...(payload ?? {}) }
      return ok({ settings: mockState.settings })
    case 'config':
      if (payload) mockState.config = payload
      return ok({ config: mockState.config })
    case 'clients':
      if (action === 'del') {
        deleteByIdOrTag(mockState.clients, payload)
      } else if (action === 'delbulk' && Array.isArray(payload)) {
        payload.forEach((id) => deleteByIdOrTag(mockState.clients, id))
      } else if (action === 'addbulk' && Array.isArray(payload)) {
        payload.forEach((client) => upsertById(mockState.clients, client, 'clients'))
      } else if (action === 'editbulk' && Array.isArray(payload)) {
        payload.forEach((client) => upsertById(mockState.clients, client, 'clients'))
      } else if (payload) {
        upsertById(mockState.clients, payload, 'clients')
      }
      return ok({ clients: mockState.clients })
    case 'inbounds':
      if (action === 'del') deleteByIdOrTag(mockState.inbounds, payload)
      else if (payload) upsertById(mockState.inbounds, payload, 'inbounds')
      return ok({ inbounds: mockState.inbounds })
    case 'outbounds':
      if (action === 'del') deleteByIdOrTag(mockState.outbounds, payload)
      else if (payload) upsertById(mockState.outbounds, payload, 'outbounds')
      return ok({ outbounds: mockState.outbounds })
    case 'endpoints':
      if (action === 'del') deleteByIdOrTag(mockState.endpoints, payload)
      else if (payload) upsertById(mockState.endpoints, payload, 'endpoints')
      return ok({ endpoints: mockState.endpoints })
    case 'services':
      if (action === 'del') deleteByIdOrTag(mockState.services, payload)
      else if (payload) upsertById(mockState.services, payload, 'services')
      return ok({ services: mockState.services })
    case 'tls':
      if (action === 'del') deleteByIdOrTag(mockState.tls, payload)
      else if (payload) upsertById(mockState.tls, payload, 'tls')
      return ok({ tls: mockState.tls })
    default:
      return ok(panelData())
  }
}

const filterById = <T extends { id?: number }>(items: T[], data: RequestData): T[] => {
  const id = Number(requestValue(data, 'id') ?? 0)
  if (!id) return items
  return items.filter((item) => item.id === id)
}

const mockStatus = () => ({
  cpu: 18 + Math.round(Math.random() * 15),
  mem: { current: 2.4 * 1024 ** 3, total: 8 * 1024 ** 3 },
  dsk: { current: 86 * 1024 ** 3, total: 256 * 1024 ** 3 },
  swp: { current: 256 * 1024 ** 2, total: 2 * 1024 ** 3 },
  net: {
    recv: 128 * 1024 ** 2 + Math.round(Math.random() * 1024 ** 2),
    sent: 64 * 1024 ** 2 + Math.round(Math.random() * 1024 ** 2),
    precv: 12 * 1024 + Math.round(Math.random() * 1024),
    psent: 9 * 1024 + Math.round(Math.random() * 1024),
  },
  dio: { read: 24 * 1024 ** 2, write: 48 * 1024 ** 2 },
  sys: {
    hostName: 'dev-mock',
    cpuType: 'Apple Silicon',
    cpuCount: 8,
    ipv4: ['127.0.0.1'],
    ipv6: ['::1'],
    appVersion: 'dev',
    bootTime: nowSeconds() - 7200,
  },
  sbd: {
    running: true,
    stats: {
      Alloc: 64 * 1024 ** 2,
      NumGoroutine: 18,
      Uptime: 3600,
    },
  },
  db: {
    clients: mockState.clients.length,
    inbounds: mockState.inbounds.length,
    outbounds: mockState.outbounds.length,
    services: mockState.services.length,
    endpoints: mockState.endpoints.length,
    clientUp: mockState.clients.reduce((sum, client) => sum + (client.up ?? 0), 0),
    clientDown: mockState.clients.reduce((sum, client) => sum + (client.down ?? 0), 0),
  },
})

const mockStats = (data: RequestData) => {
  const tag = String(requestValue(data, 'tag') ?? 'demo-user')
  const resource = String(requestValue(data, 'resource') ?? 'client')
  const now = nowSeconds()
  return Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    dateTime: now - index * 30,
    direction: index % 2 === 0,
    traffic: 512 * 1024 + (index % 8) * 128 * 1024,
    resource,
    tag,
  }))
}

const mockChanges = (data: RequestData) => {
  const actor = String(requestValue(data, 'a') ?? '')
  const key = String(requestValue(data, 'k') ?? '')
  const count = Number(requestValue(data, 'c') ?? 10)
  const changes = [
    { id: 1, dateTime: nowSeconds() - 1800, Actor: 'admin', key: 'inbounds', action: 'new', index: 1, obj: JSON.stringify(mockState.inbounds[0], null, 2) },
    { id: 2, dateTime: nowSeconds() - 900, Actor: 'admin', key: 'clients', action: 'edit', index: 1, obj: JSON.stringify(mockState.clients[0], null, 2) },
  ]
  return changes
    .filter((item) => !actor || item.Actor === actor)
    .filter((item) => !key || item.key === key)
    .slice(0, count)
}

const mockLogs = (data: RequestData) => {
  const count = Number(requestValue(data, 'c') ?? 10)
  return [
    '[INFO] dev mock server is enabled in frontend only',
    '[INFO] loaded mock clients, inbounds and outbounds',
    '[DEBUG] backend request was intercepted by frontend devMock.ts',
    '[INFO] sing-box mock status: running',
  ].slice(0, count)
}

const keypairs = (data: RequestData) => {
  const kind = String(requestValue(data, 'k') ?? '')
  if (kind === 'wireguard') {
    if (requestValue(data, 'o')) return ['dev-wireguard-public-key']
    return ['PrivateKey: dev-wireguard-private-key', 'PublicKey: dev-wireguard-public-key']
  }
  if (kind === 'reality') {
    return ['PrivateKey: dev-reality-private-key', 'PublicKey: dev-reality-public-key']
  }
  if (kind === 'ech') {
    return [
      '-----BEGIN ECH CONFIGS-----',
      'dev-ech-config',
      '-----END ECH CONFIGS-----',
      '-----BEGIN ECH KEYS-----',
      'dev-ech-key',
      '-----END ECH KEYS-----',
    ]
  }
  return [
    '-----BEGIN PRIVATE KEY-----',
    'dev-private-key',
    '-----END PRIVATE KEY-----',
    '-----BEGIN CERTIFICATE-----',
    'dev-certificate',
    '-----END CERTIFICATE-----',
  ]
}

const addToken = (data: RequestData): DevMockMsg => {
  const id = nextId('tokens')
  const expiryDays = Number(requestValue(data, 'expiry') ?? 0)
  const token = `dev-token-${id}`
  mockState.tokens.push({
    id,
    token: '****',
    desc: String(requestValue(data, 'desc') ?? ''),
    expiry: expiryDays > 0 ? nowSeconds() + expiryDays * 86400 : 0,
  })
  return ok(token)
}

const deleteToken = (data: RequestData): DevMockMsg => {
  deleteByIdOrTag(mockState.tokens, requestValue(data, 'id'))
  return ok()
}

export const getDevMockResponse = (method: HttpMethod, url: string, data?: RequestData): DevMockMsg | undefined => {
  if (!isDevMockEnabled()) return undefined

  const path = normalizeUrl(url)

  if (method === 'get') {
    switch (path) {
      case 'api/load':
        return ok(panelData())
      case 'api/inbounds':
        return ok({ inbounds: filterById(mockState.inbounds, data) })
      case 'api/clients':
        return ok({ clients: filterById(mockState.clients, data) })
      case 'api/outbounds':
        return ok({ outbounds: mockState.outbounds })
      case 'api/endpoints':
        return ok({ endpoints: mockState.endpoints })
      case 'api/services':
        return ok({ services: mockState.services })
      case 'api/tls':
        return ok({ tls: mockState.tls })
      case 'api/config':
        return ok({ config: mockState.config })
      case 'api/settings':
        return ok(mockState.settings)
      case 'api/status':
        return ok(mockStatus())
      case 'api/onlines':
        return ok(panelData().onlines)
      case 'api/logs':
        return ok(mockLogs(data))
      case 'api/stats':
        return ok(mockStats(data))
      case 'api/changes':
        return ok(mockChanges(data))
      case 'api/keypairs':
        return ok(keypairs(data))
      case 'api/tokens':
        return ok(mockState.tokens)
      case 'api/users':
        return ok(mockState.users)
      case 'api/checkOutbound':
        return ok({ OK: true, Delay: 42, Error: '' })
      case 'api/logout':
        document.cookie = 's-ui=; Max-Age=0; path=/'
        return ok()
      default:
        return undefined
    }
  }

  switch (path) {
    case 'api/login':
      document.cookie = 's-ui=dev-mock; path=/; SameSite=Lax'
      return ok()
    case 'api/save':
      return handleSave(data)
    case 'api/restartApp':
      return ok(null, 'restartApp')
    case 'api/restartSb':
      return ok(null, 'restartSb')
    case 'api/linkConvert':
      return ok(createOutbound('vless', {
        id: 0,
        type: 'vless',
        tag: 'imported-vless',
        server: 'example.com',
        server_port: 443,
        uuid: '00000000-0000-4000-8000-000000000000',
        tls: { enabled: true, server_name: 'example.com' },
      }))
    case 'api/subConvert':
      return ok([
        createOutbound('vless', {
          id: 0,
          type: 'vless',
          tag: 'sub-vless',
          server: 'example.com',
          server_port: 443,
          uuid: '00000000-0000-4000-8000-000000000000',
          tls: { enabled: true, server_name: 'example.com' },
        }),
      ])
    case 'api/changePass':
    case 'api/importdb':
      return ok()
    case 'api/addToken':
      return addToken(data)
    case 'api/deleteToken':
      return deleteToken(data)
    default:
      return fail(`dev mock has no handler for ${path}`)
  }
}
