sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (
	BaseController,
	JSONModel
) {
	"use strict";

	return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrderObject", {
		onInit: function () {
			this.getOwnerComponent().getRouter().getRoute("PurchaseOrderObject").attachMatched(this._onRouteMatched, this);
		},
		_onRouteMatched: async function (oEvent) {
			this.PoNumber = oEvent.getParameter("arguments").sPath;
			  await this.ajaxReadWithJQuery("PurchaseOrderItems",{PoNumber: this.PoNumber}).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "objectModel");
            });
		},
		PO_onButtonPress: function () {
			this.getRouter().navTo("PurchaseOrder");

		}
	});
});