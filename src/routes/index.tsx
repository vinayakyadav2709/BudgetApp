import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@tamagui/button'
import { Card } from '@tamagui/card'
import { Input } from '@tamagui/input'
import { Text, View } from '@tamagui/core'
import { YStack, XStack } from '@tamagui/stacks'
import { TamaguiProvider } from '@tamagui/core'
import tamaguiConfig from '../../tamagui.config'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: BudgetApp,
})

function BudgetApp() {
  const [isDark, setIsDark] = useState(true)

  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme={isDark ? 'dark' : 'light'}
    >
      <BudgetAppContent isDark={isDark} setIsDark={setIsDark} />
    </TamaguiProvider>
  )
}

function Modal({
  open,
  onClose,
  title,
  children,
  isDark,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  isDark: boolean
}) {
  if (!open) return null
  return (
    <>
      <View
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="rgba(0,0,0,0.5)"
        zIndex={100}
        onPress={onClose}
      />
      <View
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%,-50%)"
        backgroundColor={isDark ? '$gray3' : '$white'}
        padding="$6"
        borderRadius="$4"
        minWidth={400}
        zIndex={101}
      >
        <Text
          fontSize="$6"
          fontWeight="bold"
          marginBottom="$4"
          color={isDark ? '$white' : '$gray12'}
        >
          {title}
        </Text>
        {children}
      </View>
    </>
  )
}

function BudgetAppContent({
  isDark,
  setIsDark,
}: {
  isDark: boolean
  setIsDark: (v: boolean) => void
}) {
  const accounts = useQuery(api.myFunctions.listAccounts) ?? []
  const transactions = useQuery(api.myFunctions.listTransactions) ?? []
  const createAccount = useMutation(api.myFunctions.createAccount)
  const addTransaction = useMutation(api.myFunctions.addTransaction)

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'transactions' | 'accounts'
  >('dashboard')
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)

  const [accountName, setAccountName] = useState('')
  const [accountBalance, setAccountBalance] = useState('')
  const [accountType, setAccountType] = useState('checking')

  const [txType, setTxType] = useState('expense')
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txCategory, setTxCategory] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')

  const handleCreateAccount = () => {
    if (accountName && accountBalance) {
      createAccount({
        name: accountName,
        balance: parseFloat(accountBalance),
        type: accountType as any,
      })
      setAccountName('')
      setAccountBalance('')
      setShowAddAccount(false)
    }
  }

  const handleAddTransaction = () => {
    if (txAmount && txDescription) {
      addTransaction({
        type: txType as any,
        amount: parseFloat(txAmount),
        description: txDescription,
        category: txCategory || undefined,
        fromAccountId: fromAccountId ? (fromAccountId as any) : undefined,
        toAccountId: toAccountId ? (toAccountId as any) : undefined,
      })
      setTxAmount('')
      setTxDescription('')
      setTxCategory('')
      setFromAccountId('')
      setToAccountId('')
      setShowAddTransaction(false)
    }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalInvestments = transactions
    .filter((t) => t.type === 'investment')
    .reduce((sum, t) => sum + t.amount, 0)

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString()

  const bg = isDark ? '$gray1' : '$gray2'
  const sidebarBg = isDark ? '$gray2' : '$white'
  const cardBg = isDark ? '$gray3' : '$white'
  const textColor = isDark ? '$white' : '$gray12'
  const mutedColor = isDark ? '$gray10' : '$gray10'

  const inputBg = isDark ? '$gray3' : '$white'
  const selectBg = isDark ? '#222' : '#fff'
  const selectBorder = isDark ? '#444' : '#e5e5e5'
  const selectColor = isDark ? '#fff' : '#000'

  return (
    <XStack flex={1} height="100vh" backgroundColor={bg}>
      <View
        width={220}
        minWidth={220}
        backgroundColor={sidebarBg}
        borderRightWidth={1}
        borderRightColor="$gray4"
        padding="$4"
      >
        <YStack flex={1} gap="$6">
          <Text fontSize="$7" fontWeight="bold" color={textColor}>
            Budget
          </Text>
          <YStack gap="$2">
            {(['dashboard', 'transactions', 'accounts'] as const).map((tab) => (
              <Button
                key={tab}
                backgroundColor={
                  activeTab === tab
                    ? isDark
                      ? '$gray5'
                      : '$gray12'
                    : 'transparent'
                }
                justifyContent="flex-start"
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  color={
                    activeTab === tab
                      ? isDark
                        ? '$white'
                        : '$white'
                      : mutedColor
                  }
                  textTransform="capitalize"
                >
                  {tab}
                </Text>
              </Button>
            ))}
          </YStack>
          <View height={1} backgroundColor="$gray4" />
          <Card padding="$4" backgroundColor="$green10">
            <Text fontSize="$3" color="$white">
              Total Balance
            </Text>
            <Text fontSize="$6" fontWeight="bold" color="$white">
              ${totalBalance.toFixed(2)}
            </Text>
          </Card>
          <Button
            onPress={() => setIsDark(!isDark)}
            variant="outlined"
            size="$2"
          >
            <Text color={textColor}>{isDark ? '☀️ Light' : '🌙 Dark'}</Text>
          </Button>
        </YStack>
      </View>

      <View flex={1} padding="$6" overflow="scroll">
        <YStack gap="$6">
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontSize="$8"
              fontWeight="bold"
              color={textColor}
              textTransform="capitalize"
            >
              {activeTab}
            </Text>
            <XStack gap="$2">
              <Button onPress={() => setShowAddTransaction(true)}>
                + Transaction
              </Button>
              <Button
                variant="outlined"
                onPress={() => setShowAddAccount(true)}
              >
                + Account
              </Button>
            </XStack>
          </XStack>

          {activeTab === 'dashboard' && (
            <>
              <XStack gap="$4" flexWrap="wrap">
                {[
                  { label: 'Income', value: totalIncome, color: '$green10' },
                  { label: 'Expenses', value: totalExpenses, color: '$red10' },
                  {
                    label: 'Investments',
                    value: totalInvestments,
                    color: '$blue10',
                  },
                  {
                    label: 'Accounts',
                    value: accounts.length,
                    color: '$gray10',
                    isCount: true,
                  },
                ].map((stat) => (
                  <Card
                    key={stat.label}
                    padding="$4"
                    flex={1}
                    minWidth={180}
                    backgroundColor={cardBg}
                  >
                    <Text fontSize="$3" color={stat.color}>
                      {stat.label}
                    </Text>
                    <Text fontSize="$7" fontWeight="bold" color={textColor}>
                      {stat.isCount
                        ? stat.value
                        : (stat.value > 0 ? '+' : '') +
                          '$' +
                          stat.value.toFixed(2)}
                    </Text>
                  </Card>
                ))}
              </XStack>
              <Text fontSize="$5" fontWeight="600" color={mutedColor}>
                Recent Transactions
              </Text>
              <YStack gap="$2">
                {transactions.slice(0, 5).map((tx) => (
                  <Card key={tx._id} padding="$3" backgroundColor={cardBg}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <XStack gap="$3" alignItems="center">
                        <View
                          width={36}
                          height={36}
                          borderRadius={18}
                          backgroundColor={
                            tx.type === 'income'
                              ? isDark
                                ? '$green5'
                                : '$green4'
                              : tx.type === 'expense'
                                ? isDark
                                  ? '$red5'
                                  : '$red4'
                                : tx.type === 'investment'
                                  ? isDark
                                    ? '$blue5'
                                    : '$blue4'
                                  : isDark
                                    ? '$orange5'
                                    : '$orange4'
                          }
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text
                            fontWeight="bold"
                            color={
                              tx.type === 'income'
                                ? '$green10'
                                : tx.type === 'expense'
                                  ? '$red10'
                                  : tx.type === 'investment'
                                    ? '$blue10'
                                    : '$orange10'
                            }
                          >
                            {tx.type === 'income'
                              ? '+'
                              : tx.type === 'expense'
                                ? '−'
                                : tx.type === 'investment'
                                  ? '◈'
                                  : '→'}
                          </Text>
                        </View>
                        <View>
                          <Text color={textColor}>{tx.description}</Text>
                          <Text fontSize="$2" color={mutedColor}>
                            {tx.type}
                            {tx.category && ` • ${tx.category}`}
                          </Text>
                        </View>
                      </XStack>
                      <Text
                        fontSize="$5"
                        fontWeight="600"
                        color={tx.type === 'income' ? '$green10' : '$red10'}
                      >
                        {tx.type === 'income' ? '+' : '−'}$
                        {tx.amount.toFixed(2)}
                      </Text>
                    </XStack>
                  </Card>
                ))}
                {transactions.length === 0 && (
                  <Card
                    padding="$6"
                    backgroundColor={cardBg}
                    alignItems="center"
                  >
                    <Text color={mutedColor}>No transactions yet</Text>
                  </Card>
                )}
              </YStack>
            </>
          )}

          {activeTab === 'transactions' && (
            <YStack gap="$2">
              {transactions.map((tx) => (
                <Card key={tx._id} padding="$3" backgroundColor={cardBg}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack gap="$3" alignItems="center">
                      <View
                        width={36}
                        height={36}
                        borderRadius={18}
                        backgroundColor={
                          tx.type === 'income'
                            ? isDark
                              ? '$green5'
                              : '$green4'
                            : tx.type === 'expense'
                              ? isDark
                                ? '$red5'
                                : '$red4'
                              : tx.type === 'investment'
                                ? isDark
                                  ? '$blue5'
                                  : '$blue4'
                                : isDark
                                  ? '$orange5'
                                  : '$orange4'
                        }
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text
                          fontWeight="bold"
                          color={
                            tx.type === 'income'
                              ? '$green10'
                              : tx.type === 'expense'
                                ? '$red10'
                                : tx.type === 'investment'
                                  ? '$blue10'
                                  : '$orange10'
                          }
                        >
                          {tx.type === 'income'
                            ? '+'
                            : tx.type === 'expense'
                              ? '−'
                              : tx.type === 'investment'
                                ? '◈'
                                : '→'}
                        </Text>
                      </View>
                      <View>
                        <Text color={textColor}>{tx.description}</Text>
                        <Text fontSize="$2" color={mutedColor}>
                          {tx.type}
                          {tx.category && ` • ${tx.category}`}
                        </Text>
                        <Text fontSize="$2" color={mutedColor}>
                          {formatDate(tx.date)}
                        </Text>
                      </View>
                    </XStack>
                    <Text
                      fontSize="$5"
                      fontWeight="600"
                      color={tx.type === 'income' ? '$green10' : '$red10'}
                    >
                      {tx.type === 'income' ? '+' : '−'}${tx.amount.toFixed(2)}
                    </Text>
                  </XStack>
                </Card>
              ))}
              {transactions.length === 0 && (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor}>No transactions yet</Text>
                </Card>
              )}
            </YStack>
          )}

          {activeTab === 'accounts' && (
            <YStack gap="$2">
              {accounts.map((acc) => (
                <Card key={acc._id} padding="$3" backgroundColor={cardBg}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack gap="$3" alignItems="center">
                      <View
                        width={36}
                        height={36}
                        borderRadius={8}
                        backgroundColor={
                          acc.type === 'checking'
                            ? isDark
                              ? '$blue5'
                              : '$blue4'
                            : acc.type === 'savings'
                              ? isDark
                                ? '$green5'
                                : '$green4'
                              : acc.type === 'investment'
                                ? isDark
                                  ? '$purple5'
                                  : '$purple4'
                                : isDark
                                  ? '$orange5'
                                  : '$orange4'
                        }
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text>
                          {acc.type === 'checking'
                            ? '🏦'
                            : acc.type === 'savings'
                              ? '💰'
                              : acc.type === 'investment'
                                ? '📈'
                                : '💳'}
                        </Text>
                      </View>
                      <View>
                        <Text color={textColor}>{acc.name}</Text>
                        <Text
                          fontSize="$2"
                          color={mutedColor}
                          textTransform="capitalize"
                        >
                          {acc.type}
                        </Text>
                      </View>
                    </XStack>
                    <Text
                      fontSize="$5"
                      fontWeight="600"
                      color={acc.balance >= 0 ? '$green10' : '$red10'}
                    >
                      ${acc.balance.toFixed(2)}
                    </Text>
                  </XStack>
                </Card>
              ))}
              {accounts.length === 0 && (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor}>No accounts yet</Text>
                </Card>
              )}
            </YStack>
          )}
        </YStack>
      </View>

      <Modal
        open={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        title="Add Transaction"
        isDark={isDark}
      >
        <YStack gap="$3">
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Type
            </Text>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${selectBorder}`,
                backgroundColor: selectBg,
                color: selectColor,
                marginTop: '4px',
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
              <option value="investment">Investment</option>
            </select>
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Amount
            </Text>
            <Input
              value={txAmount}
              onChangeText={setTxAmount}
              placeholder="0.00"
              keyboardType="numeric"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Description
            </Text>
            <Input
              value={txDescription}
              onChangeText={setTxDescription}
              placeholder="Description"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Category
            </Text>
            <Input
              value={txCategory}
              onChangeText={setTxCategory}
              placeholder="Category"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          {(txType === 'expense' ||
            txType === 'transfer' ||
            txType === 'investment') && (
            <View>
              <Text fontSize="$3" color={mutedColor}>
                From Account
              </Text>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${selectBorder}`,
                  backgroundColor: selectBg,
                  color: selectColor,
                  marginTop: '4px',
                }}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </View>
          )}
          {(txType === 'income' || txType === 'transfer') && (
            <View>
              <Text fontSize="$3" color={mutedColor}>
                To Account
              </Text>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${selectBorder}`,
                  backgroundColor: selectBg,
                  color: selectColor,
                  marginTop: '4px',
                }}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </View>
          )}
          <XStack gap="$2" justifyContent="flex-end" marginTop="$2">
            <Button onPress={() => setShowAddTransaction(false)}>Cancel</Button>
            <Button backgroundColor="$gray12" onPress={handleAddTransaction}>
              <Text color="$white">Add</Text>
            </Button>
          </XStack>
        </YStack>
      </Modal>

      <Modal
        open={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="Add Account"
        isDark={isDark}
      >
        <YStack gap="$3">
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Name
            </Text>
            <Input
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Account name"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Initial Balance
            </Text>
            <Input
              value={accountBalance}
              onChangeText={setAccountBalance}
              placeholder="0.00"
              keyboardType="numeric"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Type
            </Text>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${selectBorder}`,
                backgroundColor: selectBg,
                color: selectColor,
                marginTop: '4px',
              }}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="credit">Credit</option>
            </select>
          </View>
          <XStack gap="$2" justifyContent="flex-end" marginTop="$2">
            <Button onPress={() => setShowAddAccount(false)}>Cancel</Button>
            <Button backgroundColor="$gray12" onPress={handleCreateAccount}>
              <Text color="$white">Create</Text>
            </Button>
          </XStack>
        </YStack>
      </Modal>
    </XStack>
  )
}
