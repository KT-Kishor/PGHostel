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
			onpressTrainee:function(){
				this.getRouter().navTo("RouteTrainee");
			},
            onPressOffer: function () {
                this.getRouter().navTo("RouteOffer");
            },
            onpresslistofholidays: function () {
                this.getRouter().navTo("RouteListofholidays",{Year:"Listofholidays"})
            },
            onpressIDCARD: function () {
                this.getRouter().navTo("RouteIDCardApplication")
            },
            onpressLeave: function () {
                this.getRouter().navTo("RouteAdminApplyLeave")
            },  
            onpressConsultantInvoice:function(){
                this.getRouter().navTo("RouteConsultantInvoiceApplication")
            },
        });
    });