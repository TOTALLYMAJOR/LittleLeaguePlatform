import Link from "next/link";
import {
  BookOpenCheck,
  CarFront,
  CircleHelp,
  CloudOff,
  Images,
  Settings,
  UserCog
} from "lucide-react";
import { ParentDashboardClient } from "@/components/feature-panels";
import {
  getParentMoreDestinations,
  type RouteTopologyEntry
} from "@/lib/navigation/route-topology";
import { requireParentPageAccess } from "@/lib/supabase/shell-access";

const destinationIcons: Record<string, typeof BookOpenCheck> = {
  "/parent/practice-recaps": BookOpenCheck,
  "/parent/photos": Images,
  "/parent/transportation": CarFront,
  "/parent/settings": Settings,
  "/account": UserCog,
  "/invite/recover": CircleHelp,
  "/offline": CloudOff
};

function getDestinationIcon(entry: RouteTopologyEntry) {
  return destinationIcons[entry.href] ?? CircleHelp;
}

export const dynamic = "force-dynamic";

export default async function ParentMorePage() {
  const pageAccess = await requireParentPageAccess();
  if (!pageAccess.ok) return <ParentDashboardClient dashboardData={pageAccess.dashboardData} />;
  const moreDestinations = getParentMoreDestinations(pageAccess.access);

  return (
    <div className="page family-more-page">
      <header className="family-more-heading">
        <h1>More family tools</h1>
        <p>Find less frequent family tasks without leaving the Family experience.</p>
      </header>

      <nav aria-label="More family tools">
        <ul className="family-more-list">
          {moreDestinations.map((destination) => {
            const Icon = getDestinationIcon(destination);
            return (
              <li key={destination.href}>
                <Link href={destination.href}>
                  <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
                  <span>
                    <strong>{destination.label}</strong>
                    <small>{destination.parentMoreDescription}</small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export const metadata = {
  title: "More Family Tools"
};
