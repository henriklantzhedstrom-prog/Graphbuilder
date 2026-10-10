import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { domToMarkup, markupToHtml } from "./richText";

export type TextStyle = "bold" | "italic";

/**
 * Gör den markerade texten i det fält som har fokus fet eller kursiv (eller tar bort stilen).
 * Används av knapparna B och I; fältet märker ändringen själv.
 */
export function toggleTextStyle(style: TextStyle): void {
  document.execCommand(style);
}

/** Om markeringen just nu är fet respektive kursiv, för att visa knapparna som intryckta. */
export function useTextStyleState(): Record<TextStyle, boolean> {
  const [state, setState] = useState({ bold: false, italic: false });
  useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && active.isContentEditable;
      const next = {
        bold: editing && document.queryCommandState("bold"),
        italic: editing && document.queryCommandState("italic"),
      };
      setState((prev) => (prev.bold === next.bold && prev.italic === next.italic ? prev : next));
    };
    // Stilen ändras både när markeringen flyttas och när B eller I används på samma markering.
    document.addEventListener("selectionchange", update);
    document.addEventListener("input", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("input", update);
    };
  }, []);
  return state;
}

/**
 * Textfält där delar av texten kan vara feta och kursiva och syns så medan man skriver. Värdet
 * är anteckningens sparade text (med märkena `**fet**` och `*kursiv*`); märkena visas aldrig.
 * Ctrl/Cmd+B och Ctrl/Cmd+I slår på och av stilen för markerad text.
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus = false,
  placeholder,
  className,
  style,
  id,
  testId,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string, next: EventTarget | null) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
  testId?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Det fältet senast lämnade ifrån sig; ett annat värde utifrån (ångra, annat fält) skrivs in.
  const emitted = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || emitted.current === value) return;
    el.innerHTML = markupToHtml(value);
    emitted.current = value;
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !autoFocus) return;
    el.focus();
    // Markera all text, som i ett vanligt fält som öppnas för redigering.
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [autoFocus]);

  const read = (): string => {
    const next = ref.current ? domToMarkup(ref.current) : value;
    emitted.current = next;
    return next;
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: ett textfält med fet och kursiv stil finns inte som eget element
    <div
      ref={ref}
      id={id}
      role="textbox"
      aria-multiline
      aria-label={ariaLabel}
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      data-testid={testId}
      data-placeholder={placeholder}
      className={`gb-rich-text ${className ?? ""}`}
      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", ...style }}
      onInput={() => onChange(read())}
      onBlur={(e) => onBlur?.(read(), e.relatedTarget)}
      onPaste={(e) => {
        // Klistra in som ren text, utan främmande typsnitt och färger.
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
      onKeyDown={(e) => {
        const key = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && (key === "b" || key === "i")) {
          e.preventDefault();
          toggleTextStyle(key === "b" ? "bold" : "italic");
          return;
        }
        if (e.key === "Enter" && e.shiftKey) {
          // Ny rad som ett radbrytningstecken, så att fältet inte delas upp i block.
          e.preventDefault();
          document.execCommand("insertText", false, "\n");
          return;
        }
        onKeyDown?.(e);
      }}
    />
  );
}
