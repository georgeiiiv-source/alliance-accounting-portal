import { LoginPage } from "@/components/auth/LoginPage";
export default async function Page({ searchParams }: { searchParams: Promise<{ verified?: string; error?: string }> }) {
  const query = await searchParams;
  return <LoginPage verified={query.verified === "1"} tokenError={Boolean(query.error)}/>;
}
