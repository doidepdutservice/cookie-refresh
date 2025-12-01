import fs from "fs";
import axios from "axios";
import PQueue from "p-queue";   // promise pool

const MAX_CONCURRENCY = 20;     // chạy song song 20 request
const DELAY_MS = 200;           // delay nhẹ để tránh bị block

const queue = new PQueue({ concurrency: MAX_CONCURRENCY });

const cookiesFile = "./cookies.json";
let cookies = JSON.parse(fs.readFileSync(cookiesFile, "utf8"));

async function refreshCookie(key, item) {
  try {
    const resp = await axios.get(
      "https://your-api.com/refresh-cookie",
      {
        headers: { Cookie: item.cookie },
        timeout: 15000,
      }
    );

    // kết quả mới
    const newCookie = resp.data.cookie;

    return {
      key,
      ok: true,
      cookie: newCookie,
    };
  } catch (err) {
    return {
      key,
      ok: false,
      error: err.message,
    };
  }
}

async function run() {
  const keys = Object.keys(cookies);
  const results = [];

  console.log(`🔄 Refresh ${keys.length} cookies…`);
  console.log(`🔁 Running with concurrency = ${MAX_CONCURRENCY}`);

  for (const key of keys) {
    const data = cookies[key];

    queue.add(async () => {
      const result = await refreshCookie(key, data);
      results.push(result);

      console.log(
        `${result.ok ? "✔️" : "❌"} ${key} – ${
          result.ok ? "refreshed" : "failed"
        }`
      );

      await new Promise((res) => setTimeout(res, DELAY_MS));
    });
  }

  // Đợi tất cả hoàn thành
  await queue.onIdle();

  // Ghi lại cookies mới
  for (const r of results) {
    if (r.ok) {
      cookies[r.key].cookie = r.cookie;
    }
  }

  fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
  console.log("💾 Saved updated cookies.json");
}

run();
