"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Console.jsm");
Cu.import("resource://gre/modules/AppConstants.jsm");

const CSS_URI = Services.io.newURI("resource://share-button-study/share_button.css");
let b_window;
let utils;
let share_button;
let url_input;
let url_input_controllers;

function share_button_animation_listener(e) {
    // When the animation is done, we want to remove the CSS class
    // so that we can add the class again upon the next copy and 
    // replay the animation
    share_button.classList.remove("social-share-button-on");
}

const url_input_controller = {
    // See https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Property/controllers
    supportsCommand : function(cmd){ return cmd === "cmd_copy"; },
    isCommandEnabled : function(cmd){ return true; },
    doCommand: function(cmd) {
        if (cmd === "cmd_copy") {
            share_button.classList.add("social-share-button-on");
        }
        // Iterate over all other controllers and call doCommand on the first controller that supports it
        // Skip until we reach the controller that we inserted
        let i = 0;
        for (i < url_input_controllers.getControllerCount(); i++;) {
            let cur_controller = url_input_controllers.getControllerAt(i);
            if (cur_controller === url_input_controller) {
                i += 1;
                break;
            }
        }
        for (i < url_input_controllers.getControllerCount(); i++;) {
            let cur_controller = url_input_controllers.getControllerAt(i);
            if (cur_controller.supportsCommand(cmd)) {
                cur_controller.doCommand(cmd);
                break;
            }
        }
    },
    onEvent : function(e) {}
};

function install(data, reason) {}

function startup(data, reason) {
    b_window = Services.wm.getMostRecentWindow("navigator:browser");
    const b_document = b_window.document;

    // Load the CSS with the share_button animation
    utils = b_window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    utils.loadSheet(CSS_URI, utils.AGENT_SHEET);

    // Get the "DOM" elements
    share_button = b_document.getElementById("social-share-button");
    let url_bar = b_document.getElementById("urlbar");
    // XUL elements are different than regular children
    url_input = b_document.getAnonymousElementByAttribute(url_bar, "anonid", "input");

    // Add the controller to intercept copy "event"
    // Store controllers so that our controller can inherit cmd_copy from
    // the actual controller
    url_input_controllers = url_input.controllers;
    url_input_controllers.insertControllerAt(0, url_input_controller);

    // Add the event listener to remove the CSS class when the animation ends
    share_button.addEventListener('animationend', share_button_animation_listener);
}

function shutdown(data, reason) {
    utils.removeSheet(CSS_URI, utils.AGENT_SHEET);

    share_button.classList.remove("social-share-button-on");

    url_input_controllers.removeController(url_input_controller);

    share_button.removeEventListener('animationend', share_button_animation_listener);
}

function uninstall(data, reason) {}
