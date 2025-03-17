sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            T_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            T_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            T_onPressAddTrainee:function(){
           this.getRouter().navTo("RouteTraineeDetails");
            }

         
           
        });
    });