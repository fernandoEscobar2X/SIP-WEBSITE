"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePageTransition } from "./TransitionProvider";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Enlace interno con transición de página. `onNavigate` solo se dispara en
 * navegación SPA: Ctrl/Cmd+clic, clic medio y enlaces externos se comportan
 * como un enlace normal.
 */
export function TransitionLink({ href, onNavigate, ...props }: Props) {
  const { navigate } = usePageTransition();
  return (
    <Link
      href={href}
      {...props}
      onNavigate={(event) => {
        onNavigate?.(event);
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
