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
        return BaseController.extend("sap.kt.com.minihrsolution.controller.LoginPage", {
            onInit: function () {
                var model = new JSONModel({
                    HeaderName: "",
                });
                this.getOwnerComponent().setModel(model,"LoginModel");
                this.getRouter().getRoute("RouteLoginPage").attachMatched(this._onRouteMatched, this);
            },
            onpresshome: function () {
                this.getRouter().navTo("RouteTilePage");
            },

           
        });
    });