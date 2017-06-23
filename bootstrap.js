const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/AppConstants.jsm");

const CSS_URI = Services.io.newURI("resource://share-button-study/share_button.css");
let bWindow = null;
let bDocument = null;
let utils = null;
let shareButton = null;
let urlInputControllers = null;

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
      shareButton = bDocument.getElementById("social-share-button");
      if (shareButton !== null) {
        // add the event listener to remove the css class when the animation ends
        shareButton.addEventListener("animationend", shareButtonAnimationListener);
        shareButton.classList.add("social-share-button-on");
      }
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

function insertCopyController() {
  // Get the "DOM" elements
  const urlBar = bDocument.getElementById("urlbar");
  // XUL elements are different than regular children
  const urlInput = bDocument.getAnonymousElementByAttribute(urlBar, "anonid", "input");

  // Add the controller to intercept copy "event"
  // Store controllers so that our controller can inherit cmd_copy from
  // the actual controller
  urlInputControllers = urlInput.controllers;
  urlInputControllers.insertControllerAt(0, urlInputController);
}

this.install = function(data, reason) {};

this.startup = function(data, reason) {
  bWindow = Services.wm.getMostRecentWindow("navigator:browser");
  bDocument = bWindow.document;

  bWindow.addEventListener("customizationending", insertCopyController);

  // Load the CSS with the shareButton animation
  utils = bWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
  utils.loadSheet(CSS_URI, utils.AGENT_SHEET);

  insertCopyController();
};

this.shutdown = function(data, reason) {
  // Remove the customizationending listener
  bWindow.removeEventListener("customizationending", insertCopyController);

  utils.removeSheet(CSS_URI, utils.AGENT_SHEET);

  // Remove the copy controller
  urlInputControllers.removeController(urlInputController);

  // if null this means the user did not copy from the URL bar
  // so we don't have anything to remove
  if (shareButton !== null) {
    shareButton.classList.remove("social-share-button-on");
    shareButton.removeEventListener("animationend", shareButtonAnimationListener);
  }
};

this.uninstall = function(data, reason) {};
