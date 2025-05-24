sap.ui.define([
     "./BaseController",
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",

   

], function(
    BaseController,
	Controller,
    JSONModel,
    Formatter
    
) {
	"use strict";

	return BaseController.extend("sap.kt.com.minihrsolution.controller.MyAsset", {
             Formatter: Formatter,
                 onInit: function () {
     this.getRouter().getRoute("MyAsset").attachMatched(this._onRouteMatched, this);

      },
      _onRouteMatched:function(){
                   this.ajaxReadWithJQuery("IncomeAsset", "Status=Assigned").then((oData) => {
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                   this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "incomeModel");
                })
      },
       onPressback: function () {
        this.getOwnerComponent().getRouter().navTo("RouteTilePage");
      },

      onLogout: function () {
        var that = this
        that.CommonLogoutFunction();
      },
	});
});