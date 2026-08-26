"use client";

import Modal from "./modal";
import Button from "./button";

interface ConfirmationDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  onConfirm,
  title,
  message,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmationDialogProps) {
  const visible = isOpen ?? open ?? false;
  const handleClose = onClose ?? (() => onOpenChange?.(false));

  return (
    <Modal isOpen={visible} onClose={handleClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{description || message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export { ConfirmationDialog };
