import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

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
