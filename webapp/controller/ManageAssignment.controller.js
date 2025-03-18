sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageAssignment", {
            onInit: function () {
                this.getRouter().getRoute("RouteManageAssignment").attachMatched(this._onRouteMatched, this);
            },
            MT_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            MT_onPressBack: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            MA_onCreateTask:function(){
           this.getRouter().navTo("RouteAssignTask");
            }

         
           
        });
    });