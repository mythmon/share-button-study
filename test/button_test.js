/* eslint-env node, mocha */

const assert = require("assert");
const utils = require("./utils");
const clipboardy = require("clipboardy");
// const webdriver = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

const Context = firefox.Context;

// TODO create new profile per test?
// then we can test with a clean profile every time

describe("Add-on Functional Tests", function() {
  // This gives Firefox time to start, and us a bit longer during some of the tests.
  this.timeout(10000);

  let driver;
  let addonId;

  before(async() => {
    driver = await utils.promiseSetupDriver();
  });

  after(() => driver.quit());

  it("should have a URL bar", async() => {
    const urlBar = await utils.promiseUrlBar(driver);
    const text = await urlBar.getAttribute("placeholder");
    assert.equal(text, "Search or enter address");
  });

  it("should have a toolbar button", async() => {
    // add the share-button to the toolbar
    await utils.addShareButton(driver);
    // install the addon
    addonId = await utils.installAddon(driver);

    const button = await utils.promiseAddonButton(driver);
    const text = await button.getAttribute("tooltiptext");
    assert.equal(text, "Share this page");
  });

  it("should have copy paste working", async() => {
    // FIXME testText will automatically be treated as a URL
    // which means that it will be formatted and the clipboard
    // value will be different unless we pass in a URL text at
    // the start
    const testText = "about:test";

    // write dummy value just in case testText is already in clipboard
    await clipboardy.write("foobar");
    await utils.copyUrlBar(driver);
    const clipboard = await clipboardy.read();
    assert(clipboard === testText);
  });

  it("animation should not trigger on disabled page", async() => {
    // navigate to a disabled page
    driver.setContext(Context.CONTENT);
    await driver.get("about:blank");
    driver.setContext(Context.CHROME);

    await utils.copyUrlBar(driver);
    const { hasClass, hasColor } = await utils.testAnimation(driver);
    assert(!hasClass && !hasColor);
  });

  it("animation should trigger on regular page", async() => {
    // navigate to a disabled page
    driver.setContext(Context.CONTENT);
    await driver.get("http://mozilla.org");
    driver.setContext(Context.CHROME);

    await utils.copyUrlBar(driver);
    const { hasClass, hasColor } = await utils.testAnimation(driver);
    assert(hasClass && hasColor);
    // wait for the animation to end before running subsequent tests
    await utils.waitForAnimationEnd(driver);
  });


  it("should no longer trigger animation once uninstalled", async() => {
    await utils.uninstallAddon(driver, addonId);
    await utils.copyUrlBar(driver);
    const { hasClass, hasColor } = await utils.testAnimation(driver);
    assert(!hasClass && !hasColor);
  });
});
