"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FeedbackVariant = "success" | "error";

type FeedbackModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  variant?: FeedbackVariant;
};

const variantStyles: Record<FeedbackVariant, string> = {
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-rose-100 text-rose-700",
};

const variantIcons: Record<FeedbackVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
};

export function FeedbackModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  variant = "success",
}: FeedbackModalProps) {
  const Icon = variantIcons[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-[var(--dark-blue)]/15 bg-[var(--light-blue)] shadow-[0_24px_80px_rgba(95,123,147,0.25)]">
        <AlertDialogHeader className="items-center gap-3 text-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${variantStyles[variant]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-2xl font-black text-[var(--dark-blue)]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="max-w-sm text-sm leading-6 text-[#5F7B93]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction asChild>
            <Button className="h-10 rounded-full px-6 text-sm font-semibold">
              {actionLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}