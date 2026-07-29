import { AdminScheduleVenuesSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function AdminSafetyWeatherPage() {
  return <AdminScheduleVenuesSurface />;
}

export const metadata = {
  title: "Safety & Weather"
};
