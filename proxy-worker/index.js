export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 保留路徑 /prd-master/... 直接轉發到 pages.dev
    const targetUrl = `https://prd-master.pages.dev${url.pathname}${url.search}`;

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(newRequest);
    return response;
  },
};
