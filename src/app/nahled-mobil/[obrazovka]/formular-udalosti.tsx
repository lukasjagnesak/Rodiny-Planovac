"use client";

import { EventForm } from "@/components/events/event-form";
import type { SessionContext } from "@/lib/types";

/** Otevřený formulář nové události — jen pro ukázku a kontrolu rozvržení. */
export function UkazkaFormulareUdalosti({ session }: { session: SessionContext }) {
  return <EventForm open onClose={() => {}} session={session} event={null} />;
}
