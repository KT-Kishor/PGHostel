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
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoice", {
            onInit: function () {
                this.getRouter().getRoute("RouteConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
              },
              onPressAddInvoice: function () {
                this.getRouter().navTo("RouteNavConsultantInvoiceApplication",
                  { sPath: "X", oPath: "Y" });
              },
        
              onPressInvoice: function (oEvent) {
                var oBindingContext = oEvent.getSource().getBindingContext();
                var oInvoiceNo = oBindingContext.getProperty("InvoiceNo");
                var oEmployeeID = oBindingContext.getProperty("EmployeeID");
        
                this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
                  sPath: encodeURIComponent(oInvoiceNo),
                  oPath: encodeURIComponent(oEmployeeID)
                });
              },
        
              // Function to navigate back to the TileAdminView route
              onBack: function () {
                this.getRouter().navTo("RouteTileAdminView"); // Navigate to RouteTileAdminView
              },
        
              onPressBack: function () {
                this.navigateToRouteView1(); // Navigate to RouteView1 and clear user ID and Name
              }
        });
    });