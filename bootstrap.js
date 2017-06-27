const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/AppConstants.jsm");

const CSS_URI = Services.io.newURI("resource://share-button-study/share_button.css");
const browserWindowArray = [];

function getUrlInput(bWindow) {
  // Get the "DOM" elements
  const urlBar = bWindow.document.getElementById("urlbar");
  // XUL elements are different than regular children
  const urlInput = bWindow.document.getAnonymousElementByAttribute(urlBar, "anonid", "input");
  return urlInput;
}

class BrowserWindow {
  constructor(aWindow) {
    this.window = aWindow;
    this.urlInput = getUrlInput(this.window);
    this.shareButton = this.window.document.getElementById("social-share-button");

    // bind functions that are called externally so that `this` will work
    this.shareButtonListener = this.shareButtonListener.bind(this);

    this.insertCopyController = this.insertCopyController.bind(this);
    this.removeCopyController = this.removeCopyController.bind(this);

    this.addCustomizeListener = this.addCustomizeListener.bind(this);
    this.removeCustomizeListener = this.removeCustomizeListener.bind(this);
  }

  setCopyController(copyController) {
    this.copyController = copyController;
  }

  insertCopyController() {
    // refresh urlInput reference
    this.urlInput = getUrlInput(this.window);
    this.urlInput.controllers.insertControllerAt(0, this.copyController);
  }

  removeCopyController() {
    // refresh urlInput reference
    this.urlInput = getUrlInput(this.window);
    this.urlInput.controllers.removeController(this.copyController);
  }

  shareButtonListener(e) {
    // When the animation is done, we want to remove the CSS class
    // so that we can add the class again upon the next copy and
    // replay the animation
    this.shareButton.classList.remove("social-share-button-on");
  }

  addCustomizeListener() {
    this.window.addEventListener("customizationending", this.insertCopyController);
  }

  removeCustomizeListener() {
    this.window.removeEventListener("customizationending", this.insertCopyController);
  }

  insertCSS() {
    const utils = this.window.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils);
    utils.loadSheet(CSS_URI, utils.AGENT_SHEET);
  }

  removeCSS() {
    const utils = this.window.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils);
    utils.removeSheet(CSS_URI, utils.AGENT_SHEET);
  }
}

class CopyController {
  // See https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Property/controllers
  constructor(browserWindow) {
    this.shareButton = browserWindow.shareButton;
    this.shareButtonListener = browserWindow.shareButtonListener;
    this.urlInput = browserWindow.urlInput;
  }

  supportsCommand(cmd) { return cmd === "cmd_copy"}

  isCommandEnabled(cmd) { return true; }

  doCommand(cmd) {
    if (cmd === "cmd_copy") {
      if (this.shareButton !== null) {
        // add the event listener to remove the css class when the animation ends
        this.shareButton.addEventListener("animationend", this.shareButtonListener);
        this.shareButton.classList.add("social-share-button-on");
      }
    }
    // Iterate over all other controllers and call doCommand on the first controller
    // that supports it
    // Skip until we reach the controller that we inserted
    let i = 0;
    for (; i < this.urlInput.controllers.getControllerCount(); i++) {
      const curController = this.urlInput.controllers.getControllerAt(i);
      if (curController === this) {
        i += 1;
        break;
      }
    }
    for (; i < this.urlInput.controllers.getControllerCount(); i++) {
      const curController = this.urlInput.controllers.getControllerAt(i);
      if (curController.supportsCommand(cmd)) {
        curController.doCommand(cmd);
        break;
      }
    }
  }

  onEvent(e) {}
}

this.install = function(data, reason) {};

this.startup = function(data, reason) {
  const aWindowEnumerator = Services.wm.getEnumerator("navigator:browser");
  while (aWindowEnumerator.hasMoreElements()) {
    const aWindow = aWindowEnumerator.getNext();

    const browserWindow = new BrowserWindow(aWindow);
    const copyController = new CopyController(browserWindow);
    browserWindow.setCopyController(copyController);
    browserWindowArray.push(browserWindow);

    // The customizationending event represents exiting the "Customize..." menu from the toolbar.
    // We need to handle this event because after exiting the customization menu, the copy
    // controller is removed and we can no longer detect text being copied from the URL bar.
    // See DXR:browser/base/content/browser-customization.js
    browserWindow.addCustomizeListener();

    // Load the CSS with the shareButton animation
    browserWindow.insertCSS();

    // insert the copy controller to detect copying from URL bar
    browserWindow.insertCopyController();
  }
};

this.shutdown = function(data, reason) {
  for (let browserWindow of browserWindowArray) {
    // Remove the customizationending listener
    browserWindow.removeCustomizeListener();

    // Remove the CSS
    browserWindow.removeCSS();

    // Remove the copy controller
    browserWindow.removeCopyController();

    // Remove modifications to shareButton (modified in CopyController)
    if (browserWindow.shareButton !== null) {
      // if null this means the user did not copy from the URL bar
      // so we don't have anything to remove
      browserWindow.shareButton.classList.remove("social-share-button-on");
      browserWindow.shareButton.removeEventListener("animationend", browserWindow.shareButtonListener);
    }
  }
};

this.uninstall = function(data, reason) {};
