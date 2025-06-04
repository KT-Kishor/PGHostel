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
          this._fetchCommonData("ManageCustomer", "ManageCustomerModel");
          this._fetchCommonData("CompanyInvoice", "CompanyInvoiceFilterModel");
        },

        CompanyInvoice_onSearch: async function () {
          try {
            this.getBusyDialog();

            const filterItems = this.byId("CI_id_InvoiceFilterBar").getFilterGroupItems();
            const params = {};

            filterItems.forEach((item) => {
              const control = item.getControl();
              const key = item.getName();

              if (control && typeof control.getValue === "function") {
                const value = control.getValue().trim();

                if (key === "InvoiceDate" && value.includes("-")) {
                  const [start, end] = value.split("-").map(date =>
                    date.trim().split("/").reverse().join("-")
                  );
                  params.InvoiceStartDate = start;
                  params.InvoiceEndDate = end;
                } else {
                  params[key] = value;
                }
              }
            });

            await this._fetchCommonData("CompanyInvoice", "CompanyInvoiceModel", params);
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

        CI_onPressInvoiceRow: function (oEvent) {
          this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("CompanyInvoiceModel").getObject().InvNo) });
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
