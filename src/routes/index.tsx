import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@tamagui/button'
import { Card } from '@tamagui/card'
import { Input } from '@tamagui/input'
import { Text, View } from '@tamagui/core'
import { YStack, XStack } from '@tamagui/stacks'
import { TamaguiProvider } from '@tamagui/core'
import tamaguiConfig from '../../tamagui.config'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: BudgetApp,
})

function BudgetApp() {
  const [isDark, setIsDark] = useState(false)
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

  const kiteSettings = useQuery(api.myFunctions.getKiteSettings)
  const kiteLoginUrl = useQuery(api.myFunctions.getKiteLoginUrl)
  const fetchHoldings = useAction(api.myFunctions.fetchHoldings)
  const fetchPositions = useAction(api.myFunctions.fetchPositions)
  const saveKiteSettings = useMutation(api.myFunctions.saveKiteSettings)
  const disconnectKite = useMutation(api.myFunctions.disconnectKite)

  const kotakSettings = useQuery(api.myFunctions.getKotakSettings)
  const saveKotakSettings = useMutation(api.myFunctions.saveKotakSettings)
  const disconnectKotak = useMutation(api.myFunctions.disconnectKotak)
  const kotakConnect = useAction(api.myFunctions.kotakConnect)
  const kotakFetchHoldings = useAction(api.myFunctions.kotakFetchHoldings)
  const kotakFetchPositions = useAction(api.myFunctions.kotakFetchPositions)

  const [kiteHoldings, setKiteHoldings] = useState<{
    holdings: Array<any>
    error?: string
  } | null>(null)
  const [kitePositions, setKitePositions] = useState<{
    positions: { net: Array<any>; day: Array<any> }
    error?: string
  } | null>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)

  const [kotakHoldings, setKotakHoldings] = useState<Array<any>>([])
  const [kotakPositions, setKotakPositions] = useState<Array<any>>([])
  const [kotakPortfolioLoading, setKotakPortfolioLoading] = useState(false)
  const [kotakPortfolioError, setKotakPortfolioError] = useState('')

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'transactions' | 'accounts' | 'portfolio'
  >('dashboard')
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showKiteConnect, setShowKiteConnect] = useState(false)
  const [showKotakConnect, setShowKotakConnect] = useState(false)

  const [accountName, setAccountName] = useState('')
  const [accountBalance, setAccountBalance] = useState('')
  const [accountType, setAccountType] = useState('checking')

  const [txType, setTxType] = useState('expense')
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txCategory, setTxCategory] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')

  const [kiteApiKey, setKiteApiKey] = useState('')
  const [kiteAccessToken, setKiteAccessToken] = useState('')

  // Kotak form state
  const [kotakConsumerKey, setKotakConsumerKey] = useState('')
  const [kotakConsumerSecret, setKotakConsumerSecret] = useState('')
  const [kotakMobile, setKotakMobile] = useState('')
  const [kotakUcc, setKotakUcc] = useState('')
  const [kotakMpin, setKotakMpin] = useState('')
  const [kotakTotp, setKotakTotp] = useState('')
  const [kotakConnecting, setKotakConnecting] = useState(false)
  const [kotakConnectError, setKotakConnectError] = useState('')

  useEffect(() => {
    if (activeTab === 'portfolio' && kiteSettings?.isConnected) {
      setPortfolioLoading(true)
      Promise.all([fetchHoldings({}), fetchPositions({})]).then(
        ([holdings, positions]) => {
          setKiteHoldings(holdings)
          setKitePositions(positions)
          setPortfolioLoading(false)
        },
      )
    }
  }, [activeTab, kiteSettings?.isConnected])

  useEffect(() => {
    if (activeTab === 'portfolio' && kotakSettings?.isConnected) {
      setKotakPortfolioLoading(true)
      setKotakPortfolioError('')
      console.log('[kotak] fetching portfolio...')
      Promise.all([kotakFetchHoldings({}), kotakFetchPositions({})]).then(
        ([h, p]) => {
          console.log('[kotak] holdings result:', JSON.stringify(h))
          console.log('[kotak] positions result:', JSON.stringify(p))
          if (h.error) setKotakPortfolioError(h.error)
          setKotakHoldings(h.holdings ?? [])
          setKotakPositions(p.positions ?? [])
          setKotakPortfolioLoading(false)
        },
      )
    }
  }, [activeTab, kotakSettings?.isConnected])

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

  const handleDisconnectKite = () => {
    console.log('Disconnecting Kite')
    disconnectKite()
    setShowKiteConnect(false)
  }

  const handleDisconnectKotak = () => {
    disconnectKotak()
    setShowKotakConnect(false)
    setKotakHoldings([])
    setKotakPositions([])
  }

  const handleKotakConnect = async () => {
    if (!kotakTotp) return
    console.log('[kotak] handleKotakConnect called, totp:', kotakTotp)
    setKotakConnecting(true)
    setKotakConnectError('')
    try {
      console.log('[kotak] calling kotakConnect action...')
      const result = await kotakConnect({ totp: kotakTotp })
      console.log('[kotak] result:', result)
      if (result.success) {
        setKotakTotp('')
        setShowKotakConnect(false)
        setKotakPortfolioLoading(true)
        Promise.all([kotakFetchHoldings({}), kotakFetchPositions({})]).then(
          ([h, p]) => {
            setKotakHoldings(h.holdings ?? [])
            setKotakPositions(p.positions ?? [])
            setKotakPortfolioLoading(false)
          },
        )
      } else {
        setKotakConnectError(result.error ?? 'Connection failed')
      }
    } catch (e: any) {
      // Log everything so we can see it in browser devtools
      console.error('[kotakConnect] raw error object:', e)
      console.error('[kotakConnect] error keys:', Object.keys(e ?? {}))
      console.error('[kotakConnect] JSON:', JSON.stringify(e, null, 2))
      const msg =
        e?.data?.message ||
        e?.data ||
        e?.message ||
        JSON.stringify(e) ||
        String(e)
      setKotakConnectError(String(msg))
    }
    setKotakConnecting(false)
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

  const bg = isDark ? '$gray1' : '$gray2'
  const sidebarBg = isDark ? '$gray2' : '$white'
  const cardBg = isDark ? '$gray3' : '$white'
  const textColor = isDark ? '$white' : '$gray12'
  const mutedColor = '$gray10'
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
            {(
              ['dashboard', 'transactions', 'accounts', 'portfolio'] as const
            ).map((tab) => (
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
                  color={activeTab === tab ? '$white' : mutedColor}
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
            <Text color={textColor}>{isDark ? 'Light' : 'Dark'}</Text>
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
                <Card
                  padding="$4"
                  flex={1}
                  minWidth={180}
                  backgroundColor={cardBg}
                >
                  <Text fontSize="$3" color="$green10">
                    Income
                  </Text>
                  <Text fontSize="$7" fontWeight="bold" color={textColor}>
                    +${totalIncome.toFixed(2)}
                  </Text>
                </Card>
                <Card
                  padding="$4"
                  flex={1}
                  minWidth={180}
                  backgroundColor={cardBg}
                >
                  <Text fontSize="$3" color="$red10">
                    Expenses
                  </Text>
                  <Text fontSize="$7" fontWeight="bold" color={textColor}>
                    -${totalExpenses.toFixed(2)}
                  </Text>
                </Card>
                <Card
                  padding="$4"
                  flex={1}
                  minWidth={180}
                  backgroundColor={cardBg}
                >
                  <Text fontSize="$3" color="$blue10">
                    Investments
                  </Text>
                  <Text fontSize="$7" fontWeight="bold" color={textColor}>
                    -${totalInvestments.toFixed(2)}
                  </Text>
                </Card>
                <Card
                  padding="$4"
                  flex={1}
                  minWidth={180}
                  backgroundColor={cardBg}
                >
                  <Text fontSize="$3" color={mutedColor}>
                    Accounts
                  </Text>
                  <Text fontSize="$7" fontWeight="bold" color={textColor}>
                    {accounts.length}
                  </Text>
                </Card>
              </XStack>
              <Text fontSize="$5" fontWeight="600" color={mutedColor}>
                Recent Transactions
              </Text>
              <TransactionList
                transactions={transactions.slice(0, 5)}
                isDark={isDark}
                textColor={textColor}
                mutedColor={mutedColor}
                cardBg={cardBg}
              />
            </>
          )}

          {activeTab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              isDark={isDark}
              textColor={textColor}
              mutedColor={mutedColor}
              cardBg={cardBg}
              showDate
            />
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

          {activeTab === 'portfolio' && (
            <YStack gap="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" color={mutedColor}>
                  Kite Portfolio
                </Text>
                <Button onPress={() => setShowKiteConnect(true)}>
                  {kiteSettings?.isConnected
                    ? '⚙️ Settings'
                    : '🔗 Connect Kite'}
                </Button>
              </XStack>
              {!kiteSettings?.isConnected ? (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor} marginBottom="$4">
                    Connect your Kite account to view your portfolio
                  </Text>
                  <Button onPress={() => setShowKiteConnect(true)}>
                    Connect Kite
                  </Button>
                </Card>
              ) : portfolioLoading ? (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor}>Loading portfolio...</Text>
                </Card>
              ) : (
                <>
                  {kiteHoldings &&
                    kiteHoldings.holdings &&
                    kiteHoldings.holdings.length > 0 && (
                      <>
                        <Text fontSize="$5" fontWeight="600" color={mutedColor}>
                          Holdings (Delivery)
                        </Text>
                        <YStack gap="$2">
                          {kiteHoldings.holdings.map((holding, idx) => (
                            <Card
                              key={idx}
                              padding="$3"
                              backgroundColor={cardBg}
                            >
                              <XStack
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <XStack gap="$3" alignItems="center">
                                  <View
                                    width={36}
                                    height={36}
                                    borderRadius={8}
                                    backgroundColor={
                                      isDark ? '$blue5' : '$blue4'
                                    }
                                    justifyContent="center"
                                    alignItems="center"
                                  >
                                    <Text>📈</Text>
                                  </View>
                                  <View>
                                    <Text color={textColor} fontWeight="600">
                                      {holding.tradingsymbol}
                                    </Text>
                                    <Text fontSize="$2" color={mutedColor}>
                                      {holding.exchange} • Qty:{' '}
                                      {holding.quantity}
                                    </Text>
                                  </View>
                                </XStack>
                                <View alignItems="flex-end">
                                  <Text color={textColor}>
                                    ₹
                                    {(
                                      holding.last_price * holding.quantity
                                    ).toFixed(2)}
                                  </Text>
                                  <Text
                                    fontSize="$2"
                                    color={
                                      holding.pnl >= 0 ? '$green10' : '$red10'
                                    }
                                  >
                                    {holding.pnl >= 0 ? '+' : ''}₹
                                    {holding.pnl.toFixed(2)}
                                  </Text>
                                </View>
                              </XStack>
                            </Card>
                          ))}
                        </YStack>
                      </>
                    )}
                  {kitePositions &&
                    kitePositions.positions &&
                    (kitePositions.positions.net.length > 0 ||
                      kitePositions.positions.day.length > 0) && (
                      <>
                        <Text fontSize="$5" fontWeight="600" color={mutedColor}>
                          Positions
                        </Text>
                        <YStack gap="$2">
                          {[
                            ...kitePositions.positions.net,
                            ...kitePositions.positions.day,
                          ]
                            .filter((p) => p.quantity !== 0)
                            .map((position, idx) => (
                              <Card
                                key={idx}
                                padding="$3"
                                backgroundColor={cardBg}
                              >
                                <XStack
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <XStack gap="$3" alignItems="center">
                                    <View
                                      width={36}
                                      height={36}
                                      borderRadius={8}
                                      backgroundColor={
                                        isDark ? '$purple5' : '$purple4'
                                      }
                                      justifyContent="center"
                                      alignItems="center"
                                    >
                                      <Text>📊</Text>
                                    </View>
                                    <View>
                                      <Text color={textColor} fontWeight="600">
                                        {position.tradingsymbol}
                                      </Text>
                                      <Text fontSize="$2" color={mutedColor}>
                                        {position.exchange} • {position.product}{' '}
                                        • Qty: {position.quantity}
                                      </Text>
                                    </View>
                                  </XStack>
                                  <View alignItems="flex-end">
                                    <Text color={textColor}>
                                      ₹{Math.abs(position.value).toFixed(2)}
                                    </Text>
                                    <Text
                                      fontSize="$2"
                                      color={
                                        position.pnl >= 0
                                          ? '$green10'
                                          : '$red10'
                                      }
                                    >
                                      {position.pnl >= 0 ? '+' : ''}₹
                                      {position.pnl.toFixed(2)}
                                    </Text>
                                  </View>
                                </XStack>
                              </Card>
                            ))}
                        </YStack>
                      </>
                    )}
                  {(!kiteHoldings ||
                    !kiteHoldings.holdings ||
                    kiteHoldings.holdings.length === 0) &&
                    (!kitePositions ||
                      !kitePositions.positions ||
                      (kitePositions.positions.net.length === 0 &&
                        kitePositions.positions.day.length === 0)) && (
                      <Card
                        padding="$6"
                        backgroundColor={cardBg}
                        alignItems="center"
                      >
                        <Text color={mutedColor}>
                          No holdings or positions found
                        </Text>
                      </Card>
                    )}
                </>
              )}
            </YStack>
          )}

          {activeTab === 'portfolio' && (
            <YStack gap="$4" marginTop="$6">
              {/* Kotak Neo section */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" color={mutedColor}>
                  Kotak Neo Portfolio
                </Text>
                <Button onPress={() => setShowKotakConnect(true)}>
                  {kotakSettings?.isConnected ? 'Settings' : 'Connect Kotak'}
                </Button>
              </XStack>

              {!kotakSettings ? (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor} marginBottom="$4">
                    Connect your Kotak Neo account to view your portfolio
                  </Text>
                  <Button onPress={() => setShowKotakConnect(true)}>
                    Connect Kotak
                  </Button>
                </Card>
              ) : !kotakSettings.isConnected ? (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor} marginBottom="$4">
                    Credentials saved. Enter TOTP to connect.
                  </Text>
                  <Button onPress={() => setShowKotakConnect(true)}>
                    Connect
                  </Button>
                </Card>
              ) : kotakPortfolioLoading ? (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color={mutedColor}>Loading Kotak portfolio...</Text>
                </Card>
              ) : kotakPortfolioError ? (
                <Card padding="$6" backgroundColor={cardBg} alignItems="center">
                  <Text color="$red10" marginBottom="$2">
                    Session expired or error
                  </Text>
                  <Text fontSize="$2" color={mutedColor} marginBottom="$4">
                    {kotakPortfolioError}
                  </Text>
                  <Button onPress={() => setShowKotakConnect(true)}>
                    Reconnect
                  </Button>
                </Card>
              ) : (
                <>
                  {kotakHoldings.length > 0 && (
                    <>
                      <Text fontSize="$5" fontWeight="600" color={mutedColor}>
                        Kotak Holdings
                      </Text>
                      <YStack gap="$2">
                        {kotakHoldings.map((h: any, idx: number) => {
                          // New API fields: quantity, averagePrice, closingPrice, unrealisedGainLoss, displaySymbol, exchangeSegment, mktValue
                          const qty = h.quantity ?? parseFloat(h.holdQty ?? '0')
                          const ltp = h.closingPrice ?? parseFloat(h.ltp ?? '0')
                          const pnl =
                            h.unrealisedGainLoss ??
                            (ltp -
                              (h.averagePrice ?? parseFloat(h.avgPrc ?? '0'))) *
                              qty
                          const symbol =
                            h.displaySymbol ??
                            h.instrumentName ??
                            h.trdSym ??
                            ''
                          const segment = h.exchangeSegment ?? h.exSeg ?? ''
                          const mktVal = h.mktValue ?? ltp * qty
                          return (
                            <Card
                              key={idx}
                              padding="$3"
                              backgroundColor={cardBg}
                            >
                              <XStack
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <XStack gap="$3" alignItems="center">
                                  <View
                                    width={36}
                                    height={36}
                                    borderRadius={8}
                                    backgroundColor={
                                      isDark ? '$blue5' : '$blue4'
                                    }
                                    justifyContent="center"
                                    alignItems="center"
                                  >
                                    <Text>📈</Text>
                                  </View>
                                  <View>
                                    <Text color={textColor} fontWeight="600">
                                      {symbol}
                                    </Text>
                                    <Text fontSize="$2" color={mutedColor}>
                                      {segment} • Qty: {qty}
                                    </Text>
                                  </View>
                                </XStack>
                                <View alignItems="flex-end">
                                  <Text color={textColor}>
                                    ₹{mktVal.toFixed(2)}
                                  </Text>
                                  <Text
                                    fontSize="$2"
                                    color={pnl >= 0 ? '$green10' : '$red10'}
                                  >
                                    {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                                  </Text>
                                </View>
                              </XStack>
                            </Card>
                          )
                        })}
                      </YStack>
                    </>
                  )}
                  {kotakPositions.filter(
                    (p: any) => parseInt(p.netQty ?? p.quantity ?? '0') !== 0,
                  ).length > 0 && (
                    <>
                      <Text fontSize="$5" fontWeight="600" color={mutedColor}>
                        Kotak Positions
                      </Text>
                      <YStack gap="$2">
                        {kotakPositions
                          .filter(
                            (p: any) =>
                              parseInt(p.netQty ?? p.quantity ?? '0') !== 0,
                          )
                          .map((p: any, idx: number) => {
                            const pnl = parseFloat(p.urlzPL ?? p.pnl ?? '0')
                            return (
                              <Card
                                key={idx}
                                padding="$3"
                                backgroundColor={cardBg}
                              >
                                <XStack
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <XStack gap="$3" alignItems="center">
                                    <View
                                      width={36}
                                      height={36}
                                      borderRadius={8}
                                      backgroundColor={
                                        isDark ? '$purple5' : '$purple4'
                                      }
                                      justifyContent="center"
                                      alignItems="center"
                                    >
                                      <Text>📊</Text>
                                    </View>
                                    <View>
                                      <Text color={textColor} fontWeight="600">
                                        {p.trdSym ?? p.tradingsymbol}
                                      </Text>
                                      <Text fontSize="$2" color={mutedColor}>
                                        {p.exSeg ?? p.exchange} • Qty:{' '}
                                        {p.netQty ?? p.quantity}
                                      </Text>
                                    </View>
                                  </XStack>
                                  <Text
                                    fontSize="$2"
                                    color={pnl >= 0 ? '$green10' : '$red10'}
                                  >
                                    {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                                  </Text>
                                </XStack>
                              </Card>
                            )
                          })}
                      </YStack>
                    </>
                  )}
                  {kotakHoldings.length === 0 &&
                    kotakPositions.filter(
                      (p: any) => parseInt(p.netQty ?? p.quantity ?? '0') !== 0,
                    ).length === 0 && (
                      <Card
                        padding="$6"
                        backgroundColor={cardBg}
                        alignItems="center"
                      >
                        <Text color={mutedColor}>
                          No Kotak holdings or positions found
                        </Text>
                      </Card>
                    )}
                </>
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

      <Modal
        open={showKiteConnect}
        onClose={() => setShowKiteConnect(false)}
        title="Connect Kite"
        isDark={isDark}
      >
        <YStack gap="$3">
          {/* Show saved credentials with connect button */}
          {kiteSettings?.apiKey && (
            <>
              <Text fontSize="$4" fontWeight="bold" color={mutedColor}>
                Saved Accounts
              </Text>
              <Card padding="$3" backgroundColor={isDark ? '$gray4' : '$gray2'}>
                <XStack justifyContent="space-between" alignItems="center">
                  <View>
                    <Text color={textColor} fontWeight="600">
                      {kiteSettings.apiKey.slice(0, 10)}...
                    </Text>
                    <Text fontSize="$2" color={mutedColor}>
                      {kiteSettings.isConnected
                        ? '✓ Connected'
                        : 'Not connected'}
                    </Text>
                  </View>
                  {!kiteSettings.isConnected ? (
                    <Button
                      backgroundColor="$blue10"
                      onPress={() => {
                        if (kiteLoginUrl) {
                          window.open(
                            kiteLoginUrl,
                            '_blank',
                            'width=600,height=700',
                          )
                        }
                      }}
                    >
                      <Text color="$white">Connect</Text>
                    </Button>
                  ) : (
                    <Button
                      backgroundColor="$red10"
                      onPress={() => {
                        handleDisconnectKite()
                      }}
                    >
                      <Text color="$white">Disconnect</Text>
                    </Button>
                  )}
                </XStack>
              </Card>
              <Text fontSize="$3" color={mutedColor} marginTop="$2">
                Or add new account:
              </Text>
            </>
          )}

          {/* Add new credentials form */}
          <View>
            <Text fontSize="$3" color={mutedColor}>
              API Key
            </Text>
            <Input
              value={kiteApiKey}
              onChangeText={setKiteApiKey}
              placeholder="Your Kite API Key (e.g., kiteprod_xxxxx)"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              API Secret
            </Text>
            <Input
              value={kiteAccessToken}
              onChangeText={setKiteAccessToken}
              placeholder="Your Kite API Secret"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
              secureTextEntry
            />
          </View>
          <Text fontSize="$2" color={mutedColor}>
            Get these from kite.trade/connect/apps
          </Text>
          <XStack gap="$2" justifyContent="flex-end" marginTop="$2">
            <Button onPress={() => setShowKiteConnect(false)}>Close</Button>
            <Button
              backgroundColor="$gray12"
              onPress={async () => {
                if (!kiteApiKey || !kiteAccessToken) {
                  return
                }
                await saveKiteSettings({
                  apiKey: kiteApiKey,
                  apiSecret: kiteAccessToken,
                })
                setKiteApiKey('')
                setKiteAccessToken('')
              }}
              disabled={!kiteApiKey || !kiteAccessToken}
            >
              <Text color="$white">Save New</Text>
            </Button>
          </XStack>
        </YStack>
      </Modal>

      {/* Kotak Neo Connect Modal */}
      <Modal
        open={showKotakConnect}
        onClose={() => {
          setShowKotakConnect(false)
          setKotakConnectError('')
        }}
        title="Connect Kotak Neo"
        isDark={isDark}
      >
        <YStack gap="$3">
          {/* Show connection status if already saved */}
          {kotakSettings?.consumerKey && (
            <>
              <Card padding="$3" backgroundColor={isDark ? '$gray4' : '$gray2'}>
                <XStack justifyContent="space-between" alignItems="center">
                  <View>
                    <Text color={textColor} fontWeight="600">
                      UCC: {kotakSettings.ucc}
                    </Text>
                    <Text fontSize="$2" color={mutedColor}>
                      {kotakSettings.isConnected
                        ? '✓ Connected'
                        : 'Saved - needs TOTP to connect'}
                    </Text>
                  </View>
                  <Button
                    backgroundColor="$red10"
                    onPress={handleDisconnectKotak}
                  >
                    <Text color="$white">Remove</Text>
                  </Button>
                </XStack>
              </Card>

              {/* TOTP connect section if creds saved but not connected */}
              <View>
                <Text fontSize="$3" color={mutedColor}>
                  TOTP (from authenticator app)
                </Text>
                <Input
                  value={kotakTotp}
                  onChangeText={setKotakTotp}
                  placeholder="6-digit TOTP"
                  keyboardType="numeric"
                  marginTop="$1"
                  backgroundColor={inputBg}
                  color={textColor}
                />
              </View>
              {kotakConnectError ? (
                <Text fontSize="$2" color="$red10">
                  {kotakConnectError}
                </Text>
              ) : null}
              <Button
                backgroundColor="$blue10"
                onPress={handleKotakConnect}
                disabled={!kotakTotp || kotakConnecting}
              >
                <Text color="$white">
                  {kotakConnecting ? 'Connecting...' : 'Connect'}
                </Text>
              </Button>

              <Text fontSize="$3" color={mutedColor} marginTop="$2">
                Or update credentials:
              </Text>
            </>
          )}

          {/* Save credentials form */}
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Consumer Key
            </Text>
            <Input
              value={kotakConsumerKey}
              onChangeText={setKotakConsumerKey}
              placeholder="From Kotak NEO app → Invest → Trade API"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Consumer Secret
            </Text>
            <Input
              value={kotakConsumerSecret}
              onChangeText={setKotakConsumerSecret}
              placeholder="Consumer Secret from Trade API card"
              secureTextEntry
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              Mobile Number (with country code)
            </Text>
            <Input
              value={kotakMobile}
              onChangeText={setKotakMobile}
              placeholder="+919876543210"
              keyboardType="numeric"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              UCC (Unique Client Code)
            </Text>
            <Input
              value={kotakUcc}
              onChangeText={setKotakUcc}
              placeholder="From Kotak profile section"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <View>
            <Text fontSize="$3" color={mutedColor}>
              MPIN
            </Text>
            <Input
              value={kotakMpin}
              onChangeText={setKotakMpin}
              placeholder="Your 6-digit MPIN"
              secureTextEntry
              keyboardType="numeric"
              marginTop="$1"
              backgroundColor={inputBg}
              color={textColor}
            />
          </View>
          <Text fontSize="$2" color={mutedColor}>
            Get Consumer Key & Secret from Kotak NEO app → Invest → Trade API
            card
          </Text>
          <XStack gap="$2" justifyContent="flex-end" marginTop="$2">
            <Button
              onPress={() => {
                setShowKotakConnect(false)
                setKotakConnectError('')
              }}
            >
              Cancel
            </Button>
            <Button
              backgroundColor="$gray12"
              onPress={async () => {
                if (
                  !kotakConsumerKey ||
                  !kotakConsumerSecret ||
                  !kotakMobile ||
                  !kotakUcc ||
                  !kotakMpin
                )
                  return
                await saveKotakSettings({
                  consumerKey: kotakConsumerKey,
                  consumerSecret: kotakConsumerSecret,
                  mobileNumber: kotakMobile,
                  ucc: kotakUcc,
                  mpin: kotakMpin,
                })
                setKotakConsumerKey('')
                setKotakConsumerSecret('')
                setKotakMobile('')
                setKotakUcc('')
                setKotakMpin('')
              }}
              disabled={
                !kotakConsumerKey || !kotakMobile || !kotakUcc || !kotakMpin
              }
            >
              <Text color="$white">Save Credentials</Text>
            </Button>
          </XStack>
        </YStack>
      </Modal>
    </XStack>
  )
}

function TransactionList({
  transactions,
  isDark,
  textColor,
  mutedColor,
  cardBg,
  showDate,
}: {
  transactions: Array<any>
  isDark: boolean
  textColor: string
  mutedColor: string
  cardBg: string
  showDate?: boolean
}) {
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString()
  const iconBg = (type: string) =>
    type === 'income'
      ? isDark
        ? '$green5'
        : '$green4'
      : type === 'expense'
        ? isDark
          ? '$red5'
          : '$red4'
        : type === 'investment'
          ? isDark
            ? '$blue5'
            : '$blue4'
          : isDark
            ? '$orange5'
            : '$orange4'
  const iconColor = (type: string) =>
    type === 'income'
      ? '$green10'
      : type === 'expense'
        ? '$red10'
        : type === 'investment'
          ? '$blue10'
          : '$orange10'
  const icon = (type: string) =>
    type === 'income'
      ? '+'
      : type === 'expense'
        ? '−'
        : type === 'investment'
          ? '◈'
          : '→'

  return (
    <YStack gap="$2">
      {transactions.map((tx) => (
        <Card key={tx._id} padding="$3" backgroundColor={cardBg}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$3" alignItems="center">
              <View
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor={iconBg(tx.type)}
                justifyContent="center"
                alignItems="center"
              >
                <Text fontWeight="bold" color={iconColor(tx.type)}>
                  {icon(tx.type)}
                </Text>
              </View>
              <View>
                <Text color={textColor}>{tx.description}</Text>
                <Text fontSize="$2" color={mutedColor}>
                  {tx.type}
                  {tx.category && ` • ${tx.category}`}
                </Text>
                {showDate && (
                  <Text fontSize="$2" color={mutedColor}>
                    {formatDate(tx.date)}
                  </Text>
                )}
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
  )
}
