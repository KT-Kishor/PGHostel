sap.ui.define([
      "./BaseController", 
    "../utils/validation"
], (BaseController, utils) => {
    "use strict";
     return BaseController.extend("sap.kt.com.minihrsolution.controller.MyInbox" ,{
        onInit() {
           
        },
        MI_onPressBack:function(){
          this.getRouter().navTo("RouteTilePage");
        },
        MI_onPressSignOut:function(){
          this.getRouter().navTo("RouteLoginPage");
        }
     })
})