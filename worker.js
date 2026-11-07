const TMDB_BASE = "https://api.themoviedb.org/3";
const ALLOWED_ORIGINS = new Set([
  "https://mcorrea2005.github.io"
]);
const ALLOWED_PATHS = [
  /^\/genre\/movie\/list$/,
  /^\/discover\/movie$/,
  /^\/search\/movie$/,
  /^\/movie\/\d+$/,
  /^\/ratings\/\d+$/
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";

    if (request.method === "OPTIONS") {
      if (!corsOrigin) return new Response("Origin not allowed", { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Accept",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Vary": "Origin",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    };

    const respond = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: corsHeaders });

    if (!corsOrigin) return respond({ error: "Origin not allowed." }, 403);
    if (request.method !== "GET") return respond({ error: "Method not allowed." }, 405);
    if (!env.TMDB_TOKEN) return respond({ error: "Movie service is not configured yet." }, 503);
    if (!ALLOWED_PATHS.some((pattern) => pattern.test(url.pathname))) {
      return respond({ error: "This movie-data endpoint is not available." }, 404);
    }

    if (url.pathname.startsWith("/ratings/")) {
      if (!env.OMDB_API_KEY) return respond({ configured: false, imdbRating: null, rottenTomatoes: null, metascore: null });
      try {
        const movieId = url.pathname.split("/").pop();
        const idsResponse = await fetch(TMDB_BASE + "/movie/" + movieId + "/external_ids", {
          headers: { Authorization: "Bearer " + env.TMDB_TOKEN, Accept: "application/json" }
        });
        if (!idsResponse.ok) return respond({ configured: true, imdbRating: null, rottenTomatoes: null, metascore: null });
        const ids = await idsResponse.json();
        if (!ids.imdb_id) return respond({ configured: true, imdbRating: null, rottenTomatoes: null, metascore: null });
        const ratingsUrl = new URL("https://www.omdbapi.com/");
        ratingsUrl.searchParams.set("i", ids.imdb_id);
        ratingsUrl.searchParams.set("apikey", env.OMDB_API_KEY);
        const ratingsResponse = await fetch(ratingsUrl.toString(), { headers: { Accept: "application/json" } });
        if (!ratingsResponse.ok) return respond({ configured: true, imdbRating: null, rottenTomatoes: null, metascore: null });
        const ratings = await ratingsResponse.json();
        if (ratings.Response !== "True") return respond({ configured: true, imdbRating: null, rottenTomatoes: null, metascore: null });
        const rt = (ratings.Ratings || []).find((item) => item.Source === "Rotten Tomatoes");
        return respond({
          configured: true,
          imdbRating: ratings.imdbRating && ratings.imdbRating !== "N/A" ? ratings.imdbRating : null,
          rottenTomatoes: rt && rt.Value && rt.Value !== "N/A" ? rt.Value : null,
          metascore: ratings.Metascore && ratings.Metascore !== "N/A" ? ratings.Metascore : null
        });
      } catch {
        return respond({ configured: true, imdbRating: null, rottenTomatoes: null, metascore: null });
      }
    }

    const target = new URL(TMDB_BASE + url.pathname);
    for (const [key, value] of url.searchParams) {
      target.searchParams.set(key, value);
    }

    try {
      const upstream = await fetch(target.toString(), {
        headers: {
          Authorization: `Bearer ${env.TMDB_TOKEN}`,
          Accept: "application/json"
        }
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8"
        }
      });
    } catch {
      return respond({ error: "Could not reach the movie database. Please try again." }, 502);
    }
  }
};
