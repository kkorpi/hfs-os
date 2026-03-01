import { auth } from "@/lib/auth";
import HoldFastApp from "@/components/HoldFastApp";

export default async function Home() {
  const session = await auth();
  return <HoldFastApp session={session} />;
}
