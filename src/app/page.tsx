import { auth } from "@/lib/auth";
import HoldFastApp from "@/components/HoldFastApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  return <HoldFastApp session={session} />;
}
