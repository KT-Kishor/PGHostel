sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
  ],
  function (BaseController, MessageBox) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.App", {
      TIMEOUT_DURATION: 15 * 60 * 1000,
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
        // Reset timer on mouse movement, keyboard input, or any interaction
        var oView = this.getView();
        oView.attachBrowserEvent("mousemove", this.resetLogoutTimer, this);
        oView.attachBrowserEvent("keydown", this.resetLogoutTimer, this);
        oView.attachBrowserEvent("touchstart", this.resetLogoutTimer, this);
      },

     resetLogoutTimer: function () {
  var oLoginModel = this.getView().getModel("LoginModel");

  // ⛔ Do nothing if user is not logged in
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

  // ⛔ Do NOT show popup if user is already logged out
  if (!oLoginModel || !oLoginModel.getProperty("/isLoggedIn")) {
    return;
  }

  if (this.logoutTimer) {
    clearTimeout(this.logoutTimer);
  }

  oLoginModel.setData({ isLoggedIn: false });

  MessageBox.information(
    "Your session has expired due to inactivity. Please log in again to continue",
    {
      title: "Session Expired",
      actions: [MessageBox.Action.OK],
      emphasizedAction: MessageBox.Action.OK,
      dependentOn: this.getView(),

      onClose: function () {
        window.location.reload(true);
        this.getOwnerComponent().getRouter().navTo("RouteHostel");
      }.bind(this)
    }
  );
},

    });
  }
);
