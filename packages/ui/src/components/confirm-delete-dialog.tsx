'use client'

import { useTranslations } from 'next-intl'
import { Button } from './button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  description?: string
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, isPending, description }: ConfirmDeleteDialogProps) {
  const t = useTranslations('Common')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('delete.title')}</DialogTitle>
          <DialogDescription>
            {description ?? t('delete.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('delete.deleting') : t('delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
