import type { Metadata } from "next";
import { Sloupec } from "@/components/web/prvky";
import { DekujemePlanovac } from "./obsah";

export const metadata: Metadata = {
  title: "Plánovač je připravený",
  robots: { index: false, follow: false },
};

export default function Dekujeme() {
  return (
    <Sloupec>
      <DekujemePlanovac />
    </Sloupec>
  );
}
