sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel","sap/m/MessageToast",],
    function (BaseController, JSONModel, MessageToast,) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            Ov_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            Ov_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            Ov_onPressAddEmployee:function(){
           this.getRouter().navTo("RouteEmployeeOfferDetails");
            }

         
           
        });
    });