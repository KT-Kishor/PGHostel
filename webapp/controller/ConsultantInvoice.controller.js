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
          this.getView().getModel("LoginModel").setProperty("/HeaderName",  this.getView().getModel("i18n").getResourceBundle().getText("consultantInvoice")); 
        },

        CI_onPressAddInvoice: function () {
          this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
            sPath: "X", oPath: "Y",});
        },

        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },
      }
    );
  }
);
