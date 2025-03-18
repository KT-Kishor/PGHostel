sap.ui.define([
    "./BaseController", 
],function(BaseController){
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeDetails",{
        onInit: function () {
           
        },
        ED_onPressBack:function(){
            this.getRouter().navTo("RouteTilePage");
        },
        ED_onPressSignOut:function(){
            this.getRouter().navTo("RouteLoginPage");
        }
    })
})