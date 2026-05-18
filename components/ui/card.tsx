import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'group/card relative isolate flex flex-col gap-6 overflow-hidden border border-[#153e90]/35 bg-[#111827]/60 py-6 text-card-foreground shadow-[0_0_30px_rgba(21,62,144,0.10)] backdrop-blur-xl transition-all duration-500',
        'hover:border-[#153e90]/60 hover:shadow-[0_0_50px_rgba(21,62,144,0.22)]',
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-0 top-0 z-0 h-3 w-3 border-l-2 border-t-2 border-[#153e90]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />
      <span className="pointer-events-none absolute right-0 top-0 z-0 h-3 w-3 border-r-2 border-t-2 border-[#54e346]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-0 h-3 w-3 border-b-2 border-l-2 border-[#153e90]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-0 h-3 w-3 border-b-2 border-r-2 border-[#153e90]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />

      <span className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[#153e90]/10 via-transparent to-[#54e346]/10 opacity-40 transition-opacity duration-300 group-hover/card:opacity-80" />

      <span className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
        <span className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#153e90]/40 to-transparent" />
      </span>

      <div className="relative z-10 flex flex-col gap-6">{children}</div>
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}