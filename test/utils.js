"use strict";

// The geckodriver package downloads and installs geckodriver for us.
// We use it by requiring it.
require("geckodriver");
let cmd = require("selenium-webdriver/lib/command");

let firefox = require("selenium-webdriver/firefox");
let webdriver = require("selenium-webdriver");
let FxRunnerUtils = require("fx-runner/lib/utils");
let Fs = require("fs-promise");
let By = webdriver.By;
let Context = firefox.Context;
let until = webdriver.until;
let path = require("path");

// Note: Geckodriver already has quite a good set of default preferences
// for disabling various items.
// https://github.com/mozilla/geckodriver/blob/master/src/marionette.rs
const FIREFOX_PREFERENCES = {
  // Ensure e10s is turned on.
  "browser.tabs.remote.autostart": true,
  "browser.tabs.remote.autostart.1": true,
  "browser.tabs.remote.autostart.2": true,
  // These are good to have set up if you're debugging tests with the browser
  // toolbox.
  "devtools.chrome.enabled": true,
  "devtools.debugger.remote-enabled": true
};

function promiseActualBinary(binary) {
  return FxRunnerUtils.normalizeBinary(binary)
    .then(binary => Fs.stat(binary).then(() => binary))
    .catch(ex => {
      if (ex.code === "ENOENT") {
        throw new Error("Could not find ${binary}");
      }
      throw ex;
    });
}

async function addShareButton(driver) {
  await driver.executeAsyncScript((callback) => {
    // see https://dxr.mozilla.org/mozilla-central/source/browser/base/content/browser-social.js#193
    Components.utils.import("resource:///modules/CustomizableUI.jsm");
    CustomizableUI.addWidgetToArea("social-share-button", CustomizableUI.AREA_NAVBAR);
    callback();
  });
}

async function installAddon(driver, fileLocation) {
  let executor = driver.getExecutor();
  executor.defineCommand("installAddon", "POST", "/session/:sessionId/moz/addon/install")
  let installCmd = new cmd.Command("installAddon");

  let session = await driver.getSession();
  installCmd.setParameters({sessionId: session.getId(), path: fileLocation, temporary: true})
  await executor.execute(installCmd);
  console.log("addon installed");
}

module.exports.promiseSetupDriver = async () => {
  let profile = new firefox.Profile();

  Object.keys(FIREFOX_PREFERENCES).forEach(key => {
    profile.setPreference(key, FIREFOX_PREFERENCES[key]);
  });

  let options = new firefox.Options();
  options.setProfile(profile);

  let builder = new webdriver.Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options);

  const binaryLocation = await promiseActualBinary(process.env.FIREFOX_BINARY || "firefox");
  await options.setBinary(new firefox.Binary(binaryLocation));
  const driver = await builder.build();
  driver.setContext(Context.CHROME);

  // add the share-button to the toolbar
  await addShareButton(driver);

  let fileLocation = path.join(process.cwd(), process.env.XPI_NAME);

  // install the addon
  await installAddon(driver, fileLocation);

  return driver;
};

module.exports.promiseAddonButton = driver => {
  driver.setContext(Context.CHROME);
  return driver.wait(until.elementLocated(
    By.id("social-share-button")), 1000);
};
