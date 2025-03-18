sap.ui.define([
    "./BaseController","sap/ui/model/json/JSONModel","sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Timesheet", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheet").attachMatched(this._onRouteMatched, this);
            },
            TS_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            TS_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            TS_onFillDetails:function(){
           this.getRouter().navTo("RouteTimesheetDetails");
            }

         
           
        });
    });