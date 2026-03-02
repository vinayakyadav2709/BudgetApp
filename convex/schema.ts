import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  accounts: defineTable({
    name: v.string(),
    balance: v.number(),
    type: v.union(
      v.literal('checking'),
      v.literal('savings'),
      v.literal('investment'),
      v.literal('credit'),
    ),
    createdAt: v.number(),
  }),
  transactions: defineTable({
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
    date: v.number(),
    createdAt: v.number(),
  }),
  kiteSettings: defineTable({
    apiKey: v.string(),
    apiSecret: v.string(),
    accessToken: v.optional(v.string()),
    isConnected: v.boolean(),
    createdAt: v.number(),
  }),
  kotakSettings: defineTable({
    consumerKey: v.string(),
    consumerSecret: v.optional(v.string()),
    mobileNumber: v.string(),
    ucc: v.string(),
    mpin: v.string(),
    // session fields populated after login
    tradeToken: v.optional(v.string()),
    sid: v.optional(v.string()),
    hsServerId: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    isConnected: v.boolean(),
    createdAt: v.number(),
  }),
})
