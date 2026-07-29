import { ParentPortalSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function ParentPhotosPage() {
  return <ParentPortalSurface audience="parent" />;
}

export const metadata = {
  title: "Photos"
};
