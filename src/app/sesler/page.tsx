import {redirect} from "next/navigation";
import {LEGACY_ROUTE_MAP} from "@/shared/config/legacy-routes";

export default function LegacyRoute() {
  redirect(LEGACY_ROUTE_MAP.sesler);
}
