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

const CONNECTOR_PAGE_SIZE = 6

const ConnectModalTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  line-height: 1.1;
`

const ConnectModalSubtitle = styled.p`
  margin: 6px 0 16px;
  color: var(--gray-10);
  font-size: 13px;
`

const ConnectorsList = styled.div`
  display: grid;
  gap: 10px;
`

const ConnectorButton = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--gray-3);
  border: 1px solid var(--gray-6);
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: var(--gray-8);
    background: var(--gray-4);
  }

  &:disabled {
    cursor: default;
    opacity: 0.62;
  }
`

const ConnectorIdentity = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 11px;
  font-weight: 500;
`

const ConnectorIcon = styled.span`
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--gray-5);

  img {
    width: 20px;
    height: 20px;
    border-radius: 999px;
  }
`

const ConnectorStatus = styled.span`
  font-size: 11px;
  line-height: 1;
  color: var(--gray-11);
  border: 1px solid var(--gray-6);
  border-radius: 999px;
  padding: 5px 8px;
`

const ConnectModalFooter = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: center;
`

const LoadMoreConnectors = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  color: var(--gray-11);
  font-size: 12px;
  line-height: 1;
  border: 1px solid var(--gray-7);
  border-radius: 999px;
  padding: 8px 12px;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: var(--gray-9);
    background: var(--gray-3);
  }
`

function ConnectWalletDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { connectors, connectWallet, isConnecting } = useConnector()
  const [visibleCount, setVisibleCount] = React.useState(CONNECTOR_PAGE_SIZE)

  const sortedConnectors = React.useMemo(
    () =>
      [...connectors].sort((a, b) => {
        if (a.ready !== b.ready) return Number(b.ready) - Number(a.ready)
        return a.name.localeCompare(b.name)
      }),
    [connectors],
  )

  const visibleConnectors = React.useMemo(
    () => sortedConnectors.slice(0, visibleCount),
    [sortedConnectors, visibleCount],
  )

  React.useEffect(() => {
    if (!props.open) return
    setVisibleCount(CONNECTOR_PAGE_SIZE)
  }, [props.open])

  const hasMore = sortedConnectors.length > visibleCount

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Content maxWidth="420px">
        <ConnectModalTitle>Connect Wallet</ConnectModalTitle>
        <ConnectModalSubtitle>Select a wallet to continue.</ConnectModalSubtitle>

        {sortedConnectors.length === 0 ? (
          <Text color="gray">No wallet connectors detected.</Text>
        ) : (
          <>
            <ConnectorsList>
              {visibleConnectors.map((connector) => (
                <ConnectorButton
                  key={connector.id}
                  disabled={isConnecting || !connector.ready}
                  onClick={async () => {
                    await connectWallet(connector.id)
                    props.onOpenChange(false)
                  }}
                >
                  <ConnectorIdentity>
                    <ConnectorIcon>{connector.icon && <img src={connector.icon} alt={connector.name} />}</ConnectorIcon>
                    <span>{connector.name}</span>
                  </ConnectorIdentity>
                  <ConnectorStatus>{isConnecting ? 'Connecting...' : connector.ready ? 'Connect' : 'Not installed'}</ConnectorStatus>
                </ConnectorButton>
              ))}
            </ConnectorsList>

            {hasMore && (
              <ConnectModalFooter>
                <LoadMoreConnectors onClick={() => setVisibleCount((count) => count + CONNECTOR_PAGE_SIZE)}>
                  Load more wallets
                </LoadMoreConnectors>
              </ConnectModalFooter>
            )}
          </>
        )}
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
