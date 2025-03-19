sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlip", {
            onInit: function () {
                this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched:function(oEvent){
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Generate Pay Slip"); 
            },

            AP_onPressAddPayslip: function () {
                this.getRouter().navTo("RouteNavAdminPaySlipApp");
            },

            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },
      
            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },
        });
    });