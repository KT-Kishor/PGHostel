sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Timesheet Approval");
            },
            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },



        });
    });