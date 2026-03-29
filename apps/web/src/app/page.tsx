import { redirect } from "next/navigation";

export default function Home() {
  // In production, check auth and redirect accordingly
  // For demo, redirect to dashboard
  redirect("/dashboard");
}
