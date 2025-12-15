'use client'

import { SocketProvider } from '@/components/SocketProvider'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SocketProvider>
            {children}
        </SocketProvider>
    )
}
