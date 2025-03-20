sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Contract", {
            onInit: function () {
                this.getRouter().getRoute("RouteContract").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Contract Details");
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            C_onPressAddContract: function () {
                this.getRouter().navTo("RouteContractDetails");
            }



        });
    });