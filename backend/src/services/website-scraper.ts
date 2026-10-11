import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import * as playwright from "playwright";
import { ApiError } from "../errors.js";

const ALLOWED_HOST_SUFFIXES = [".kapuaskab.go.id"];
const USER_AGENT = "SABABUKA-WalidataBot/1.0 (+https://satudata.kapuaskab.go.id)";
const BLOCKED_STATUS = new Set([401, 403, 407, 429]);
const { chromium } = playwright as unknown as { chromium: { launch(options: Record<string, unknown>): Promise<any> } };
type Browser = Awaited<ReturnType<typeof chromium.launch>>;
type Page = any;

export interface WebsiteScrapePreview {
  status: "reachable" | "blocked" | "unreachable";
  requested_url: string;
  final_url: string | null;
  http_status: number | null;
  title: string | null;
  description: string | null;
  heading: string | null;
  years: number[];
  table_count: number;
  tables: Array<{ headers: string[]; sample_rows: string[][] }>;
  document_links: Array<{ label: string; url: string; format: string }>;
  candidate_pages: Array<{ label: string; url: string }>;
  checked_at: string;
  message: string;
}

function privateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  const first = parts[0] ?? -1; const second = parts[1] ?? -1;
  return first === 10 || first === 127 || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
    || first === 0 || first >= 224;
}

function privateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc")
    || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9")
    || normalized.startsWith("fea") || normalized.startsWith("feb");
}

async function validatePublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ApiError(400, "SOURCE_INVALID", "Alamat website tidak valid."); }
  if (url.protocol !== "https:") throw new ApiError(400, "SOURCE_INVALID", "Pemeriksaan website hanya mengizinkan HTTPS.");
  if (url.username || url.password || (url.port && url.port !== "443")) throw new ApiError(400, "SOURCE_INVALID", "Alamat website memuat kredensial atau port yang tidak diizinkan.");
  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new ApiError(400, "SOURCE_INVALID", "Pemeriksaan otomatis saat ini dibatasi untuk domain resmi kapuaskab.go.id.");
  }
  if (isIP(hostname)) {
    if ((isIP(hostname) === 4 && privateIpv4(hostname)) || (isIP(hostname) === 6 && privateIpv6(hostname))) {
      throw new ApiError(400, "SOURCE_INVALID", "Alamat jaringan privat tidak dapat diperiksa.");
    }
  } else {
    // Gunakan A-record untuk validasi SSRF. Resolver Windows setempat dapat mengembalikan
    // alamat IPv6 sintetis fd00 untuk domain publik yang sebenarnya memiliki A-record publik.
    const addresses = await lookup(hostname, { all: true, family: 4 }).catch(() => []);
    if (!addresses.length) throw new ApiError(502, "SOURCE_UNAVAILABLE", "Nama domain website tidak dapat ditemukan.");
    if (addresses.some(({ address }) => privateIpv4(address))) throw new ApiError(400, "SOURCE_INVALID", "Domain mengarah ke jaringan privat dan tidak dapat diperiksa.");
  }
  return url;
}

function robotsAllows(body: string, path: string): boolean {
  let applies = false;
  for (const sourceLine of body.split(/\r?\n/u)) {
    const line = sourceLine.replace(/#.*$/u, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*" || value.toLowerCase().includes("sababuka");
    if (applies && key === "disallow" && value && path.startsWith(value)) return false;
  }
  return true;
}

async function checkRobots(url: URL): Promise<{ allowed: boolean; message?: string }> {
  const robotsUrl = new URL("/robots.txt", url);
  try {
    const response = await fetch(robotsUrl, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    if (BLOCKED_STATUS.has(response.status)) return { allowed: false, message: `Website menolak pemeriksaan robots.txt (HTTP ${response.status}).` };
    if (response.status === 404) return { allowed: true };
    if (!response.ok) return { allowed: false, message: `Aturan akses website tidak dapat diverifikasi (HTTP ${response.status}).` };
    return robotsAllows(await response.text(), url.pathname) ? { allowed: true } : { allowed: false, message: "robots.txt tidak mengizinkan pemeriksaan halaman ini." };
  } catch (error) {
    return { allowed: false, message: error instanceof Error ? `robots.txt tidak dapat diperiksa: ${error.message}` : "robots.txt tidak dapat diperiksa." };
  }
}

function blockedPreview(url: URL, message: string, httpStatus: number | null = null): WebsiteScrapePreview {
  return { status: "blocked", requested_url: url.toString(), final_url: null, http_status: httpStatus, title: null, description: null, heading: null, years: [], table_count: 0, tables: [], document_links: [], candidate_pages: [], checked_at: new Date().toISOString(), message };
}

async function protectRequests(page: Page): Promise<void> {
  const hostnameSafety = new Map<string, Promise<boolean>>();
  const isSafeHostname = (hostname: string) => {
    const key = hostname.toLowerCase();
    const cached = hostnameSafety.get(key);
    if (cached) return cached;
    const check = (async () => {
      if (key === "localhost" || key.endsWith(".localhost") || key.endsWith(".local")) return false;
      if (isIP(key)) return isIP(key) === 4 ? !privateIpv4(key) : !privateIpv6(key);
      const addresses = await lookup(key, { all: true, family: 4 }).catch(() => []);
      return addresses.length > 0 && addresses.every(({ address }) => !privateIpv4(address));
    })();
    hostnameSafety.set(key, check);
    return check;
  };
  await page.route("**/*", async (route: any) => {
    const request = route.request();
    const resourceUrl = request.url();
    if (resourceUrl.startsWith("data:") || resourceUrl.startsWith("blob:") || resourceUrl.startsWith("about:")) return route.continue();
    try {
      const parsed = new URL(resourceUrl);
      if (!["https:"].includes(parsed.protocol)) return route.abort("blockedbyclient");
      if (!(await isSafeHostname(parsed.hostname))) return route.abort("blockedbyclient");
    } catch { return route.abort("blockedbyclient"); }
    return route.continue();
  });
}

export async function inspectPublicWebsite(rawUrl: string): Promise<WebsiteScrapePreview> {
  const url = await validatePublicUrl(rawUrl);
  const robots = await checkRobots(url);
  if (!robots.allowed) return blockedPreview(url, robots.message ?? "Website tidak mengizinkan pemeriksaan otomatis.");

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const context = await browser.newContext({ userAgent: USER_AGENT, locale: "id-ID", viewport: { width: 1366, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await protectRequests(page);
    const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 20_000 });
    const status = response?.status() ?? null;
    if (status && BLOCKED_STATUS.has(status)) return blockedPreview(url, `Website menolak pemeriksaan otomatis (HTTP ${status}). Tidak ada upaya melewati proteksi.`, status);
    if (!response || !response.ok()) {
      return { ...blockedPreview(url, `Website belum dapat dibaca${status ? ` (HTTP ${status})` : ""}.`, status), status: "unreachable" };
    }
    const finalUrl = new URL(page.url());
    await validatePublicUrl(finalUrl.toString());
    const content: string = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
    const years = [...new Set((content.match(/\b(?:19|20)\d{2}\b/gu) ?? []).map(Number).filter((year) => year >= 2000 && year <= new Date().getFullYear() + 1))].sort((a, b) => b - a).slice(0, 12);
    const data = await page.evaluate(() => {
      const absolute = (value: string) => { try { return new URL(value, location.href).toString(); } catch { return ""; } };
      const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/gu, " ").trim();
      const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((anchor) => ({ label: clean(anchor.textContent).slice(0, 160) || clean(anchor.title).slice(0, 160) || "Tautan", url: absolute(anchor.getAttribute("href") ?? "") }));
      const docs = anchors.filter((item) => /\.(?:pdf|csv|xlsx?|json)(?:$|[?#])/iu.test(item.url)).slice(0, 30).map((item) => ({ ...item, format: item.url.match(/\.(pdf|csv|xlsx?|json)(?:$|[?#])/iu)?.[1]?.toUpperCase() ?? "FILE" }));
      const pages = anchors.filter((item) => item.url.startsWith(location.origin) && /data|statistik|dokumen|laporan|publikasi|unduh|download/iu.test(`${item.label} ${item.url}`)).slice(0, 20);
      const tables = [...document.querySelectorAll<HTMLTableElement>("table")].slice(0, 5).map((table) => {
        const rows = [...table.querySelectorAll<HTMLTableRowElement>("tr")].slice(0, 6);
        const headers = [...(rows[0]?.querySelectorAll<HTMLElement>("th,td") ?? [])].map((cell) => clean(cell.textContent).slice(0, 120));
        const sampleRows = rows.slice(1).map((row) => [...row.querySelectorAll<HTMLElement>("th,td")].map((cell) => clean(cell.textContent).slice(0, 120)));
        return { headers, sample_rows: sampleRows };
      });
      return {
        title: clean(document.title).slice(0, 240) || null,
        description: clean(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).slice(0, 500) || null,
        heading: clean(document.querySelector("h1")?.textContent).slice(0, 240) || null,
        tableCount: document.querySelectorAll("table").length,
        tables,
        documents: [...new Map(docs.map((item) => [item.url, item])).values()],
        pages: [...new Map(pages.map((item) => [item.url, item])).values()],
      };
    }) as { title: string | null; description: string | null; heading: string | null; tableCount: number; tables: Array<{ headers: string[]; sample_rows: string[][] }>; documents: Array<{ label: string; url: string; format: string }>; pages: Array<{ label: string; url: string }> };
    return {
      status: "reachable", requested_url: url.toString(), final_url: finalUrl.toString(), http_status: status,
      title: data.title, description: data.description, heading: data.heading, years, table_count: data.tableCount,
      tables: data.tables, document_links: data.documents, candidate_pages: data.pages,
      checked_at: new Date().toISOString(),
      message: "Halaman publik berhasil diperiksa. Hasil ini masih berupa kandidat dan belum menjadi data indikator.",
    };
  } catch (error) {
    return { ...blockedPreview(url, error instanceof Error ? `Website belum dapat diperiksa: ${error.message}` : "Website belum dapat diperiksa."), status: "unreachable" };
  } finally { await browser?.close().catch(() => undefined); }
}
