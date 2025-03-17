sap.ui.define([
    "./BaseController","sap/ui/model/json/JSONModel","sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast) {
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