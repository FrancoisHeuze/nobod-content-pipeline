export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

  if (url.pathname === "/publish/instagram" && request.method === "POST") {
    return handleInstagramPublish(request, env);
  }

  return new Response("NoBod Content Pipeline - OK", { status: 200 });
  },
};

async function handleInstagramPublish(request, env) {
  try {
    const body = await request.json();
    const { imageUrl, videoUrl, caption, mediaType } = body;

  const igUserId = env.IG_USER_ID;
    const accessToken = env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken || !igUserId) {
    return new Response(JSON.stringify({ error: "Missing INSTAGRAM_ACCESS_TOKEN or IG_USER_ID env vars" }), { status: 500 });
  }

  const containerParams = new URLSearchParams({
    caption: caption || "",
    access_token: accessToken,
  });
    if (mediaType === "STORIES") containerParams.set("media_type", "STORIES");
    if (videoUrl) {
      containerParams.set("video_url", videoUrl);
      if (mediaType !== "STORIES") containerParams.set("media_type", "REELS");
    } else if (imageUrl) {
      containerParams.set("image_url", imageUrl);
    }

  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    body: containerParams,
  });
    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      return new Response(JSON.stringify({ step: "create_container", error: containerData }), { status: 502 });
    }

  const creationId = containerData.id;

  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      body: publishParams,
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return new Response(JSON.stringify({ step: "publish", error: publishData }), { status: 502 });
    }

  return new Response(JSON.stringify({ success: true, mediaId: publishData.id }), {
    headers: { "Content-Type": "application/json" },
  });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
