"use client"

import { useMemo, useState, useTransition } from "react"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Button } from "@genealogiq/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@genealogiq/ui/dialog"
import { Label } from "@genealogiq/ui/label"
import { Textarea } from "@genealogiq/ui/textarea"
import { sendFeedback } from "@/actions/feedback.actions"
import { getFeedbackSchema, type FeedbackValues } from "@/schemas/feedback.schema"
import { cn } from "@/lib/utils"

interface Props {
  type: "bug" | "feedback"
  label: string
  className?: string
}

export function FeedbackDialog({ type, label, className }: Props) {
  const t = useTranslations("Feedback")
  const tErr = useTranslations("Errors")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FeedbackValues>({
    resolver: useMemo(() => zodResolver(getFeedbackSchema(tErr)), [tErr]),
    defaultValues: { type, message: "" },
  })

  const onSubmit = (data: FeedbackValues) => {
    startTransition(async () => {
      const result = await sendFeedback({ ...data, page: pathname })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(t(type === "bug" ? "toasts.bugSent" : "toasts.feedbackSent"))
      setOpen(false)
      reset({ type, message: "" })
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn("text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors cursor-pointer", className)}
        >
          {label}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(type === "bug" ? "dialog.bugTitle" : "dialog.feedbackTitle")}</DialogTitle>
          <DialogDescription>
            {t(type === "bug" ? "dialog.bugDescription" : "dialog.feedbackDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-message">{t("fields.message")}</Label>
            <Textarea
              id="feedback-message"
              maxLength={2000}
              rows={5}
              placeholder={t("fields.messagePlaceholder")}
              {...register("message")}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
