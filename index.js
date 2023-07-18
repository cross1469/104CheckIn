const puppeteer = require("puppeteer");
const config = require("./config/default.json");
const time = require("./modules/time.js");
const flog = require("./modules/log.js");

(async () => {
  if (!config.dry_run) {
    var sleepTime = time.random_secs(config.random_sec);
    flog.normal("wait " + sleepTime + " seconds");
    await time.sleep(sleepTime * 1000);
  } else {
    flog.normal("dry run");
  }

  const browser = await puppeteer.launch({
    headless: config.browser.background,
    //set false to enable brwoser, otherwise it will run in background
    defaultViewport: null,
    executablePath: config.browser.chrome_path,
    userDataDir: config.browser.user_data,
  });

  const page = await browser.newPage();

  await page.goto(config.urls.login);

  try {
    flog.normal("Login page");
    await page.waitForSelector("#app", { timeout: config.timeout_ms });
    await page.waitForSelector('button[data-qa-id="loginButton"]', {
      timeout: config.timeout_ms,
    });
    await page.type('input[data-qa-id="loginUserName"]', config.user.username, {
      delay: 100,
    });
    await page.type('input[data-qa-id="loginPassword"]', config.user.password, {
      delay: 100,
    });
    await page.click('button[data-qa-id="loginButton"]');
  } catch (error) {
    flog.normal("Already login!");
  }

  try {
    await page.waitForSelector(".mb-8", { timeout: config.timeout_ms });
    let elements = await page.$$(".mb-8");
    for (let i = 0; i < elements.length; i++) {
      let text = await page.evaluate((el) => el.innerText, elements[i]);
      if (text.indexOf("驗證碼") > -1) {
        flog.normal("需要通過OTP驗證");
        break;
      }
    }
  } catch (error) {
    flog.normal("Verified device!");
  }

  try {
    await page.waitForSelector("#PRO-page-content", {
      timeout: config.otp_timeout_ms,
    });
    await page.goto(config.urls.checkin);
    await page.waitForSelector("#PSC2", { timeout: config.timeout_ms });
    await time.sleep(500);
    await page.screenshot({
      path: "./records/" + time.current_time() + "_PSC2.png",
    });
    try {
      await page.waitForSelector('button[aria-label="關閉"]', {
        timeout: config.timeout_ms,
      });
      let elements = await page.$$('button[aria-label="關閉"]');
      flog.normal("Find " + elements.length + " buttons, close them!");
      await time.sleep(4500);
      for (let i = 0; i < elements.length; i++) {
        elements[i].click();
      }
      flog.normal("closed!");
      await time.sleep(500);
      await page.screenshot({
        path: "./records/" + time.current_time() + "_PSC2e.png",
      });
    } catch (error) {
      flog.normal("Keep going to check-in");
    }

    //wait for elements to appear on the page
    await page.waitForSelector(".col-xs-12", { timeout: config.timeout_ms });
    // capture all the items
    let elements = await page.$$(".col-xs-12");
    // loop trough items
    for (let i = 0; i < elements.length; i++) {
      let text = await page.evaluate((el) => el.innerText, elements[i]);
      if (text.indexOf("Clock in/out") > -1) {
        flog.normal("Check-in!");
        if (!config.dry_run) {
          await elements[i].click();
        }
        break;
      }
    }
    await time.sleep(500);
    await page.screenshot({
      path: "./records/" + time.current_time() + "_checkin.png",
    });
    await browser.close();
  } catch (error) {
    flog.normal("Failed to check-in");
    await page.screenshot({
      path: "./records/" + time.current_time() + "_error.png",
    });
  }
})();
