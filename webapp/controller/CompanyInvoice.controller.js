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
            CI_onPressAddInvoice: function () {
                this.getRouter().navTo("RouteCompanyInvoiceDetails",
                    { sPath: "X" });
            },
            CI_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            CI_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
        });
    });