import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface AvatarProps {
    name?: string | null
    email?: string
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Avatar({ name, email, className, size = 'md' }: AvatarProps) {
    const initials = (name || email || '?')
        .slice(0, 2)
        .toUpperCase()

    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-24 w-24 text-2xl',
    }

    return (
        <div
            className={cn(
                'relative flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600',
                sizeClasses[size],
                className
            )}
        >
            {initials}
        </div>
    )
}
