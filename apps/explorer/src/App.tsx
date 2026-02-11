import { EnterIcon, ExitIcon, HamburgerMenuIcon, PlusIcon, TimerIcon } from '@radix-ui/react-icons'
import * as Toast from '@radix-ui/react-toast'
import { Box, Button, Callout, Container, Dialog, Flex, Link, Text } from '@radix-ui/themes'
import { useConnector } from '@solana/connector'
import React from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Sidebar } from './Sidebar'
import { StatusResponse, useApi } from './api'
import NavigationMenu from './components/NavigationMenu'
import { useMediaQuery, useToastStore } from './hooks'

function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K,
) {
  return React.lazy(async () => ({
    default: (await loader())[key] as React.ComponentType<any>,
  }))
}

const Dashboard = React.lazy(() => import('./views/Dashboard/Dashboard'))
const PoolListView = lazyNamed(() => import('./views/Dashboard/PoolList'), 'PoolList')
const TopPlatformsView = lazyNamed(() => import('./views/Dashboard/TopPlatforms'), 'TopPlatforms')
const PlatformView = lazyNamed(() => import('./views/Platform/PlatformView'), 'PlatformView')
const PlayerView = lazyNamed(() => import('./views/Player/PlayerView'), 'PlayerView')
const PlayersView = lazyNamed(() => import('./views/PlayersView'), 'PlayersView')
const CreatePoolView = React.lazy(() => import('./views/CreatePool/CreatePoolView'))
const PoolView = React.lazy(() => import('./views/Pool/PoolView'))
const TransactionView = React.lazy(() => import('./views/Transaction/Transaction'))
const EmbeddedTransactionView = React.lazy(() => import('./views/Transaction/EmbeddedTransaction'))
const PortfolioView = React.lazy(() => import('./views/Portfolio/PortfolioView'))
const DebugUserView = React.lazy(() => import('./views/Debug/DebugUser'))
const DaoView = React.lazy(() => import('./views/Debug/DaoView'))
const AllUsers = React.lazy(() => import('./views/Debug/AllUsers'))
const DebugView = React.lazy(() => import('./views/Debug/DebugView'))
const PoolDepositView = React.lazy(() => import('./views/Pool/PoolDepositView'))
const PoolConfigureView = React.lazy(() => import('./views/Pool/PoolConfigView'))

const Header = styled(Box)`
  background-color: var(--color-panel);
`

const Logo = styled(NavLink)`
  display: flex;
  justify-content: center;
  align-items: center;
  text-decoration: none;
  color: white;
  gap: 10px;
  & > img {
    height: 35px;
  }
`

function ConnectWalletDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { connectors, connectWallet, isConnecting } = useConnector()

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Connect Wallet</Dialog.Title>
        <Dialog.Description size="2">Choose a wallet connector.</Dialog.Description>
        <Flex direction="column" gap="2" mt="3">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              variant="soft"
              disabled={isConnecting || !connector.ready}
              onClick={async () => {
                await connectWallet(connector.id)
                props.onOpenChange(false)
              }}
            >
              {connector.name}
              {!connector.ready ? ' (Not installed)' : ''}
            </Button>
          ))}
          {connectors.length === 0 && <Text color="gray">No wallet connectors detected.</Text>}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function NotFound() {
  return (
    <Callout.Root color="orange">
      <Callout.Text>Page not found.</Callout.Text>
    </Callout.Root>
  )
}

function RouteFallback() {
  return (
    <Flex align="center" justify="center" py="7">
      <Text color="gray">Loading…</Text>
    </Flex>
  )
}

export function App() {
  const navigate = useNavigate()
  const toasts = useToastStore((state) => state.toasts)
  const { account, isConnected, isConnecting, disconnectWallet } = useConnector()
  const {
    data: status = { syncing: false },
    error: statusError,
  } = useApi<StatusResponse>('/status')
  const [sidebar, setSidebar] = React.useState(false)
  const [connectModalOpen, setConnectModalOpen] = React.useState(false)
  const md = useMediaQuery('md')

  const location = useLocation()
  const embedded = new URLSearchParams(location.search).has('embed') || location.pathname.startsWith('/embed/')

  return (
    <>
      <Sidebar open={sidebar} onClose={() => setSidebar(false)} onConnect={() => setConnectModalOpen(true)} />
      <ConnectWalletDialog open={connectModalOpen} onOpenChange={setConnectModalOpen} />

      {!embedded && (
        <Header p="2" px="4">
          <Container>
            <Flex gap="2" align="center" justify="between">
              <Flex gap="4" align="center">
                <Logo to="/">
                  <img alt="Logo" src="/logo.svg" />
                </Logo>
              </Flex>
              {!md && (
                <Button variant="surface" onClick={() => setSidebar(!sidebar)}>
                  <HamburgerMenuIcon />
                </Button>
              )}
              {md && (
                <>
                  <NavigationMenu />
                  <Flex gap="2" align="center" style={{ position: 'relative' }}>
                    <Button size="3" variant="soft" color="green" onClick={() => navigate('/create')}>
                      Create Pool <PlusIcon />
                    </Button>
                    {!isConnected ? (
                      <Button disabled={isConnecting} onClick={() => setConnectModalOpen(true)} size="3" variant="soft">
                        Connect <EnterIcon />
                      </Button>
                    ) : (
                      <Button color="gray" onClick={disconnectWallet} size="3" variant="soft">
                        {account?.substring(0, 6)}...
                        <ExitIcon />
                      </Button>
                    )}
                  </Flex>
                </>
              )}
            </Flex>
          </Container>
        </Header>
      )}

      <Container p="4">
        <Toast.Viewport className="ToastViewport" />

        {toasts.map((toast, index) => (
          <Toast.Root className="ToastRoot" key={index}>
            <Toast.Title className="ToastTitle">{toast.title}</Toast.Title>
            <Toast.Description asChild>
              <div className="ToastDescription">
                {toast.description}
                <br />
                {toast.link && (
                  <Link href={toast.link} target="_blank" rel="noreferrer noopener">
                    Link
                  </Link>
                )}
              </div>
            </Toast.Description>
            <Toast.Action className="ToastAction" asChild altText="Acknowledge">
              <Button variant="soft" size="1">
                Ok
              </Button>
            </Toast.Action>
          </Toast.Root>
        ))}

        {status.syncing && (
          <Callout.Root color="orange" mb="4">
            <Callout.Icon>
              <TimerIcon />
            </Callout.Icon>
            <Callout.Text>Sync in progress. Displayed data is incomplete until it finishes.</Callout.Text>
          </Callout.Root>
        )}

        {statusError && (
          <Callout.Root color="red" mb="4">
            <Callout.Text>api.gamba.so is unavailable. Falling back to RPC-only data where possible.</Callout.Text>
          </Callout.Root>
        )}

        <React.Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/debug" element={<DebugView />} />
            <Route path="/pools" element={<PoolListView />} />
            <Route path="/leaderboard" element={<PlayersView />} />
            <Route path="/platforms" element={<TopPlatformsView days={36500} limit={1000} />} />
            <Route path="/dao" element={<DaoView />} />
            <Route path="/platform/:address" element={<PlatformView />} />
            <Route path="/player/:address" element={<PlayerView />} />
            <Route path="/users" element={<AllUsers />} />
            <Route path="/portfolio" element={<PortfolioView />} />
            <Route path="/user" element={<DebugUserView />} />
            <Route path="/tx/:txid" element={<TransactionView />} />
            <Route path="/embed/tx/:txid" element={<EmbeddedTransactionView />} />
            <Route path="/create" element={<CreatePoolView />} />
            <Route path="/pool/:poolId" element={<PoolView />} />
            <Route path="/pool/:poolId/deposit" element={<PoolDepositView />} />
            <Route path="/pool/:poolId/configure" element={<PoolConfigureView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </Container>
    </>
  )
}
