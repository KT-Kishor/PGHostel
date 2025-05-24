sap.ui.define(
  [
    "./BaseController", //import base controller
    "../model/formatter",
    "sap/m/MessageBox",
  ],
  function (BaseController, Formatter, MessageBox) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.HrQuotation", {
      Formatter: Formatter,
      onInit: function () {
        this.getRouter().getRoute("RouteHrQuotation").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: async function () {
        var LoginFunction = await this.commonLoginFunction("HrQuotation");
        if (!LoginFunction) return;
        this.getBusyDialog()
        // this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("pageTitleemployee"));
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        await this._fetchCommonData("Quotation", "CompanyQuotationModel", {});

        if (this.oValue === "HrQuotation") {

          this.HQ_onClearFilters();
        } else {

        }
        this.closeBusyDialog();
      },
      HQ_onSearch: function () {
        var aFilterItems = this.byId("HQ_id_QuotationFilterBar").getFilterGroupItems();
        var aFilters = [];

        aFilterItems.forEach(function (oItem) {
          var oControl = oItem.getControl();
          var sName = oItem.getName();
          var sValue = oControl && oControl.getValue();

          if (sValue) {
            aFilters.push(new sap.ui.model.Filter(sName, sap.ui.model.FilterOperator.Contains, sValue));
          }
        });

        var oTable = this.byId("HQ_id_QuotationItemTable");
        var oBinding = oTable.getBinding("items");

        if (oBinding) {
          this.getBusyDialog(); // Show BusyDialog
          oBinding.filter(aFilters);

          // Close BusyDialog after table is updated
          oTable.attachEventOnce("updateFinished", function () {
            this.closeBusyDialog();
          }.bind(this));
        }
      },

      HQ_onClearFilters: function () {
        var oFilterBar = this.getView().byId("HQ_id_QuotationFilterBar");
        oFilterBar.getFilterGroupItems().forEach(function (oItem) {
          var oControl = oItem.getControl();
          if (oControl.setSelectedKey) {
            oControl.setSelectedKey("");
          } else if (oControl.setValue) {
            oControl.setValue("");
          }
        });
      },

      HQ_onPressAddQuotation: function () {
        this.getRouter().navTo("RouteHrQuotationDetails", { sQuotationNo: "new" })
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
        var oContext = oEvent.getSource().getBindingContext("CompanyQuotationModel");
        var oData = oContext.getObject(); // get full object
        var sQuotationNo = oData.QuotationNo; // extract actual QuotationNo

        this.getRouter().navTo("RouteHrQuotationDetails", {
          sQuotationNo: encodeURIComponent(sQuotationNo)
        });
      }



    });
  });