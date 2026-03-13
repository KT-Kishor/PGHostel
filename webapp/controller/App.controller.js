sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox"
], function (Controller, MessageBox) {
  "use strict";

  return Controller.extend("your.namespace.controller.App", {

    TIMEOUT_DURATION: 10 * 60 * 1000, // 15 minutes
    logoutTimer: null,

    onInit: function () {
      var oLoginModel = this.getView().getModel("LoginModel");

      if (oLoginModel && oLoginModel.getProperty("/isLoggedIn")) {
        this._startSessionTracking();
      }
    },

    _startSessionTracking: function () {
      this.resetLogoutTimer();
      this._attachEventHandlers();
    },

    _attachEventHandlers: function () {
      // Avoid multiple bindings
      if (this._bEventsAttached) {
        return;
      }
      this._bEventsAttached = true;

      // Attach to document (IMPORTANT)
      document.addEventListener("mousemove", this.resetLogoutTimer.bind(this));
      document.addEventListener("keydown", this.resetLogoutTimer.bind(this));
      document.addEventListener("click", this.resetLogoutTimer.bind(this));
      document.addEventListener("touchstart", this.resetLogoutTimer.bind(this));
    },

    resetLogoutTimer: function () {
      var oLoginModel = this.getView().getModel("LoginModel");

      if (!oLoginModel || !oLoginModel.getProperty("/isLoggedIn")) {
        return;
      }

      if (this.logoutTimer) {
        clearTimeout(this.logoutTimer);
      }

      this.logoutTimer = setTimeout(
        this.logoutUser.bind(this),
        this.TIMEOUT_DURATION
      );
    },

    logoutUser: function () {
      var oLoginModel = this.getView().getModel("LoginModel");

      if (!oLoginModel || !oLoginModel.getProperty("/isLoggedIn")) {
        return;
      }

      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;

      oLoginModel.setProperty("/isLoggedIn", false);

      MessageBox.information(
        "Your session has expired due to inactivity. Please log in again to continue.",
        {
          title: "Session Expired",
          actions: [MessageBox.Action.OK],
          emphasizedAction: MessageBox.Action.OK,
          styleClass: "myUnifiedBtn",
          dependentOn: this.getView(),
          onClose: function (sAction) {
            if (sAction === sap.m.MessageBox.Action.OK) {
              window.location.reload(true);
              this.getOwnerComponent().getRouter().navTo("RouteHostel");
            }
          }.bind(this)
        }
      );
    }
  });
});