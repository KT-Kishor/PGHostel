sap.ui.define([
    "./BaseController","sap/ui/model/json/JSONModel","sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);
            },
            TSA_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            TSA_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },

         
           
        });
    });