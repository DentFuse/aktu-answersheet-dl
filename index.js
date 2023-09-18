import puppeteer from "puppeteer";
import fs from "fs/promises";
import { existsSync } from "fs";

const launchOpts = {
  headless: false,
};

let urlCap = [];
let dlActive = false;
let currentSub = "";
let count = 0;

async function main() {
  try {
    const config = JSON.parse(await fs.readFile("config.json", "utf-8"));
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await checkImages(page);

    // Navigate the page to a URL
    await page.goto("https://aktuexams.in/AKTU/frmIntelliHomePage.aspx");
    await page.click("#txtUserID");
    await input(page, config.user);
    await page.click("#txtPasswrd");
    await input(page, config.pass);
    await page.click("#IbtnEnter");
    await sleep(5000);
    let frame = page.frames()[1];
    await frame.hover("body a.StdMenuStye");
    await sleep(500);
    await frame.click("body a.DynamicmenuBackground");
    await sleep(3000);
    frame = page.frames()[1];
    const ddList = await frame.$(
      "#ctl00_Ajaxmastercontentplaceholder_ddlexamname"
    );
    for (let i = 0; i < (await ddList.$$("option")).length - 1; i++) {
      await frame.focus("#ctl00_Ajaxmastercontentplaceholder_ddlexamname");
      await page.keyboard.press("ArrowDown");
      await sleep(1000);
      let table = await frame.$(
        "#ctl00_Ajaxmastercontentplaceholder_GVASIDDetails"
      );
      let rows = await table.$$(".rowstyle");
      for (let x = 0; x < rows.length; x++) {
        table = await frame.$(
          "#ctl00_Ajaxmastercontentplaceholder_GVASIDDetails"
        );
        const row = (await table.$$(".rowstyle"))[x];
        const td = (await row.$$("td"))[2];
        let subName = (await row.$$("td"))[1];
        subName = await subName.$("span");
        subName = await frame.evaluate((el) => el.textContent, subName);
        currentSub = subName;
        const ip = (await td.$$("input"))[1];
        await page.waitForNetworkIdle();
        dlActive = true;
        count = 0;
        await ip.click();
        await page.waitForNetworkIdle();
        await sleep(5000);
        for (let j = 0; j < 36; j++) {
          console.log(count);
          await sleep(1000);
          count++;
          await frame.click("#ctl00_Ajaxmastercontentplaceholder_Next");
          await sleep(2000);
          await page.waitForNetworkIdle();
        }
        await sleep(5000);
        dlActive = false;
        await frame.click("#ctl00_Ajaxmastercontentplaceholder_Lbtnback");
        await sleep(3000);
      }
    }
    await browser.close();
  } catch (e) {
    console.error(e);
  }
}

function checkImages(page) {
  return new Promise(async (resolve, reject) => {
    try {
      await page.setRequestInterception(true);
      page.on("request", (request) => request.continue());
      page.on("requestfinished", async (request) => {
        if (request.resourceType() === "image") {
          if (!dlActive) return;
          console.log(request.url());
          const dir = "./out/" + currentSub;
          if (!existsSync(dir)) await fs.mkdir(dir);
          const img = await request.response().buffer();
          await fs.writeFile(
            dir + "/" + count.toString() + "." + request.url().split(".").pop(),
            img,
            "binary"
          );
        }
      });
      const session = await page.target().createCDPSession();
      await session.send("Page.enable");
      await session.send("Page.setWebLifecycleState", { state: "active" });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

function sleep(time) {
  return new Promise((r) => setTimeout(r, time));
}

function input(
  page,
  str,
  keyMin = 100,
  keyMax = 200,
  pressMin = 50,
  pressMax = 150
) {
  return new Promise(async (res) => {
    for (const i of str) {
      const pressDelay = randomInt(pressMin, pressMax);
      const delayKey = randomInt(keyMin, keyMax);
      page.keyboard.type(i, { delay: pressDelay });
      await sleep(delayKey);
    }
    res();
  });
}

function randomInt(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min) + min);
}

main();
