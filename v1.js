import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import puppeteer from "puppeteer";
import fs from "fs";

//const flags = {chromeFlags: ["--headless"]};
const flags = {
  chromeFlags: ["--window-size=1920,1080", "--start-maximized"]
};
const lhSettings = {
  logLevel: "info",
  output: "html",
  emulatedFormFactor: "desktop",
  formFactor: "desktop",
  disableStorageReset: true,
  skipAudits: ["script-treemap"],
  throttlingMethod: "provided", 
  screenEmulation: {
    width: 1920,
    height: 1080,
    mobile: false, // <--- important
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

async function runLighthouse(url, options = {}, config = null) {
  const chrome = await launch(flags);
  options.port = chrome.port;
  const filename = sanitizeFilename(url) + "-DATE-" + time;

  try {
    const runnerResult = await lighthouse(url, options, config);

    // `.report` is the HTML report as a string
    const reportHtml = runnerResult.report;
    fs.writeFileSync(`./results/${filename}.html`, reportHtml);

    // Convert HTML to PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(reportHtml, { waitUntil: "networkidle0" });
    await page.pdf({
      path: `./results/${filename}.pdf`,
      format: "A4",
    });
    await browser.close();
  } catch (error) {
    console.error("Error running Lighthouse:", error);
  } finally {
    await chrome.kill();
  }
}

const urls = ['https://www.dailymail.co.uk/home/index.html', 'https://www.dailymail.co.uk/home/index.html?abv=off'];

const runTask = async () => {
  cleanUp();
  for (const url of urls) {
    await runLighthouse(url, lhSettings);
  }
};

runTask();

// `.lhr` is the Lighthouse Result as a JS object
// console.log("Lighthouse score:", runnerResult.lhr.categories.performance.score * 100);
// console.log(runnerResult.lhr.categories.performance);
