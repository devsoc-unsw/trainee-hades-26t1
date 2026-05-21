"use client";

import { Eye, EyeOff, Icon } from "lucide-react";

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
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

interface PasswordPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  onAction: () => void | Promise<void>;
}

export function PasswordPromptModal({
  open,
  onOpenChange,
  actionLabel,
  onAction
}: PasswordPromptModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-(--dark-blue)/15 bg-(--light-blue) shadow-[0_24px_80px_rgba(95,123,147,0.25)]">
        <DialogHeader className="items-center gap-3 text-center">
          <DialogTitle className="text-2xl font-black text-[var(--dark-blue)]">
            Private room
          </DialogTitle>
          <DialogDescription className="max-w-sm text-sm leading-6 text-[#5F7B93]">
            Enter the password to join this room.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={async () => {
          if (onAction) {
            await onAction();
          }
          onOpenChange(false);
        }}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password ?? ""}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              className="bg-(--dark-blue)/50 w-full px-4 py-2 pr-12 border border-(--dark-blue) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-600 hover:text-(--dark-blue)"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              className="h-10 rounded-full px-6 text-sm font-semibold text-[var(--dark-blue)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="h-10 rounded-full px-6 text-sm font-semibold"
              type="submit"
            >
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}