// The geckodriver package downloads and installs geckodriver for us.
// We use it by requiring it.

require("geckodriver");
const cmd = require("selenium-webdriver/lib/command");
const firefox = require("selenium-webdriver/firefox");
const Fs = require("fs-promise");
const FxRunnerUtils = require("fx-runner/lib/utils");
const path = require("path");
const webdriver = require("selenium-webdriver");

const By = webdriver.By;
const Context = firefox.Context;
const until = webdriver.until;

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
  "devtools.debugger.remote-enabled": true,
};

function promiseActualBinary(binary) {
  return FxRunnerUtils.normalizeBinary(binary)
    .then(normalizedBinary => Fs.stat(normalizedBinary).then(() => normalizedBinary))
    .catch((ex) => {
      if (ex.code === "ENOENT") {
        throw new Error(`Could not find ${binary}`);
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
  const executor = driver.getExecutor();
  executor.defineCommand("installAddon", "POST", "/session/:sessionId/moz/addon/install");
  const installCmd = new cmd.Command("installAddon");

  const session = await driver.getSession();
  installCmd.setParameters({ sessionId: session.getId(), path: fileLocation, temporary: true });
  await executor.execute(installCmd);
}

module.exports.promiseSetupDriver = async() => {
  const profile = new firefox.Profile();

  Object.keys(FIREFOX_PREFERENCES).forEach((key) => {
    profile.setPreference(key, FIREFOX_PREFERENCES[key]);
  });

  const options = new firefox.Options();
  options.setProfile(profile);

  const builder = new webdriver.Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options);

  const binaryLocation = await promiseActualBinary(process.env.FIREFOX_BINARY || "firefox");
  await options.setBinary(new firefox.Binary(binaryLocation));
  const driver = await builder.build();
  driver.setContext(Context.CHROME);

  // add the share-button to the toolbar
  try {
    await addShareButton(driver);
  } catch (e) {
    console.log(e);
  }

  const fileLocation = path.join(process.cwd(), process.env.XPI_NAME);

  // install the addon
  try {
    await installAddon(driver, fileLocation);
  } catch (e) {
    console.log(e);
  }

  return driver;
};

module.exports.promiseAddonButton = (driver) => {
  driver.setContext(Context.CHROME);
  return driver.wait(until.elementLocated(
    By.id("social-share-button")), 1000);
};
