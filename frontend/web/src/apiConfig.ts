const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const browserHost =
  typeof window === "undefined" ? undefined : window.location.hostname;
const isRemoteBrowser = browserHost !== undefined && !LOCAL_HOSTS.has(browserHost);

function getApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (!configuredUrl) {
    return `http://${isRemoteBrowser ? browserHost : "localhost"}:3000`;
  }

  try {
    const url = new URL(configuredUrl);
    if (
      isRemoteBrowser &&
      browserHost &&
      LOCAL_HOSTS.has(url.hostname)
    ) {
      url.hostname = browserHost;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl.replace(/\/$/, "");
  }
}

export const API_URL = getApiUrl();
