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
          // var that = this;
          // that.commonLoginFunction("HrQuotation");
          // var oModel = that.getOwnerComponent().getModel(); // Get the model from the component
          // oModel.read("/Quotation", {
          //   success: function (oData) {
          //     sap.ui.core.BusyIndicator.hide(); // Hide the busy indicator once data is retrieved
          //     var oQuotationModel = new sap.ui.model.json.JSONModel({ Quotation: oData.results });
          //     that.getView().setModel(oQuotationModel);
          //     var oSmartTable = that.getView().byId("idQuotationItemTable");
          //     oSmartTable.setModel(oQuotationModel);
          //   },
          //   error: function (oError) {
          //     sap.ui.core.BusyIndicator.hide(); // Hide the busy indicator in case of an error
          //     sap.m.MessageBox.error("Error retrieving data.");
          //   }
          // });
        },
  
        
        HQ_onPressAddQuotation: function () {
          this.getRouter().navTo("RouteHrQuotationDetails")
        },
  
        HQ_onPressQuotation: function (oEvent) {
          var oPath = oEvent.getSource().getBindingContext().getProperty("QuotationNo");
          this.getRouter().navTo("RouteHrQuotationDetails", { sPath: encodeURIComponent(oPath) })
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