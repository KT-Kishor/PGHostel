sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
  ],
  function (
    BaseController,JSONModel,MessageToast,) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoice",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched:function(oEvent){
          this.getView().getModel("LoginModel").setProperty("/HeaderName", "Consultant Invoice Application"); 
        },

        CI_onPressAddInvoice: function () {
          this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
            sPath: "X", oPath: "Y",});
        },

        onPressback: function () {
          this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
        },
      }
    );
  }
);
