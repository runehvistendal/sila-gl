import { redirect } from "next/navigation"

export default function MineHytterPage() {
  redirect("/dashboard?tab=mine-opslag")
}
