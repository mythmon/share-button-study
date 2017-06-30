/* eslint-env node, mocha */

const assert = require("assert");
const utils = require("./utils");
const path = require("path");

// TODO these may be useful for more complex tests
// const firefox = require("selenium-webdriver/firefox");
// const Context = firefox.Context;

// TODO create new profile per test?
// then we can test with a clean profile every time

describe("Example Add-on Functional Tests", function() {
  // This gives Firefox time to start, and us a bit longer during some of the tests.
  this.timeout(10000);

  let driver;

  before(async() => {
    const newDriver = await utils.promiseSetupDriver();
    driver = newDriver;
    return Promise.resolve();
  });

  after(() => driver.quit());

  it("should have a toolbar button", async() => {
    // add the share-button to the toolbar
    await utils.addShareButton(driver);
    // install the addon
    const fileLocation = path.join(process.cwd(), process.env.XPI_NAME);
    await utils.installAddon(driver, fileLocation);

    const button = await utils.promiseAddonButton(driver);
    const text = await button.getAttribute("tooltiptext");
    assert.equal(text, "Share this page");
  });
});
