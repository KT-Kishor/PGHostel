sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
  ], (BaseController,MessageBox) => {
    "use strict";
  
    return BaseController.extend("sap.kt.com.minihrsolution.controller.App", {
      onInit: function () {
        this.getOwnerComponent().getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);    
      },
     
   
  
  
    
    });
  });