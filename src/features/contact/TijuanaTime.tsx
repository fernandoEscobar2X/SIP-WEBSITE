"use client";

import { useSyncExternalStore } from "react";

interface TijuanaTimeProps {
  readonly locale: string;
  readonly timeZone: string;
  /** Con `{time}`; se muestra solo si el visitante está en otra zona horaria. */
  readonly yourTime: string;
}

const MINUTE = 60_000;

function subscribe(onChange: () => void): () => void {
  // Se alinea al cambio de minuto para que el reloj no vaya atrasado.
  let interval = 0;
  const timeout = window.setTimeout(
    () => {
      onChange();
      interval = window.setInterval(onChange, MINUTE);
    },
    MINUTE - (Date.now() % MINUTE),
  );
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

const minuteNow = () => Math.floor(Date.now() / MINUTE);

/**
 * Hora en Tijuana (un dato real, no decoración) y, si es distinta, la del visitante.
 * En el HTML estático no hay hora (sería la del build): aparece al hidratar, sin mover el layout.
 */
export function TijuanaTime({ locale, timeZone, yourTime }: TijuanaTimeProps) {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => null);
  if (minute === null) return <span className="invisible">00:00</span>;

  const now = new Date(minute * MINUTE);
  const format = (zone?: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: zone }).format(now);
  const there = format(timeZone);
  const here = format();
  return (
    <span>
      <time dateTime={now.toISOString()}>{there}</time>
      {here === there ? null : (
        <span className="text-(--surface-muted)"> · {yourTime.replace("{time}", here)}</span>
      )}
    </span>
  );
}
