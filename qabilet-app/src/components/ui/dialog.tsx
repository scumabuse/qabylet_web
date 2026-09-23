"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE } from "@/components/motion/primitives";
import { Button } from "./button";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title. Rendered in the header unless hideHeader is set. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Keep the title for screen readers but render a custom header in children. */
  hideHeader?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  className?: string;
  children?: React.ReactNode;
};

function Header({
  title,
  description,
  hideHeader,
  showClose,
  closeLabel,
}: Pick<BaseProps, "title" | "description" | "hideHeader" | "showClose" | "closeLabel">) {
  if (hideHeader) {
    return (
      <>
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {description && <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>}
      </>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0 space-y-0.5">
        <DialogPrimitive.Title className="text-base font-semibold tracking-[-0.01em] text-fg">{title}</DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="text-sm text-fg-muted">{description}</DialogPrimitive.Description>
        )}
      </div>
      {showClose && (
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label={closeLabel} className="-mr-1.5 -mt-1">
            <X size={16} />
          </Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

/** Centered modal on desktop, bottom sheet on small screens. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  showClose = true,
  closeLabel = "Закрыть",
  className,
  children,
}: BaseProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[80] bg-[var(--overlay)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>
            <div className="pointer-events-none fixed inset-0 z-[81] flex items-end justify-center sm:items-center sm:p-4">
              <DialogPrimitive.Content
                asChild
                forceMount
                {...(description ? {} : { "aria-describedby": undefined })}
              >
                <motion.div
                  className={cn(
                    "pointer-events-auto flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden border border-border bg-surface shadow-lg focus:outline-none",
                    "rounded-t-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-2xl",
                    className
                  )}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <Header
                    title={title}
                    description={description}
                    hideHeader={hideHeader}
                    showClose={showClose}
                    closeLabel={closeLabel}
                  />
                  <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/** Side panel anchored to the right edge. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  showClose = true,
  closeLabel = "Закрыть",
  className,
  children,
  footer,
}: BaseProps & { footer?: React.ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[70] bg-[var(--overlay)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              forceMount
              {...(description ? {} : { "aria-describedby": undefined })}
            >
              <motion.div
                className={cn(
                  "fixed inset-y-0 right-0 z-[71] flex h-dvh w-full max-w-[400px] flex-col border-l border-border bg-surface shadow-lg focus:outline-none",
                  className
                )}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <Header
                  title={title}
                  description={description}
                  hideHeader={hideHeader}
                  showClose={showClose}
                  closeLabel={closeLabel}
                />
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && <div className="border-t border-border px-5 py-3.5">{footer}</div>}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
