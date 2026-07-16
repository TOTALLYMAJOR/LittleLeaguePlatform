import { ParentPortalSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function ParentFamilyAccessPage() {
  return <ParentPortalSurface audience="parent" />;
}
