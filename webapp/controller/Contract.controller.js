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
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Contract", {
            onInit: function () {
                this.getRouter().getRoute("RouteContract").attachMatched(this._onRouteMatched, this);
            },
            C_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            C_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            C_onPressAddContract:function(){
           this.getRouter().navTo("RouteContractDetails");
            }

         
           
        });
    });