sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
  ],
  function (
    BaseController,JSONModel,MessageToast,Filter,FilterOperator,MessagePopover,MessageItem
  ) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoice",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
        },
        onPressAddInvoice: function () {
          this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
            sPath: "X", oPath: "Y",});
        },
        CI_onSignout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        CI_onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
      }
    );
  }
);
