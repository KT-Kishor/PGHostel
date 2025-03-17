sap.ui.define([
    "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            T_onSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            T_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            T_onPressAddTrainee:function(){
           this.getRouter().navTo("RouteTraineeDetails");
            }

         
           
        });
    });