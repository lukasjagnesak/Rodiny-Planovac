import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Hero, Sloupec, VyzvaPas } from "@/components/web/prvky";
import { ClanekTelo } from "@/components/web/clanek-telo";
import { dobaCteni } from "@/lib/clanky-typy";
import { najdi } from "@/lib/clanky";
import { formatDatum } from "@/lib/dates";
import { ZNACKA } from "@/lib/brand";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const clanek = najdi(slug);
  if (!clanek) return { title: "Článek nenalezen" };

  return {
    title: clanek.titul,
    description: clanek.perex,
    alternates: { canonical: `/clanky/${clanek.slug}` },
    openGraph: {
      title: `${clanek.titul} | ${ZNACKA}`,
      description: clanek.perex,
      type: "article",
      publishedTime: clanek.datum,
    },
  };
}

export default async function ClanekStranka({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clanek = najdi(slug);
  if (!clanek) notFound();

  return (
    <>
      <Hero
        nadtitulek={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <time dateTime={clanek.datum}>{formatDatum(clanek.datum)}</time>
            <span aria-hidden>·</span>
            <span>{dobaCteni(clanek)} min čtení</span>
          </span>
        }
        nadpis={clanek.titul}
        perex={clanek.perex}
      />

      <Sloupec>
        <ClanekTelo clanek={clanek} />

        <p className="mt-12">
          <Link
            href="/clanky"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Všechny články
          </Link>
        </p>
      </Sloupec>

      <VyzvaPas
        nadpis="Napsané jednou, vidí to oba"
        text="Kalendář péče, kroužky, odvozy i výdaje na jednom místě. 30 dní zdarma, bez zadání karty."
      />
    </>
  );
}
