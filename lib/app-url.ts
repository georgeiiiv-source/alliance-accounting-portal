const LOCAL_APP_URL = "http://localhost:3000";

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.NEXTAUTH_URL
    ?? process.env.APP_URL
    ?? process.env.AUTH_URL
    ?? LOCAL_APP_URL;

  return configured.replace(/\/$/, "");
}

export function appUrl(path: string) {
  return new URL(path, `${getAppUrl()}/`).toString();
}
