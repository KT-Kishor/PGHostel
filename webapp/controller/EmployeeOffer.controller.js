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
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            Ov_onSignout: function () {
                this.getRouter().navTo("RouteLogin");
            },
            Ov_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            Ov_onPressAddEmployee:function(){
           this.getRouter().navTo("RouteEmployeeOfferDetails");
            }

         
           
        });
    });