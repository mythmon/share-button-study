/* eslint-env node */

const utils = require("./test/utils");
// const webdriver = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

const Context = firefox.Context;

(async() => {
  try {
    const driver = await utils.promiseSetupDriver();

    // add the share-button to the toolbar
    await utils.addShareButton(driver);
    // install the addon
    await utils.installAddon(driver);

    driver.setContext(Context.CONTENT);
    await driver.get("http://mozilla.org");
    driver.setContext(Context.CHROME);
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
  }
})();