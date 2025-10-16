import lighthouse from "lighthouse";
import puppeteer from "puppeteer";
import fs from "fs";

const lhFlags = {
  output: "html",
  logLevel: "info",
  disableStorageReset: true,
  throttlingMethod: "provided",
  formFactor: "desktop",
  screenEmulation: {
    mobile: false,
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

const time = new Date().toDateString();

function sanitizeFilename(url) {
  return url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

const cleanUp = () => {
  if (!fs.existsSync("./results")) {
    fs.mkdirSync("./results");
  } else {
    fs.rmSync("./results", { recursive: true, force: true });
    fs.mkdirSync("./results");
  }
};

async function runLighthouse(url) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--remote-debugging-port=9222", "--window-size=1920,1080"],
    defaultViewport: null,
  });

  const [page] = await browser.pages();
  await page.goto(url, { waitUntil: "networkidle2" });

  // 👇 Scroll and wait 10s
  // Click the CMP accept button
  await page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll("button.consent_BHP9G")
    );
    const acceptBtn = buttons.find((b) => b.innerText.trim() === "Accept");
    if (acceptBtn) acceptBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.evaluate(() => window.scrollBy(0, 1500));

  await new Promise((r) => setTimeout(r, 10000));

  const runnerResult = await lighthouse(url, {
    port: 9222,
    ...lhFlags,
  });

  const filename = sanitizeFilename(url) + "-DATE-" + time;
  const reportHtml = runnerResult.report;
  fs.writeFileSync(`./results/${filename}.html`, reportHtml);

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(reportHtml, { waitUntil: "networkidle0" });
  await pdfPage.pdf({ path: `./results/${filename}.pdf`, format: "A4" });

  await browser.close();
}

const urls = [
  "https://www.dailymail.co.uk/home/index.html",
  "https://www.dailymail.co.uk/home/index.html?abv=off",
];

(async () => {
  cleanUp();
  for (const url of urls) {
    await runLighthouse(url);
  }
})();
