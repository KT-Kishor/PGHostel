sap.ui.define(
  [
    "./BaseController", //import base controller
  ],
  function (BaseController,) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.HrQuotation", {

      onInit: function () {
        this.getRouter().getRoute("RouteHrQuotation").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: async function () {
        var LoginFunction = await this.commonLoginFunction("HrQuotation");
        if (!LoginFunction) return;
        this.getBusyDialog()
        await this._fetchCommonData("Quotation", "CompanyQuotationModel", {});
        this.closeBusyDialog()
      },


      HQ_onPressAddQuotation: function () {
        this.getRouter().navTo("RouteHrQuotationDetails")
      },

      // Function to navigate back to the TileAdminView route
      onPressback: function () {
        this.getRouter().navTo("RouteTilePage"); // Navigate to RouteTileAdminView
      },

      onLogout: function () {
        this.CommonLogoutFunction();
      },

      HQ_onPressBack: function () {
        this.navigateToRouteView1(); // Navigate to RouteView1 and clear user ID and Name
      },

      CommonReadcall: function (sPath, oModel, oParameters) {

      },
      HQ_onPressQuotation: function (oEvent) {

      }
    });
  });