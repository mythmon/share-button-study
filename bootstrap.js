const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/AppConstants.jsm");

const CSS_URI = Services.io.newURI("resource://share-button-study/share_button.css");
let bWindow;
let utils;
let shareButton;
let urlInputControllers;

function shareButtonAnimationListener(e) {
  // When the animation is done, we want to remove the CSS class
  // so that we can add the class again upon the next copy and
  // replay the animation
  shareButton.classList.remove("social-share-button-on");
}

const urlInputController = {
  // See https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Property/controllers
  supportsCommand(cmd) { return cmd === "cmd_copy"; },
  isCommandEnabled(cmd) { return true; },
  doCommand(cmd) {
    if (cmd === "cmd_copy") {
      shareButton.classList.add("social-share-button-on");
    }
    // Iterate over all other controllers and call doCommand on the first controller
    // that supports it
    // Skip until we reach the controller that we inserted
    let i = 0;
    for (i < urlInputControllers.getControllerCount(); i++;) {
      const curController = urlInputControllers.getControllerAt(i);
      if (curController === urlInputController) {
        i += 1;
        break;
      }
    }
    for (i < urlInputControllers.getControllerCount(); i++;) {
      const curController = urlInputControllers.getControllerAt(i);
      if (curController.supportsCommand(cmd)) {
        curController.doCommand(cmd);
        break;
      }
    }
  },
  onEvent(e) {},
};

this.install = function(data, reason) {};

this.startup = function(data, reason) {
  bWindow = Services.wm.getMostRecentWindow("navigator:browser");
  const bDocument = bWindow.document;

  // Load the CSS with the shareButton animation
  utils = bWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
  utils.loadSheet(CSS_URI, utils.AGENT_SHEET);

  // Get the "DOM" elements
  shareButton = bDocument.getElementById("social-share-button");
  const urlBar = bDocument.getElementById("urlbar");
  // XUL elements are different than regular children
  const urlInput = bDocument.getAnonymousElementByAttribute(urlBar, "anonid", "input");

  // Add the controller to intercept copy "event"
  // Store controllers so that our controller can inherit cmd_copy from
  // the actual controller
  urlInputControllers = urlInput.controllers;
  urlInputControllers.insertControllerAt(0, urlInputController);

  // Add the event listener to remove the CSS class when the animation ends
  shareButton.addEventListener("animationend", shareButtonAnimationListener);
};

this.shutdown = function(data, reason) {
  utils.removeSheet(CSS_URI, utils.AGENT_SHEET);

  if (shareButton) {
    shareButton.classList.remove("social-share-button-on");
  }

  urlInputControllers.removeController(urlInputController);

  shareButton.removeEventListener("animationend", shareButtonAnimationListener);
};

this.uninstall = function(data, reason) {};
