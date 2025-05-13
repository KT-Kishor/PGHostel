sap.ui.define(
    [
      "./BaseController", //import base controller
    ],
    function (BaseController,) {
      "use strict";
  
      return BaseController.extend("sap.kt.com.minihrsolution.controller.HrQuotation", {
  
        onInit: function () {
          this.getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);
        },
  
        _onRouteMatched: function () {
        
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
      });
    });