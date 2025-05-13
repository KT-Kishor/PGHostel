sap.ui.define([
    "./BaseController",
        "../model/formatter",

], function(
	BaseController,
  Formatter
) {
	"use strict";

	return BaseController.extend("sap.kt.com.minihrsolution.controller.AssetObjectPage", {
            Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("AssetObjectPage").attachMatched(this._onRouteMatched, this);     
           },
        _onRouteMatched:function(oEvent){
            this.Slno = oEvent.getParameter("arguments").sPath;
             this._fetchCommonData("IncomeAsset", "objectModel", {
                SerialNumber: this.Slno,    
            });

        },
        AOP_onButtonPress:function(){
            var onav=this.getOwnerComponent().getRouter()
             onav.navTo("RouteIncomeAsset")
        }
	});
});