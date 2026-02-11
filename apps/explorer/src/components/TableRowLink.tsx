import { Table } from "@radix-ui/themes"
import React from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import { openExternal } from "@/lib/openExternal"

interface Props extends React.ComponentProps<typeof Table.Row>, Omit<React.RefAttributes<HTMLTableRowElement>, "role"> {
  to: string
}

const StyledTableRow = styled(Table.Row)`
  cursor: pointer;
  &:hover {
    background: var(--accent-a1);
  }
`

export const TableRowNavLink = ({ to, children, ...rest }: Props) => {
  const navigate = useNavigate()
  const openLink = (newTab: boolean) => {
    if (newTab) {
      openExternal(to)
      return
    }
    navigate(to, {})
  }
  return (
    <StyledTableRow {...rest} onClick={e => openLink(e.ctrlKey || e.metaKey)}>
      {children}
    </StyledTableRow>
  )
}

interface Props2 extends React.ComponentProps<typeof Table.Row>, Omit<React.RefAttributes<HTMLTableRowElement>, "role"> {
  href: string
}

export const TableRowHref = ({ href, children, ...rest }: Props2) => {
  return (
    <StyledTableRow {...rest} onClick={() => openExternal(href)}>
      {children}
    </StyledTableRow>
  )
}
