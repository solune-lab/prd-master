export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 保留路徑 /prd-master/... 直接轉發到 pages.dev
    const targetUrl = `https://prd-master.pages.dev${url.pathname}${url.search}`;

    // 複製 headers 並改寫 Host，避免帶著 soluneai.com 的 Host 打到 pages.dev
    const headers = new Headers(request.headers);
    headers.set('Host', 'prd-master.pages.dev');

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(newRequest);

    // 明確以 streaming body 重建 Response，確保 SSE stream 完整通過 worker
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
