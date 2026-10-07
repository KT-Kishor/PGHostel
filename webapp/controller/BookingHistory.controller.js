sap.ui.define([
	   "./BaseController",
    "sap/ui/model/json/JSONModel",

], function(
	BaseController,
    JSONModel
) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.BookingHistory", {

           onInit: function () {
          
            this.getOwnerComponent().getRouter().getRoute("RouteBookingHistory").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched:async function (oEvent) {
                this.BookingID = decodeURIComponent(
                        oEvent.getParameter("arguments").sPath
                          );
                          this.BranchCode =  oEvent.getParameter("arguments").BranchCode
                const oFilter = {
                BookingID: this.BookingID
            };
            this.getBusyDialog()
       const oResult = await this.ajaxReadWithJQuery("HM_BookingHistory", oFilter);
this.closeBusyDialog();

var aData = oResult.commentData || [];

aData.sort(function (a, b) {
    return new Date(b.Date) - new Date(a.Date);
});

this.getView().setModel(
    new JSONModel(aData),
    "BookingModel"
);

        },
        onNavBack: function () {
               this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(this.BookingID),
                from: "Customerdetails",
                BranchCode: this.BranchCode
            });
        },
        
	});
});