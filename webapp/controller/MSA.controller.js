sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
            onInit: function () {
                this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
            },
            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },
            MSA_AddmsaDetails:function(){
                this.getRouter().navTo("RouteMSADetails");
                
            },
            MSA_EditMsaDetails:function(){
                this.getRouter().navTo("RouteMSAEdit")
            }
            

        });
    });