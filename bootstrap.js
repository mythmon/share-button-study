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

  updateShareButton() {
    this.shareButton = this.window.document.getElementById("social-share-button");
  }

  setCopyController(copyController) {
    this.copyController = copyController;
  }

  insertCopyController() {
    // refresh urlInput reference, this is potentially changed by the customize event
    this.urlInput = getUrlInput(this.window);
    this.urlInput.controllers.insertControllerAt(0, this.copyController);
  }

  removeCopyController() {
    // refresh urlInput reference, this is potentially changed by the customize event
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
    this.browserWindow = browserWindow;
  }

  supportsCommand(cmd) { return cmd === "cmd_copy"; }

  isCommandEnabled(cmd) { return true; }

  doCommand(cmd) {
    if (cmd === "cmd_copy") {
      this.browserWindow.updateShareButton();
      const shareButton = this.browserWindow.shareButton;
      if (shareButton !== null) {
        // add the event listener to remove the css class when the animation ends
        shareButton.addEventListener("animationend", this.browserWindow.shareButtonListener);
        shareButton.classList.add("social-share-button-on");
      }
    }
    // Iterate over all other controllers and call doCommand on the first controller
    // that supports it
    // Skip until we reach the controller that we inserted
    let i = 0;
    const urlInput = this.browserWindow.urlInput;
    for (; i < urlInput.controllers.getControllerCount(); i++) {
      const curController = urlInput.controllers.getControllerAt(i);
      if (curController === this) {
        i += 1;
        break;
      }
    }
    for (; i < urlInput.controllers.getControllerCount(); i++) {
      const curController = urlInput.controllers.getControllerAt(i);
      if (curController.supportsCommand(cmd)) {
        curController.doCommand(cmd);
        break;
      }
    }
  }

  onEvent(e) {}
}

function injectExtension(aWindow) {
  console.log(aWindow.document);

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

// see https://dxr.mozilla.org/mozilla-central/rev/53477d584130945864c4491632f88da437353356/xpfe/appshell/nsIWindowMediatorListener.idl
const WindowListener = {
  onWindowTitleChange(window, title) { },
  onOpenWindow(xulWindow) {
    // FIXME window is of type nsIXULWindow, we want an nsIDOMWindow
    // TODO Call injectExtension on the new nsIDOMWindow
    // see https://dxr.mozilla.org/mozilla-central/rev/53477d584130945864c4491632f88da437353356/browser/base/content/test/general/browser_fullscreen-window-open.js#316
    const domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindow);
    const onWindowOpen = (e) => {
      injectExtension(domWindow);
    };
    domWindow.addEventListener("load", onWindowOpen, true);
  },
  onCloseWindow(window) { },
};

this.install = function(data, reason) {};

this.startup = function(data, reason) {
  // iterate over all open windows
  const aWindowEnumerator = Services.wm.getEnumerator("navigator:browser");
  while (aWindowEnumerator.hasMoreElements()) {
    const aWindow = aWindowEnumerator.getNext();

    injectExtension(aWindow);
  }

  // add an event listener for new windows
  Services.wm.addListener(WindowListener);
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
