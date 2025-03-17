sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TilePage", {
            onInit: function () {
                this.getRouter().getRoute("RouteTilePage").attachMatched(this._onRouteMatched, this);
            },
			TileV_onpressTrainee:function(){
				this.getRouter().navTo("RouteTrainee");
			},
            TileV_onPressOffer: function () {
                this.getRouter().navTo("RouteEmployeeOffer");
            },
            TileV_onpresslistofholidays: function () {
                this.getRouter().navTo("RouteListofholidays",{Year:"Listofholidays"})
            },
            TileV_onpressIDCARD: function () {
                this.getRouter().navTo("RouteIDCardApplication")
            },
            TileV_onpressLeave: function () {
                this.getRouter().navTo("RouteAdminApplyLeave")
            },  
            TileV_onpressConsultantInvoice:function(){
                this.getRouter().navTo("RouteConsultantInvoiceApplication")
            },
            TileV_onpressContract: function () {
                this.getRouter().navTo("RouteContract")
            },
            TileV_onPressAdminPaySlip: function () {
                this.getRouter().navTo("RouteAdminPaySlip");
            },
            TileV_onpressSelfservice: function () {
                this.getRouter().navTo("RouteSelfService");
            },
            TileV_onpressInbox: function(){
                this.getRouter().navTo("RouteMyInbox",{sMyInBox:"MyInboxView"});
            },
            TileV_onpressInvoiceApp: function () {
                this.getRouter().navTo("RouteCompanyInvoice",{sPath:"Invoice"});
            },
            TileV_onpressQuotation: function () {
                this.getRouter().navTo("RouteQuotation");
            }
        });
    });