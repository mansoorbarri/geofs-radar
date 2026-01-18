import { NextRequest, NextResponse } from "next/server";

interface AtcFeed {
  name: string;
  mount: string;
  frequency?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ icao: string }> }
) {
  const { icao } = await params;
  const upperIcao = icao.toUpperCase();

  try {
    // Fetch the LiveATC search page for this airport
    const response = await fetch(
      `https://www.liveatc.net/search/?icao=${upperIcao}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ feeds: [] }, { status: 200 });
    }

    const html = await response.text();
    const feeds: AtcFeed[] = [];
    const seenMounts = new Set<string>();

    // Find feed names: <td bgcolor="lightblue"><strong>FEED NAME</strong></td>
    // followed by myHTML5Popup('mount','icao')
    const feedBlockRegex = /<td bgcolor="lightblue"><strong>([^<]+)<\/strong><\/td>[\s\S]*?myHTML5Popup\('([^']+)'/g;

    let match;
    while ((match = feedBlockRegex.exec(html)) !== null) {
      const name = match[1]?.trim();
      const mount = match[2];

      if (name && mount && !seenMounts.has(mount)) {
        seenMounts.add(mount);

        // Extract frequency from mount name (e.g., kmia3_app_133775 -> 133.775)
        const freqMatch = mount.match(/_(\d{6})$/);
        const frequency = freqMatch?.[1]
          ? `${freqMatch[1].slice(0, 3)}.${freqMatch[1].slice(3)}`
          : undefined;

        feeds.push({
          name,
          mount,
          frequency,
        });
      }
    }

    // Fallback: simpler regex if the above didn't find anything
    if (feeds.length === 0) {
      const simpleRegex = /myHTML5Popup\('([^']+)','([^']+)'\)/g;
      while ((match = simpleRegex.exec(html)) !== null) {
        const mount = match[1];
        if (mount && !seenMounts.has(mount)) {
          seenMounts.add(mount);

          const freqMatch = mount.match(/_(\d{6})$/);
          const frequency = freqMatch?.[1]
            ? `${freqMatch[1].slice(0, 3)}.${freqMatch[1].slice(3)}`
            : undefined;

          // Generate name from mount
          const parts = mount.split("_");
          const name = parts
            .slice(1, -1) // Remove icao prefix and frequency suffix
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(" ") || mount;

          feeds.push({
            name,
            mount,
            frequency,
          });
        }
      }
    }

    return NextResponse.json(
      { feeds },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching ATC feeds:", error);
    return NextResponse.json({ feeds: [] }, { status: 200 });
  }
}
