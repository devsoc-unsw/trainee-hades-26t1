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

type FeedbackVariant = "success" | "error" | "warning";

type FeedbackModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  cancelLabel?: string;
  variant?: FeedbackVariant;
  onAction?: () => void | Promise<void>;
};

const variantStyles: Record<FeedbackVariant, string> = {
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
};

const variantIcons: Record<FeedbackVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
};

export function FeedbackModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel,
  variant = "success",
  onAction,
}: FeedbackModalProps) {
  const Icon = variantIcons[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-(--dark-blue)/15 bg-(--light-blue) shadow-[0_24px_80px_rgba(95,123,147,0.25)]">
        <AlertDialogHeader className="items-center gap-3 text-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${variantStyles[variant]}`}
          >
            <Icon className="h-6 w-6" />
          </div>

          <AlertDialogTitle className="text-2xl font-black text-(--dark-blue)">
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="max-w-sm text-sm leading-6 text-[#5F7B93]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center gap-3">
          {/* Cancel Button */}
          {cancelLabel && (
            <Button
              variant="outline"
              className="h-10 rounded-full px-6 text-sm font-semibold text-(--dark-blue)"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
          )}

          {/* Action Button */}
          <AlertDialogAction asChild>
            <Button
              className="h-10 rounded-full px-6 text-sm font-semibold bg-(--dark-blue) text-white hover:opacity-90"
              onClick={async () => {
                if (onAction) await onAction();
                onOpenChange(false);
              }}
            >
              {actionLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
