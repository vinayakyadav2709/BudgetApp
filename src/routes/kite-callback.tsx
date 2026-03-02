import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect, useState } from 'react'
import { Text, View, TamaguiProvider } from '@tamagui/core'
import { Button } from '@tamagui/button'
import { Card } from '@tamagui/card'
import { YStack } from '@tamagui/stacks'
import tamaguiConfig from '../../tamagui.config'

export const Route = createFileRoute('/kite-callback')({
  component: KiteCallback,
})

function KiteCallback() {
  const router = useRouter()
  const exchangeToken = useAction(api.myFunctions.exchangeKiteToken)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestToken = params.get('request_token')
    const statusParam = params.get('status')

    if (statusParam === 'success' && requestToken) {
      exchangeToken({ requestToken })
        .then((result: { success: boolean; error?: string }) => {
          if (result.success) {
            setStatus('success')
            setTimeout(() => {
              router.navigate({ to: '/' })
            }, 2000)
          } else {
            setStatus('error')
            setErrorMessage(result.error || 'Failed to exchange token')
          }
        })
        .catch((err: Error) => {
          setStatus('error')
          setErrorMessage(String(err))
        })
    } else if (statusParam === 'error') {
      setStatus('error')
      setErrorMessage('Kite login was cancelled or failed')
    }
  }, [exchangeToken, router])

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <View
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$gray2"
        padding="$6"
      >
        <Card padding="$8" backgroundColor="$white" maxWidth={400}>
          <YStack gap="$4" alignItems="center">
            {status === 'loading' && (
              <Text color="$gray12" fontSize="$5">
                Connecting to Kite...
              </Text>
            )}
            {status === 'success' && (
              <>
                <Text color="$green10" fontSize="$7">
                  ✓
                </Text>
                <Text color="$gray12" fontSize="$5">
                  Successfully connected to Kite!
                </Text>
                <Text color="$gray10" fontSize="$3">
                  Redirecting to dashboard...
                </Text>
              </>
            )}
            {status === 'error' && (
              <>
                <Text color="$red10" fontSize="$7">
                  ✗
                </Text>
                <Text color="$gray12" fontSize="$5">
                  Connection Failed
                </Text>
                <Text color="$gray10" fontSize="$3" textAlign="center">
                  {errorMessage}
                </Text>
                <Button onPress={() => router.navigate({ to: '/' })}>
                  Go Back
                </Button>
              </>
            )}
          </YStack>
        </Card>
      </View>
    </TamaguiProvider>
  )
}
