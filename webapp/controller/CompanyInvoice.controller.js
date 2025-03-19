sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.CompanyInvoice", {
            onInit: function () {
                this.getRouter().getRoute("RouteCompanyInvoice").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Company Invoice Application"); 
            },

            CI_onPressAddInvoice: function () {
                this.getRouter().navTo("RouteCompanyInvoiceDetails",
                    { sPath: "X" });
            },

            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },
      
            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },
        });
    });