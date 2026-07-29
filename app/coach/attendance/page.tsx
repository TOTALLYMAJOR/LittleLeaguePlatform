import { CoachAttendanceSurface } from "../_surfaces";

export const dynamic = "force-dynamic";

export default async function CoachAttendancePage() {
  return <CoachAttendanceSurface />;
}

export const metadata = {
  title: "Attendance"
};
