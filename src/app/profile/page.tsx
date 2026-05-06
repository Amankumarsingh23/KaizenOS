import { redirect } from "next/navigation";

// Legacy /profile route — redirect to /settings
export default function ProfilePage() {
  redirect("/settings");
}
