sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminPaySlipDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteAdminPaySlip").attachMatched(this._onRouteMatched, this);
            },
            
            _onRouteMatched:function(oEvent){

            },

            APD_onPressBack: function () {
                this.getRouter().navTo("RouteAdminPaySlip");
            }
        });
    });