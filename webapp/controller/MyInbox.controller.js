sap.ui.define([
  "./BaseController",
  "../utils/validation"
], (BaseController, utils) => {
  "use strict";
  return BaseController.extend("sap.kt.com.minihrsolution.controller.MyInbox", {
    onInit() {
      this.getRouter().getRoute("RouteMyInbox").attachMatched(this._onRouteMatched, this);
    },
    _onRouteMatched: function () {
      this.getView().getModel("LoginModel").setProperty("/HeaderName", "Inbox Details");

    },
    onPressback: function () {
      this.getRouter().navTo("RouteTilePage");
    },
    onLogout: function () {
      this.getRouter().navTo("RouteLoginPage");
    },
  })
})