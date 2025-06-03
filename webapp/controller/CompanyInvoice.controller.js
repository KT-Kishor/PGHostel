sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
  ],
  function (BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.CompanyInvoice",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteCompanyInvoice")
            .attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
          var LoginFUnction = await this.commonLoginFunction("CompanyInvoice");
          if (!LoginFUnction) return;
          this.getView().getModel("LoginModel").setProperty("/HeaderName", "Company Invoice Application");
          await this.CompanyInvoice_onSearch();
          if (!this.getView().getModel("ManageCustomerModel")) await this._fetchCommonData("ManageCustomer","ManageCustomerModel");
          await this._fetchCommonData("CompanyInvoice","CompanyInvoiceFilterModel");
        },

        CompanyInvoice_onSearch: async function () {
          try {
            this.getBusyDialog();
            const aFilterItems = this.byId(
              "CI_id_InvoiceFilterBar"
            ).getFilterGroupItems();
            const params = {};

            aFilterItems.forEach(function (oItem) {
              const oControl = oItem.getControl();
              const sKey = oItem.getName();

              if (oControl && typeof oControl.getValue === "function") {
                const sValue = oControl.getValue().trim();
                if (sValue === "InvoiceDate") {
                  params["InvoiceStartDate"] = oDateFormat.format(new Date(oControl.getValue().split("-")[0]));
                  params["InvoiceEndDate"] = oDateFormat.format(new Date(oControl.getValue().split("-")[1]));
                } else {
                  params[sKey] = sValue;
                }
              }
            });
            await this._fetchCommonData("CompanyInvoice","CompanyInvoiceModel",params);
          } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          } finally {
            this.closeBusyDialog();
          }
        },

        CI_onPressMSASOW: function () { this.getRouter().navTo("RouteMSA"); },

        onPressClear: function () {
          this.byId("CI_id_InvNo").setValue("");
          this.byId("CI_id_InvoiceDatePicker").setValue("");
          this.byId("CI_id_CustomerNameComboBox").setValue("");
          this.byId("CI_id_StatusComboBox").setValue("");
        },

        CI_onPressAddInvoice: function () {
          this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: "X" });
        },

        CI_onPressInvoiceRow:function(oEvent){
          this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath:encodeURIComponent(oEvent.getSource().getBindingContext("CompanyInvoiceModel").getObject().InvNo) });
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
