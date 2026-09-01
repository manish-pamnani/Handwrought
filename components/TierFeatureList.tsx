import { tierFeatures, type Tier } from "@/lib/constants";

// Shared by every card that shows a tier's features — checkout's TierCard,
// PlansPanel, and /pricing — so all three render the identical bullets from
// the identical source (lib/constants.ts's tierFeatures) instead of each
// page keeping its own copy that can quietly drift out of sync.
export default function TierFeatureList({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <ul className={className ?? "mt-4 flex flex-1 flex-col gap-2"}>
      {tierFeatures(tier).map((feature) => (
        <li key={feature} className="flex items-start gap-2 font-sans text-[12.5px] text-[var(--color-ink-muted)]">
          <svg
            viewBox="0 0 16 16"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5l3 3 6-7" />
          </svg>
          {feature}
        </li>
      ))}
    </ul>
  );
}
