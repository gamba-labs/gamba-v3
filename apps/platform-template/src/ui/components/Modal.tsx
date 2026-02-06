import React from 'react'
import styled from 'styled-components'
import { Icon } from './Icon'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  showClose?: boolean
}

const Backdrop = styled.div`
  @keyframes modal-appear {
    0% {
      opacity: 0;
    }

    100% {
      opacity: 1;
    }
  }

  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1100;
  overflow-y: auto;
  height: 100vh;
  animation: modal-appear 0.2s ease;
`

const Container = styled.div`
  display: flex;
  padding: 20px;
  min-height: calc(100vh - 4rem);
  align-items: center;
  justify-content: center;
`

const Sheet = styled.div`
  @keyframes modal-sheet-appear {
    0% {
      transform: scale(0.94);
    }

    100% {
      transform: scale(1);
    }
  }

  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  z-index: 1;
  width: min(100%, 460px);
  border-radius: 10px;
  background: #15151f;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 20px;
  animation: modal-sheet-appear 0.22s ease;
  color: #fff;
`

const CloseButton = styled.button`
  margin: 0;
  position: absolute;
  cursor: pointer;
  right: 10px;
  top: 10px;
  border: none;
  z-index: 2;
  opacity: 0.75;
  transition: opacity 0.2s, background 0.2s;
  background: transparent;
  border-radius: 999px;
  width: 2em;
  height: 2em;
  display: inline-grid;
  place-items: center;
  color: #fff;

  &:hover {
    opacity: 1;
    background: #ffffff22;
  }
`

export function Modal({ open, onClose, children, showClose = true }: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = oldOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <Backdrop onClick={onClose}>
      <Container>
        <Sheet onClick={(event) => event.stopPropagation()}>
          {showClose && (
            <CloseButton onClick={onClose} aria-label="Close dialog">
              <Icon.Close2 />
            </CloseButton>
          )}
          {children}
        </Sheet>
      </Container>
    </Backdrop>
  )
}
