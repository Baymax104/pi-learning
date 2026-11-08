import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("input, textarea")?.focus();
    return () => dialog?.close();
  }, []);
  function dismiss() {
    ref.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭弹窗" onClick={dismiss}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
