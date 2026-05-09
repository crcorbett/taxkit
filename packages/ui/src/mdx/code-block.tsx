"use client";

import { IconCheck, IconCopy } from "@tabler/icons-react";
import {
  type ComponentProps,
  createContext,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type CodeBlockContextValue = {
  /**
   * Ref to the scrollable region that wraps the actual `<pre>`. The CopyButton
   * reads `pre.textContent` from this subtree at click time. Avoids
   * prop-drilling the raw string.
   */
  bodyRef: RefObject<HTMLDivElement | null>;
};

const CodeBlockContext = createContext<CodeBlockContextValue | null>(null);

function useCodeBlock(component: string): CodeBlockContextValue {
  const ctx = use(CodeBlockContext);
  if (!ctx) {
    throw new Error(
      `<CodeBlock.${component}> must be used inside <CodeBlock.Root>`
    );
  }
  return ctx;
}

function Root({ className, children, ...props }: ComponentProps<"figure">) {
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <CodeBlockContext value={{ bodyRef }}>
      <figure
        data-slot="code-block"
        className={cn(
          "not-prose group relative my-5 overflow-hidden border border-border-strong bg-bg-sunken",
          className
        )}
        {...props}
      >
        {children}
      </figure>
    </CodeBlockContext>
  );
}

function Header({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex h-9 items-center justify-between gap-2 border-b border-border-strong px-3 font-mono text-fg-muted text-xs",
        className
      )}
      {...props}
    />
  );
}

function Title({ className, ...props }: ComponentProps<"figcaption">) {
  return (
    <figcaption
      data-slot="code-block-title"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 truncate",
        className
      )}
      {...props}
    />
  );
}

function Actions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn("-mr-1 flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

type CopyButtonProps = ComponentProps<"button"> & {
  /** ms before the copied state resets back to idle. */
  timeout?: number;
  /** Optional callbacks for instrumentation. */
  onCopy?: (code: string) => void;
  onCopyError?: (error: Error) => void;
};

function CopyButton({
  className,
  timeout = 2000,
  onCopy,
  onCopyError,
  ...props
}: CopyButtonProps) {
  const { bodyRef } = useCodeBlock("CopyButton");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending reset on unmount so we don't setState on a gone tree.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const handleClick = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      onCopyError?.(new Error("Clipboard API not available"));
      return;
    }
    const pre = bodyRef.current?.querySelector("pre");
    const code = pre?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), timeout);
    } catch (error) {
      onCopyError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [bodyRef, onCopy, onCopyError, timeout]);

  return (
    <button
      type="button"
      data-slot="code-block-copy-button"
      data-copied={copied || undefined}
      aria-label={copied ? "Copied to clipboard" : "Copy code"}
      onClick={handleClick}
      className={cn(
        "inline-flex size-6 items-center justify-center text-fg-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[copied]:text-ember-500 [&_svg]:size-3.5",
        className
      )}
      {...props}
    >
      {copied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
    </button>
  );
}

function Body({ className, children, ...props }: ComponentProps<"div">) {
  const { bodyRef } = useCodeBlock("Body");
  return (
    <div
      ref={bodyRef}
      data-slot="code-block-body"
      className={cn("overflow-x-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const CodeBlock = {
  Actions,
  Body,
  CopyButton,
  Header,
  Root,
  Title,
};

/**
 * MDX `pre` override. Reads optional `data-title` and `data-language`,
 * composes the compound `CodeBlock.*` parts, and slots the original
 * `<pre>` into the body.
 */
export function Pre({
  children,
  className,
  ...props
}: ComponentProps<"pre"> & {
  "data-title"?: string;
  "data-language"?: string;
}) {
  const title = props["data-title"];
  const language = props["data-language"];

  return (
    <CodeBlock.Root>
      <CodeBlock.Header>
        <CodeBlock.Title>
          {title ?? (language ? <span>{language}</span> : null)}
        </CodeBlock.Title>
        <CodeBlock.Actions>
          <CodeBlock.CopyButton />
        </CodeBlock.Actions>
      </CodeBlock.Header>
      <CodeBlock.Body>
        <pre className={className} {...props}>
          {children}
        </pre>
      </CodeBlock.Body>
    </CodeBlock.Root>
  );
}
