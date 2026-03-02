import { v } from 'convex/values'
import { action, mutation, query } from './_generated/server'
import { api } from './_generated/api'

export const listAccounts = query({
  handler: async (ctx) => {
    const accounts = await ctx.db.query('accounts').collect()
    return accounts
  },
})

export const createAccount = mutation({
  args: {
    name: v.string(),
    balance: v.number(),
    type: v.union(
      v.literal('checking'),
      v.literal('savings'),
      v.literal('investment'),
      v.literal('credit'),
    ),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('accounts', {
      name: args.name,
      balance: args.balance,
      type: args.type,
      createdAt: Date.now(),
    })
    return id
  },
})

export const listTransactions = query({
  handler: async (ctx) => {
    const transactions = await ctx.db
      .query('transactions')
      .order('desc')
      .take(100)
    return transactions
  },
})

export const addTransaction = mutation({
  args: {
    type: v.union(
      v.literal('expense'),
      v.literal('income'),
      v.literal('transfer'),
      v.literal('investment'),
    ),
    amount: v.number(),
    description: v.string(),
    category: v.optional(v.string()),
    fromAccountId: v.optional(v.id('accounts')),
    toAccountId: v.optional(v.id('accounts')),
  },
  handler: async (ctx, args) => {
    const { type, amount, description, category, fromAccountId, toAccountId } =
      args

    if (type === 'transfer' && fromAccountId && toAccountId) {
      const fromAccount = await ctx.db.get(fromAccountId)
      const toAccount = await ctx.db.get(toAccountId)
      if (fromAccount && toAccount) {
        await ctx.db.patch(fromAccountId, {
          balance: fromAccount.balance - amount,
        })
        await ctx.db.patch(toAccountId, { balance: toAccount.balance + amount })
      }
    } else if (type === 'expense' && fromAccountId) {
      const fromAccount = await ctx.db.get(fromAccountId)
      if (fromAccount) {
        await ctx.db.patch(fromAccountId, {
          balance: fromAccount.balance - amount,
        })
      }
    } else if (type === 'income' && toAccountId) {
      const toAccount = await ctx.db.get(toAccountId)
      if (toAccount) {
        await ctx.db.patch(toAccountId, { balance: toAccount.balance + amount })
      }
    } else if (type === 'investment' && fromAccountId) {
      const fromAccount = await ctx.db.get(fromAccountId)
      if (fromAccount) {
        await ctx.db.patch(fromAccountId, {
          balance: fromAccount.balance - amount,
        })
      }
    }

    const id = await ctx.db.insert('transactions', {
      type,
      amount,
      description,
      category,
      fromAccountId,
      toAccountId,
      date: Date.now(),
      createdAt: Date.now(),
    })
    return id
  },
})

export const getKiteSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('kiteSettings').first()
    if (!settings) return null
    return {
      _id: settings._id,
      _creationTime: settings._creationTime,
      apiKey: settings.apiKey,
      isConnected: settings.isConnected,
      createdAt: settings.createdAt,
      hasAccessToken: !!settings.accessToken,
    }
  },
})

export const getKiteLoginUrl = query({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    console.log('getKiteLoginUrl called')
    const settings = await ctx.db.query('kiteSettings').first()
    console.log(
      'Settings for login URL:',
      settings
        ? {
            apiKey: settings.apiKey,
            hasSecret: !!settings.apiSecret,
          }
        : 'none',
    )
    if (!settings || !settings.apiKey) {
      console.log('No settings or apiKey, returning null')
      return null
    }
    const redirectUrl = 'http://localhost:3001/kite-callback'
    const url = `https://kite.zerodha.com/connect/login?v=3&api_key=${settings.apiKey}&redirect_uri=${encodeURIComponent(redirectUrl)}`
    console.log('Generated login URL:', url)
    return url
  },
})

// Returns raw settings including apiSecret — only for use by server-side actions
export const getRawKiteSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('kiteSettings').first()
  },
})

// Internal mutation to persist the access token after OAuth
export const setKiteAccessToken = mutation({
  args: { accessToken: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query('kiteSettings').first()
    if (!settings) throw new Error('No Kite settings found')
    await ctx.db.patch(settings._id, {
      accessToken: args.accessToken,
      isConnected: true,
    })
  },
})

export const saveKiteSettings = mutation({
  args: {
    apiKey: v.string(),
    apiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('saveKiteSettings called with:', {
      apiKey: args.apiKey,
      hasSecret: !!args.apiSecret,
    })
    const existing = await ctx.db.query('kiteSettings').first()
    console.log('Existing settings:', existing ? 'yes' : 'no')
    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        apiSecret: args.apiSecret,
        isConnected: false,
        accessToken: undefined,
      })
      console.log('Updated existing settings')
      return existing._id
    } else {
      const id = await ctx.db.insert('kiteSettings', {
        apiKey: args.apiKey,
        apiSecret: args.apiSecret,
        isConnected: false,
        accessToken: undefined,
        createdAt: Date.now(),
      })
      console.log('Inserted new settings, id:', id)
      return id
    }
  },
})

export const exchangeKiteToken = action({
  args: {
    requestToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    console.log(
      'exchangeKiteToken called with requestToken:',
      args.requestToken,
    )
    // We need the raw secret, so use a separate internal query
    const rawSettings = await ctx.runQuery(api.myFunctions.getRawKiteSettings)
    console.log(
      'Settings for exchange:',
      rawSettings
        ? {
            apiKey: rawSettings.apiKey,
            hasSecret: !!rawSettings.apiSecret,
            isConnected: rawSettings.isConnected,
          }
        : 'none',
    )

    if (!rawSettings || !rawSettings.apiKey || !rawSettings.apiSecret) {
      console.log('Missing settings, returning error')
      return { success: false, error: 'Kite not configured' }
    }

    const checksum = await sha256(
      `${rawSettings.apiKey}${args.requestToken}${rawSettings.apiSecret}`,
    )
    console.log('Checksum computed')

    try {
      console.log('[kite] exchanging token with params:', {
        api_key: rawSettings.apiKey,
        request_token: args.requestToken,
        checksum: checksum,
      })
      const response = await fetch('https://api.kite.trade/session/token', {
        method: 'POST',
        headers: {
          'X-Kite-Version': '3',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_key: rawSettings.apiKey,
          request_token: args.requestToken,
          checksum: checksum,
        }),
      })

      const responseText = await response.text()
      console.log(
        '[kite] token exchange response:',
        response.status,
        responseText,
      )
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch {
        data = {}
      }

      if (data.status === 'success' && data.data?.access_token) {
        await ctx.runMutation(api.myFunctions.setKiteAccessToken, {
          accessToken: data.data.access_token,
        })
        return { success: true }
      } else {
        return {
          success: false,
          error: data.message || `Token exchange failed: ${responseText}`,
        }
      }
    } catch (error) {
      console.error('[kite] token exchange error:', error)
      return { success: false, error: String(error) }
    }
  },
})

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const disconnectKite = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query('kiteSettings').first()
    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})

interface KiteHolding {
  tradingsymbol: string
  exchange: string
  instrument_token: number
  quantity: number
  average_price: number
  last_price: number
  close_price: number
  value: number
  pnl: number
  unrealised: number
  realised: number
}

interface KitePosition {
  tradingsymbol: string
  exchange: string
  instrument_token: number
  product: string
  quantity: number
  average_price: number
  last_price: number
  value: number
  pnl: number
  unrealised: number
  realised: number
}

export const fetchHoldings = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ holdings: Array<KiteHolding>; error?: string }> => {
    const settings = await ctx.runQuery(api.myFunctions.getRawKiteSettings)
    if (!settings || !settings.isConnected || !settings.accessToken) {
      return { holdings: [], error: 'Not connected to Kite' }
    }

    try {
      console.log('[kite] fetching holdings...')
      const response = await fetch(
        'https://api.kite.trade/portfolio/holdings',
        {
          headers: {
            'X-Kite-Version': '3',
            Authorization: `token ${settings.apiKey}:${settings.accessToken}`,
          },
        },
      )

      const text = await response.text()
      console.log(
        '[kite] holdings response:',
        response.status,
        text.slice(0, 300),
      )

      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = {}
      }

      if (!response.ok) {
        return {
          holdings: [],
          error: `Kite API error (${response.status}): ${data.message || text}`,
        }
      }

      if (data.status === 'success' && data.data) {
        return { holdings: data.data }
      }
      return { holdings: [], error: data.message || 'Unknown error' }
    } catch (error) {
      console.error('[kite] holdings error:', error)
      return { holdings: [], error: String(error) }
    }
  },
})

export const fetchPositions = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    positions: { net: Array<KitePosition>; day: Array<KitePosition> }
    error?: string
  }> => {
    const settings = await ctx.runQuery(api.myFunctions.getRawKiteSettings)
    if (!settings || !settings.isConnected || !settings.accessToken) {
      return { positions: { net: [], day: [] }, error: 'Not connected to Kite' }
    }

    try {
      console.log('[kite] fetching positions...')
      const response = await fetch(
        'https://api.kite.trade/portfolio/positions',
        {
          headers: {
            'X-Kite-Version': '3',
            Authorization: `token ${settings.apiKey}:${settings.accessToken}`,
          },
        },
      )

      const text = await response.text()
      console.log(
        '[kite] positions response:',
        response.status,
        text.slice(0, 300),
      )

      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = {}
      }

      if (!response.ok) {
        return {
          positions: { net: [], day: [] },
          error: `Kite API error (${response.status}): ${data.message || text}`,
        }
      }

      if (data.status === 'success' && data.data) {
        return { positions: data.data }
      }
      return {
        positions: { net: [], day: [] },
        error: data.message || 'Unknown error',
      }
    } catch (error) {
      console.error('[kite] positions error:', error)
      return { positions: { net: [], day: [] }, error: String(error) }
    }
  },
})

export const kiteFetchMargins = action({
  args: {},
  handler: async (ctx): Promise<{ margins: any; error?: string }> => {
    const settings = await ctx.runQuery(api.myFunctions.getRawKiteSettings)
    if (!settings || !settings.isConnected || !settings.accessToken) {
      return { margins: null, error: 'Not connected to Kite' }
    }

    try {
      const response = await fetch('https://api.kite.trade/user/margins', {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${settings.apiKey}:${settings.accessToken}`,
        },
      })

      if (!response.ok) {
        return { margins: null, error: `Kite API error: ${response.status}` }
      }

      const data = await response.json()
      if (data.status === 'success' && data.data) {
        return { margins: data.data }
      }
      return { margins: null, error: data.message || 'Unknown error' }
    } catch (error) {
      return { margins: null, error: String(error) }
    }
  },
})

// ─── Kotak Neo ────────────────────────────────────────────────────────────────

const KOTAK_LOGIN_BASE = 'https://mis.kotaksecurities.com'

export const getKotakSettings = query({
  args: {},
  handler: async (ctx) => {
    const s = await ctx.db.query('kotakSettings').first()
    if (!s) return null
    return {
      _id: s._id,
      _creationTime: s._creationTime,
      consumerKey: s.consumerKey,
      mobileNumber: s.mobileNumber,
      ucc: s.ucc,
      isConnected: s.isConnected,
      createdAt: s.createdAt,
      hasSession: !!s.tradeToken,
    }
  },
})

export const getRawKotakSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('kotakSettings').first()
  },
})

export const saveKotakSettings = mutation({
  args: {
    consumerKey: v.string(),
    consumerSecret: v.string(),
    mobileNumber: v.string(),
    ucc: v.string(),
    mpin: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('kotakSettings').first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        consumerKey: args.consumerKey,
        consumerSecret: args.consumerSecret,
        mobileNumber: args.mobileNumber,
        ucc: args.ucc,
        mpin: args.mpin,
        isConnected: false,
      })
      return existing._id
    }
    return await ctx.db.insert('kotakSettings', {
      consumerKey: args.consumerKey,
      consumerSecret: args.consumerSecret,
      mobileNumber: args.mobileNumber,
      ucc: args.ucc,
      mpin: args.mpin,
      isConnected: false,
      createdAt: Date.now(),
    })
  },
})

export const setKotakSession = mutation({
  args: {
    tradeToken: v.string(),
    sid: v.string(),
    hsServerId: v.string(),
    baseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const s = await ctx.db.query('kotakSettings').first()
    if (!s) throw new Error('No Kotak settings found')
    await ctx.db.patch(s._id, {
      tradeToken: args.tradeToken,
      sid: args.sid,
      hsServerId: args.hsServerId,
      baseUrl: args.baseUrl,
      isConnected: true,
    })
  },
})

export const disconnectKotak = mutation({
  handler: async (ctx) => {
    const s = await ctx.db.query('kotakSettings').first()
    if (s) await ctx.db.delete(s._id)
  },
})

// Step 1: totp_login — pass TOTP, get view token + sid
// Step 2: totp_validate — pass mpin, get trade token + hsServerId
// Both happen inside this single action so user just clicks Connect once
export const kotakConnect = action({
  args: { totp: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      const s = await ctx.runQuery(api.myFunctions.getRawKotakSettings)
      if (!s) return { success: false, error: 'Kotak not configured' }

      // The Authorization value is the consumer key (UUID token) passed directly — no Bearer/Basic prefix
      const authToken = s.consumerKey

      // Step 1: TOTP login → get view token + sid
      console.log('[kotakConnect] Step 1: tradeApiLogin')
      let loginRes: Response
      try {
        loginRes = await fetch(`${KOTAK_LOGIN_BASE}/login/1.0/tradeApiLogin`, {
          method: 'POST',
          headers: {
            Authorization: authToken,
            'neo-fin-key': 'neotradeapi',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobileNumber: s.mobileNumber,
            ucc: s.ucc,
            totp: args.totp,
          }),
        })
      } catch (e) {
        return { success: false, error: `Network error on login: ${String(e)}` }
      }
      const loginText = await loginRes.text()
      console.log(
        '[kotakConnect] login:',
        loginRes.status,
        loginText.slice(0, 400),
      )
      let loginData: any
      try {
        loginData = JSON.parse(loginText)
      } catch {
        loginData = {}
      }
      if (!loginRes.ok || !loginData?.data?.token) {
        return {
          success: false,
          error: `Login failed (${loginRes.status}): ${loginData?.errMsg || loginData?.message || loginText}`,
        }
      }
      const viewToken = loginData.data.token
      const viewSid = loginData.data.sid
      const dataCenter = loginData.data.dataCenter ?? ''

      // Step 2: TOTP validate with MPIN → get trade token
      console.log('[kotakConnect] Step 2: tradeApiValidate')
      let validateRes: Response
      try {
        validateRes = await fetch(
          `${KOTAK_LOGIN_BASE}/login/1.0/tradeApiValidate`,
          {
            method: 'POST',
            headers: {
              Authorization: authToken,
              'neo-fin-key': 'neotradeapi',
              sid: viewSid,
              Auth: viewToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mpin: s.mpin }),
          },
        )
      } catch (e) {
        return {
          success: false,
          error: `Network error on validate: ${String(e)}`,
        }
      }
      const validateText = await validateRes.text()
      console.log(
        '[kotakConnect] validate:',
        validateRes.status,
        validateText.slice(0, 400),
      )
      let validateData: any
      try {
        validateData = JSON.parse(validateText)
      } catch {
        validateData = {}
      }
      if (!validateRes.ok || !validateData?.data?.token) {
        return {
          success: false,
          error: `Validate failed (${validateRes.status}): ${validateData?.errMsg || validateData?.message || validateText}`,
        }
      }

      const tradeToken = validateData.data.token
      const tradeSid = validateData.data.sid
      const hsServerId = validateData.data.hsServerId || dataCenter || ''
      const baseUrl = validateData.data.baseUrl || KOTAK_LOGIN_BASE

      console.log(
        '[kotakConnect] saving session, hsServerId:',
        hsServerId,
        'baseUrl:',
        baseUrl,
      )
      await ctx.runMutation(api.myFunctions.setKotakSession, {
        tradeToken,
        sid: tradeSid,
        hsServerId,
        baseUrl,
      })

      return { success: true }
    } catch (e: any) {
      const detail = `${e?.name}: ${e?.message} | ${String(e)}`
      console.error('[kotakConnect] CAUGHT:', detail)
      return { success: false, error: detail }
    }
  },
})

export const kotakFetchHoldings = action({
  args: {},
  handler: async (ctx): Promise<{ holdings: Array<any>; error?: string }> => {
    const s = await ctx.runQuery(api.myFunctions.getRawKotakSettings)
    if (!s || !s.isConnected || !s.tradeToken) {
      return { holdings: [], error: 'Not connected to Kotak' }
    }
    const baseUrl = s.baseUrl || KOTAK_LOGIN_BASE
    try {
      const res = await fetch(`${baseUrl}/portfolio/v1/holdings`, {
        headers: {
          Sid: s.sid!,
          Auth: s.tradeToken,
          'neo-fin-key': 'neotradeapi',
          accept: 'application/json',
        },
      })
      const text = await res.text()
      console.log('[kotakFetchHoldings]', res.status, text.slice(0, 300))
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = {}
      }
      if (!res.ok)
        return {
          holdings: [],
          error: data?.emsg || data?.message || `API error ${res.status}`,
        }
      return { holdings: data?.data ?? [] }
    } catch (e) {
      return { holdings: [], error: String(e) }
    }
  },
})

export const kotakFetchPositions = action({
  args: {},
  handler: async (ctx): Promise<{ positions: Array<any>; error?: string }> => {
    const s = await ctx.runQuery(api.myFunctions.getRawKotakSettings)
    if (!s || !s.isConnected || !s.tradeToken) {
      return { positions: [], error: 'Not connected to Kotak' }
    }
    const baseUrl = s.baseUrl || KOTAK_LOGIN_BASE
    try {
      const res = await fetch(`${baseUrl}/quick/user/positions`, {
        headers: {
          Sid: s.sid!,
          Auth: s.tradeToken,
          'neo-fin-key': 'neotradeapi',
          accept: 'application/json',
        },
      })
      const text = await res.text()
      console.log('[kotakFetchPositions]', res.status, text.slice(0, 300))
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = {}
      }
      if (!res.ok)
        return {
          positions: [],
          error: data?.emsg || data?.message || `API error ${res.status}`,
        }
      return { positions: data?.data ?? [] }
    } catch (e) {
      return { positions: [], error: String(e) }
    }
  },
})
