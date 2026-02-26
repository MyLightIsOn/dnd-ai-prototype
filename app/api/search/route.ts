// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "BRAVE_API_KEY not configured" }, { status: 500 });
  }

  let body: { query: string; maxResults?: number; includeDomains?: string; excludeDomains?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, maxResults = 5 } = body;
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(maxResults, 1), 10)),
  });

  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Brave API error ${response.status}: ${text}` }, { status: response.status });
    }

    const data = await response.json();
    const results = (data?.web?.results ?? []).map((r: { title: string; url: string; description?: string; page_age?: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? "",
      publishedDate: r.page_age,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
