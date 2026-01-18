import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join("/");

  // Determine if this is an m3u8 or ts file
  const isManifest = fullPath.endsWith(".m3u8") || !fullPath.includes(".");
  const url = isManifest
    ? `https://www.liveatc.net/hlsfeed/${fullPath}${fullPath.endsWith(".m3u8") ? "" : ".m3u8"}`
    : `https://www.liveatc.net/hlsfeed/${fullPath}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.liveatc.net/",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Stream not available" },
        { status: response.status }
      );
    }

    if (isManifest) {
      const content = await response.text();

      // Rewrite relative URLs in the m3u8 to go through our proxy
      const rewrittenContent = content.replace(
        /^(?!#)(.+\.ts.*)$/gm,
        "/api/atc-stream/$1"
      );

      return new NextResponse(rewrittenContent, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    } else {
      // For .ts segments, stream the binary data
      const arrayBuffer = await response.arrayBuffer();

      return new NextResponse(arrayBuffer, {
        headers: {
          "Content-Type": "video/mp2t",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stream" },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join("/");
  const url = `https://www.liveatc.net/hlsfeed/${fullPath}${fullPath.endsWith(".m3u8") ? "" : ".m3u8"}`;

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.liveatc.net/",
      },
    });

    return new NextResponse(null, {
      status: response.ok ? 200 : 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
