sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
  ],
  (Controller, MessageToast, JSONModel, MessageBox, BusyIndicator) => {
    "use strict";
    return Controller.extend(
      "sap.kt.com.minihrsolution.controller.SchemeUpload",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteSchemeUpload")
            .attachMatched(this._RouteAppVisibility, this);
          this.oEditModel = new JSONModel({
            isModelEditable: false,
            isVariantEditable: false,
            isTransmissionEditable: false,
          });
          this.getView().setModel(this.oEditModel, "editableModel");
        },
        _RouteAppVisibility: function () {
          BusyIndicator.hide();
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button

          this.onRefreshApplication("QuotationScheme");
          this.API = "https://rest.shahportal.in";
          this.loginModel = this.getView().getModel("UserDetails");
          this.MainModel = new JSONModel({
            items: [], // Store table data
          });
          this.getOwnerComponent().setModel(this.MainModel, "MainModel");
          this.onSearch();
          this.CommonCompanyDetails();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model
          this._makeDatePickersReadOnly([
            "idCompanyCode",
            "idCompanyCodeComboBox",
            "idModelComboBox",
            "idVariant1",
            "idTransmission1",
          ]);
          this.getView()
            .getModel("LoginModel")
            .setProperty("/HeaderName", "Scheme Upload");
        },
        onUploadpress: function () {
          if (!this.oDialog) {
            this.oDialog = sap.ui.xmlfragment(
              "sap.kt.com.minihrsolution.fragment.Uploadscheme",
              this
            );
            this.getView().addDependent(this.oDialog);
          }

          this.oDialog.open();
        },

        onCreateDialogCancel: function () {
          this.oDialog.close();
        },

        onSignout: function () {
          this.navigateLoginPage();
        },
      }
    );
  }
);
