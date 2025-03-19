sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageCustomer", {
            onInit: function () {
                this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched:function(oEvent){
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Manage Customer"); 
            },

            onPressback: function () {
                this.getOwnerComponent().getRouter().navTo("RouteTilePage");
            },
      
            onLogout: function () {
                this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
            },
        });
    });