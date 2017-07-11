/* eslint-env node */

/* This file is a helper script that will install the extension from the .xpi
 * file and setup useful preferences for debugging. This is the same setup
 * that the automated Selenium-Webdriver/Mocha tests run, except in this case
 * we can manually interact with the browser.
 * NOTE: If changes are made, they will not be reflected in the browser upon
 * reloading, as the .xpi file has not been recreated.
 */

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
