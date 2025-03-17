sap.ui.define(
  [
    "./BaseController",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
    "sap/ui/core/BusyIndicator",
  ],
  (
    Controller,
    Fragment,
    MessageToast,
    Filter,
    FilterOperator,
    formatter,
    BusyIndicator
  ) => {
    "use strict";

    return Controller.extend("project3.controller.MaintainQuotation", {
      formatter: formatter,
      onInit() {
        this.getRouter()
          .getRoute("RouteMaintainQuotation")
          .attachMatched(this._onRouteMatched, this);
        this._makeDatePickersReadOnly([
          "idVehVariant",
          "idCoCodes",
          "idVehModel",
        ]);
      },

      onNavBack: function () {
        BusyIndicator.show(0);
        this.clearQuotationForm();
        this.getRouter().navTo("RouteQuotationDetails");
      },

      _onRouteMatched: function () {
        this.onRefreshApplication("Quotation");
        this.getView().byId("idMainQuotation").setBusy(true);
        var eModel = this.getView().getModel("UserDetails");
        var sRole = eModel.getProperty("/Role");
        var sCompany = eModel.getProperty("/Company");
        if (sRole === "GM") {
          this.CallCompanyCodeDetails(sCompany);
        }
        if (sRole === "CEO" || sRole === "Admin") {
          this.CallCompanyCodeDetails("");
        }
        var oModel = this.getOwnerComponent().getModel("QData");
        var cCode = oModel.getProperty("/CompanyCode");
        var sCompany = oModel.getProperty("/Company");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.scrollToSection("idMainQuotation", "idSectionQuotation");
        this._getCCData(cCode, sCompany);
        var quotationNumber = oModel.getProperty("/QuotationNumber");
        if (quotationNumber === "") {
          this._getDates();
        } else {
          var that = this;
          var cDate = this.getView().byId("idQCreateDate");
          cDate.setValue(
            that.formatter.DateFormatter(oModel.getProperty("/QuotationDate"))
          );
        }
        this._enableSubmit();
        this.byId("idPDFBtn").setEnabled(true);
        BusyIndicator.hide();
      },

      onCompanyCodeChange: function (oEvent) {
        this.getView().byId("idMainQuotation").setBusy(true);
        var that = this;

        var oView = this.getView();
        var oComboBox = oView.byId("idCoCodes");
        var oModel = oView.getModel("QData");
        var sSelectedValue = oComboBox.getValue();
        var aCompanyData = oModel.getProperty("/allCompanyCodeDetails");

        var oSelectedCompany = aCompanyData.find(
          (item) => item.CompanyCode === sSelectedValue
        );
        if (!oSelectedCompany) {
          oComboBox.setValueState("Error");
          oComboBox.setValueStateText(
            this.i18nModel.getText("errInvalidCoCode")
          );
          this._enableSubmit();
          that.getView().byId("idMainQuotation").setBusy(false);
          return;
        }

        var sSelectedKey = oComboBox.getSelectedKey();
        var sCompanyName = "";
        var sCompanyBranch = "";
        var oSelectedItem = oEvent.getParameter("selectedItem");

        if (oSelectedItem) {
          var oContext = oSelectedItem.getBindingContext(
            "allCompanyCodeDetails"
          );
          if (oContext) {
            sCompanyName = oContext.getProperty("Company");
            sCompanyBranch = oContext.getProperty("Branch");
          }
        } else {
          sCompanyName = oSelectedCompany.Company;
          sCompanyBranch = oSelectedCompany.Branch;
        }
        this._getCCData(sSelectedKey, sCompanyName);

        oModel.setProperty("/CompanyCode", sSelectedKey);
        oModel.setProperty("/Company", sCompanyName);
        oModel.setProperty("/Branch", sCompanyBranch);
        oModel.setProperty("/Model", "");

        this.onModelSelectionChange();
        oComboBox.setValueState("None");
        this._enableSubmit();
        BusyIndicator.hide();
      },

      _getDates: function () {
        var that = this;
        var cDate = this.getView().byId("idQCreateDate");
        var oModel = this.getOwnerComponent().getModel("QData");

        var oDate = new Date();
        var lastDay = new Date(oDate.getFullYear(), oDate.getMonth() + 1, 0);
        var sFormattedDate = oDate.toISOString();
        var sFormattedLast =
          lastDay.getFullYear() +
          "-" +
          String(lastDay.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(lastDay.getDate()).padStart(2, "0");

        cDate.setValue(that.formatter.DateFormatter(sFormattedDate));
        oModel.setProperty("/QuotationDate", sFormattedDate);
        oModel.setProperty("/ValidUpto", sFormattedLast);
      },

      CallCompanyCodeDetails: function (value) {
        var oModel = this.getOwnerComponent().getModel("QData");
        var url =
          "https://rest.shahportal.in/CompanyCodeDetails?Company=" + value;
        $.ajax({
          url: url,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
            password:
              "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
          },
          success: function (data) {
            oModel.setProperty("/allCompanyCodeDetails", data.results);
          }.bind(this),
          error: function (err) {},
        });
      },

      _getCCData: function (cCode, sCompany) {
        var oModel = this.getOwnerComponent().getModel("QData");
        var objPage = this.getView().byId("idMainQuotation");
        var that = this;
        try {
          $.ajax({
            url:
              "https://rest.shahportal.in/CompanyCodeDetails?CompanyCode=" +
              cCode,
            headers: {
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: function (data) {
              if (data.results && data.results.length > 0) {
                oModel.setProperty("/CompanyCodeData", data.results[0]);

                $.ajax({
                  url:
                    "https://rest.shahportal.in/CompanyNameFunction?Company=" +
                    sCompany,
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                    password:
                      "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
                  },
                  success: function (data) {
                    var uniqueModels = [
                      ...new Set(
                        data.results.map((item) => item.Model).filter(Boolean)
                      ),
                    ];
                    oModel.setProperty("/ModelList", uniqueModels);
                  },
                  error: function (xhr, status, error) {
                    MessageToast.show(
                      that.i18nModel.getText("msgFailedToFetch")
                    );
                  },
                });

                oModel.refresh(true);
              } else {
                MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
              }
              objPage.setBusy(false);
            },
            error: function (xhr, status, error) {
              MessageToast.show(that.i18nModel.getText("commanMessage"));
              objPage.setBusy(false);
            },
          });
        } catch (e) {
          MessageToast.show(that.i18nModel.getText("commanMessage"));
          objPage.setBusy(false);
        }
      },

      _enableSubmit: function () {
        var oView = this.getView();
        var aFields = [
          oView.byId("idCustomerName"),
          oView.byId("idCustMobile"),
          oView.byId("idCustEmail"),
          oView.byId("idCustAadhar"),
          oView.byId("idCustPanNumber"),
          oView.byId("idCustGSTNo"),
          oView.byId("idCustPinCode"),
          oView.byId("idCustAddress"),
          oView.byId("idVehVariant"),
          oView.byId("idEmpMobile"),
          oView.byId("idCoCodes"),
        ];

        var bAllValid = aFields.every(function (oField) {
          return oField.getValueState() === "None";
        });

        var oModel = this.getOwnerComponent().getModel("QData");
        var bNameNotEmpty = oModel.getProperty("/CustomerName") !== "";
        var bAddressNotEmpty = oModel.getProperty("/CustAddress") !== "";
        var bMobileNotEmpty = oModel.getProperty("/CustMobile") !== "";
        var bPinCodeNotEmpty = oModel.getProperty("/CustPinCode") !== "";
        var bAddressNotEmpty = oModel.getProperty("/CustAddress") !== "";
        var bModelNotEmpty = oModel.getProperty("/Model") !== "";
        var bVariantNotEmpty = oModel.getProperty("/Variant") !== "";
        var bOnRoadNotEmpty = oModel.getProperty("/TotalOnRoad") !== "";

        var bEnableSubmit =
          bAllValid &&
          bNameNotEmpty &&
          bMobileNotEmpty &&
          bPinCodeNotEmpty &&
          bAddressNotEmpty &&
          bModelNotEmpty &&
          bVariantNotEmpty &&
          bOnRoadNotEmpty;

        this.getView()
          .getModel("QData")
          .setProperty("/EnableSubmit", bEnableSubmit);
      },

      onNameChange: function () {
        var data = this.getView().byId("idCustomerName");

        if (!data.getValue()) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errEnterName"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onEmpMobileChange: function () {
        var data = this.getView().byId("idEmpMobile");
        var oReg = /^\d{10}$/;
        var sValue = data.getValue();
        if (sValue.length > 10) {
          sValue = sValue.slice(0, 10);
          data.setValue(sValue);
        }

        if (!data.getValue()) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errEnterCell"));
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errInvalidCell"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onMobileChange: function () {
        var data = this.getView().byId("idCustMobile");
        var oReg = /^\d{10}$/;
        var sValue = data.getValue();
        if (sValue.length > 10) {
          sValue = sValue.slice(0, 10);
          data.setValue(sValue);
        }

        if (!data.getValue()) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errEnterCell"));
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errInvalidCell"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onEmailChange: function () {
        var data = this.getView().byId("idCustEmail");
        var oReg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

        if (!data.getValue()) {
          data.setValueState("None");
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("invalidEmailMsg"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onAadharChange: function (oEvent) {
        var data = this.getView().byId("idCustAadhar");
        var oReg = /^\d{12}$/;
        var sValue = data.getValue();
        if (sValue.length > 12) {
          sValue = sValue.slice(0, 12);
          data.setValue(sValue);
        }

        if (!data.getValue()) {
          data.setValueState("None");
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errorAdharCard"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onPanChange: function (oEvent) {
        var data = this.getView().byId("idCustPanNumber");
        var oReg = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        var sValue = data.getValue();
        if (sValue.length > 10) {
          sValue = sValue.slice(0, 10);
          data.setValue(sValue);
        }

        if (!data.getValue()) {
          data.setValueState("None");
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errInvalidPan"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onGSTChange: function (oEvent) {
        var data = this.getView().byId("idCustGSTNo");
        var oReg = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[Z]{1}[A-Z\d]{1}$/;
        var sValue = data.getValue();
        if (sValue.length > 15) {
          sValue = sValue.slice(0, 15);
          data.setValue(sValue);
        }

        if (!data.getValue()) {
          data.setValueState("None");
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errInvalidGST"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onPinChange: function (oEvent) {
        var data = this.getView().byId("idCustPinCode");
        var oReg = /^\d{6}$/;
        var sValue = data.getValue();
        if (sValue.length > 6) {
          sValue = sValue.slice(0, 6);
          data.setValue(sValue);
        }

        if (!data.getValue()) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errEnterPin"));
        } else if (!oReg.test(data.getValue())) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errInvalidPin"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onAddressChange: function (oEvent) {
        var data = this.getView().byId("idCustAddress");

        if (!data.getValue()) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errorAddress"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onModelSelect: function (oEvent) {
        var variant = this.getView().byId("idVehVariant");
        variant.setBusyIndicatorDelay(0);
        variant.setBusy(true);
        var that = this;
        var oModel = this.getOwnerComponent().getModel("QData");
        oModel.setProperty("/VariantList", null);
        var oComboBox = this.getView().byId("idVehModel");
        var sSelectedValue = oComboBox.getValue();
        var aItems = oModel.getProperty("/ModelList");

        var bValid = aItems.some(function (item) {
          return item === sSelectedValue;
        });
        if (bValid) {
          oComboBox.setValueState("None");
        } else {
          oComboBox.setValueState("Error");
          oComboBox.setValueStateText(this.i18nModel.getText("errEnterModel"));
        }
        this._enableSubmit();

        var selectedModel = oEvent.getSource().getSelectedKey();
        if (!selectedModel) {
          return;
        }

        try {
          $.ajax({
            url: `https://rest.shahportal.in/QuotationScheme?Model=${encodeURIComponent(
              selectedModel
            )}`,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: function (data) {
              variant.setBusy(false);
              oModel.setProperty("/VariantList", data.results);
              that._enableSubmit();
            },
            error: function (xhr, status, error) {
              variant.setBusy(false);
              MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
            },
          });
        } catch (e) {
          variant.setBusy(false);
          MessageToast.show(that.i18nModel.getText("commanMessage"));
        }
      },

      ajaxCallVariant: function () {
        var oModel = this.getOwnerComponent().getModel("QData");
        var sModel = oModel.getProperty("/Model");
        var that = this;

        try {
          BusyIndicator.show(0);
          $.ajax({
            url: `https://rest.shahportal.in/QuotationScheme?Model=${encodeURIComponent(
              sModel
            )}`,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: function (data) {
              BusyIndicator.hide();
              oModel.setProperty("/VariantList", data.results);
              that._enableSubmit();
            },
            error: function (xhr, status, error) {
              BusyIndicator.hide();
              MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
            },
          });
        } catch (e) {
          MessageToast.show(that.i18nModel.getText("commanMessage"));
        }
      },

      onModelSelectionChange: function () {
        var oModel = this.getView().getModel("QData");

        oModel.setProperty("/Variant", "");
        oModel.setProperty("/Transmission", "");
        oModel.setProperty("/Color", "");
        oModel.setProperty("/Fuel", "");
        oModel.setProperty("/BoardPlate", "");
        oModel.setProperty("/Make", "");
        oModel.setProperty("/Emission", "");
        oModel.setProperty("/ExShowroom", "");
        oModel.setProperty("/TCS1Perc", "");
        oModel.setProperty("/ROADTAX", "");
        oModel.setProperty("/AddOnInsurance", "");
        oModel.setProperty("/TempCharges", "");
        oModel.setProperty("/RegHypCharge", "");
        oModel.setProperty("/ShieldOfTrust4YR45K", "");
        oModel.setProperty("/EXTDWarrantyFOR4YR80K", "");
        oModel.setProperty("/STDFittings", "");
        oModel.setProperty("/FastTag", "");
        oModel.setProperty("/VAS", "");
        oModel.setProperty("/RSA", "");
        oModel.setProperty("/DiscountOffers", "");
        oModel.setProperty("/ConsumerScheme", "");
        oModel.setProperty("/ExShowroomAfterScheme", "");
        oModel.setProperty("/TotalOnRoad", "");
      },

      onVariantChange: function (oEvent) {
        var data = this.getView().byId("idVehVariant");

        if (!data.getValue()) {
          data.setValueState("Error");
          data.setValueStateText(this.i18nModel.getText("errEnterVariant"));
        } else {
          data.setValueState("None");
        }
        this._enableSubmit();
      },

      onOpenValueHelpDialog: function () {
        BusyIndicator.show(0);
        var oView = this.getView();

        if (!this._oDialog) {
          Fragment.load({
            id: oView.getId(),
            name: "project3.fragment.QuotationVariant",
            controller: this,
          }).then(
            function (oDialog) {
              this._oDialog = oDialog;
              oView.addDependent(this._oDialog);
              this._oDialog.open();
              BusyIndicator.hide();
            }.bind(this)
          );
        } else {
          this._oDialog.open();
          BusyIndicator.hide();
        }
      },

      onVariantSelect: function (oEvent) {
        var oSelectedItem = oEvent.getSource();
        var oContext = oSelectedItem.getBindingContext("QData").getObject();
        var oModel = this.getOwnerComponent().getModel("QData");

        oModel.setProperty("/Variant", oContext.Variant);
        oModel.setProperty("/Transmission", oContext.Transmission);
        oModel.setProperty("/Fuel", oContext.Fuel);
        oModel.setProperty("/Color", oContext.Color);
        oModel.setProperty("/BoardPlate", oContext.BoardPlate);
        oModel.setProperty("/Emission", oContext.Emission);
        oModel.setProperty("/Make", oContext.Make);
        oModel.setProperty("/ExShowroom", oContext.ExShowroom || 0.0);
        oModel.setProperty("/TCS1Perc", oContext.TCS1Perc || 0.0);
        oModel.setProperty("/ROADTAX", oContext.ROADTAX || 0.0);
        oModel.setProperty("/AddOnInsurance", oContext.AddOnInsurance || 0.0);
        oModel.setProperty("/TempCharges", oContext.TempCharges || 0.0);
        oModel.setProperty("/RegHypCharge", oContext.RegHypCharge || 0.0);
        oModel.setProperty(
          "/ShieldOfTrust4YR45K",
          oContext.ShieldOfTrust4YR45K || 0.0
        );
        oModel.setProperty(
          "/EXTDWarrantyFOR4YR80K",
          oContext.EXTDWarrantyFOR4YR80K || 0.0
        );
        oModel.setProperty("/STDFittings", oContext.STDFittings || 0.0);
        oModel.setProperty("/FastTag", oContext.FastTag || 0.0);
        oModel.setProperty("/VAS", oContext.VAS || 0.0);
        oModel.setProperty("/RSA", oContext.RSA || 0.0);
        oModel.setProperty("/DiscountOffers", oContext.DiscountOffers || 0.0);
        oModel.setProperty("/ConsumerScheme", oContext.ConsumerScheme || 0.0);
        oModel.setProperty(
          "/ExShowroomAfterScheme",
          oContext.ExShowroomAfterScheme || 0.0
        );

        this.getView().byId("idVehVariant").setValueState("None");
        this._calculateOnRoad();
        this._enableSubmit();
        this.onCloseDialog();
      },

      onPriceChange: function (oEvent) {
        var oSource = oEvent.getSource();
        var sValue = oSource.getValue().trim();
        var rawValue = sValue.replace(/,/g, "");

        if (!/^\d*\.?\d*$/.test(rawValue)) {
          rawValue = 0;
        } else {
          rawValue = parseFloat(rawValue);
        }

        if (isNaN(rawValue)) {
          rawValue = 0;
        }
        var formattedValue = rawValue.toFixed(2);
        var sBindingPath = oSource.getBinding("value").getPath();
        var oModel = this.getOwnerComponent().getModel("QData");
        oModel.setProperty(sBindingPath, formattedValue);
        this._calculateOnRoad();
      },

      _calculateOnRoad: function () {
        var oModel = this.getOwnerComponent().getModel("QData");

        var exShowroomAfterScheme =
          (parseFloat(oModel.getProperty("/ExShowroom")) || 0) -
          (parseFloat(oModel.getProperty("/ConsumerScheme")) || 0);

        oModel.setProperty("/ExShowroomAfterScheme", exShowroomAfterScheme);

        var totalOnRoad =
          (parseFloat(oModel.getProperty("/ExShowroomAfterScheme")) || 0) +
          (parseFloat(oModel.getProperty("/TCS1Perc")) || 0) +
          (parseFloat(oModel.getProperty("/ROADTAX")) || 0) +
          (parseFloat(oModel.getProperty("/AddOnInsurance")) || 0) +
          (parseFloat(oModel.getProperty("/RegHypCharge")) || 0) +
          (parseFloat(oModel.getProperty("/ShieldOfTrust4YR45K")) || 0) +
          (parseFloat(oModel.getProperty("/EXTDWarrantyFOR4YR80K")) || 0) +
          (parseFloat(oModel.getProperty("/STDFittings")) || 0) +
          (parseFloat(oModel.getProperty("/FastTag")) || 0) +
          (parseFloat(oModel.getProperty("/VAS")) || 0) +
          (parseFloat(oModel.getProperty("/RSA")) || 0) -
          (parseFloat(oModel.getProperty("/DiscountOffers")) || 0);

        oModel.setProperty("/TotalOnRoad", totalOnRoad);

        oModel.refresh(true);

        this._enableSubmit();
      },

      onSearch: function (oEvent) {
        var sQuery = oEvent.getParameter("newValue");
        if (!sQuery) {
          sQuery = oEvent.getParameter("query");
        }
        var oTable = this.byId("variantTable");
        var oBinding = oTable.getBinding("items");

        var aFilters = [];
        if (sQuery) {
          aFilters = [
            new Filter("Variant", FilterOperator.Contains, sQuery),
            new Filter("Transmission", FilterOperator.Contains, sQuery),
            new Filter("Fuel", FilterOperator.Contains, sQuery),
            new Filter("Color", FilterOperator.Contains, sQuery),
            new Filter("BoardPlate", FilterOperator.Contains, sQuery),
          ];

          var oCombinedFilter = new Filter({
            filters: aFilters,
            and: false,
          });

          oBinding.filter(oCombinedFilter);
        } else {
          oBinding.filter([]);
        }
      },

      onCloseDialog: function () {
        var searchField = this.getView().byId("searchField");
        searchField.setValue("");
        var oTable = this.byId("variantTable");
        var oBinding = oTable.getBinding("items");
        if (oBinding) {
          oBinding.filter([]);
        }
        this._oDialog.close();
      },

      _submitSuccess: function () {
        BusyIndicator.show(0);
        var pdfText = this.i18nModel.getText("btnGeneratePDF");
        var that = this;
        if (!this._oSuccessDialog) {
          this._oSuccessDialog = new sap.m.Dialog({
            title: "Success",
            type: sap.m.DialogType.Message,
            state: "Success",
            content: new sap.m.Text({
              text: "Quotation created successfully.",
            }),
            buttons: [
              new sap.m.Button({
                text: "OK",
                type: "Accept",
                press: function () {
                  that._oSuccessDialog.close();
                  that.onNavBack();
                },
              }),
              new sap.m.Button({
                text: pdfText,
                type: "Reject",
                icon: "sap-icon://pdf-attachment",
                press: function () {
                  that._oSuccessDialog.close();
                  that.onDownloadPDF();
                  that.onNavBack();
                },
              }),
            ],
          });

          this.getView().addDependent(this._oSuccessDialog);
        }

        this._oSuccessDialog.open();
      },

      _getFormData: function () {
        var oModel = this.getOwnerComponent().getModel("QData");
        var that = this;
        return [
          {
            QuotationNumber: oModel.getProperty("/QuotationNumber"),
            QuotationDate: oModel.getProperty("/QuotationDate"),
            CustomerName: oModel.getProperty("/CustomerName"),
            CustAddress: oModel.getProperty("/CustAddress"),
            CustMobile: oModel.getProperty("/CustMobile"),
            CustEmail: oModel.getProperty("/CustEmail"),
            CustAadhar: oModel.getProperty("/CustAadhar"),
            CustPinCode: oModel.getProperty("/CustPinCode"),
            CustPanNumber: oModel.getProperty("/CustPanNumber"),
            CustGSTNo: oModel.getProperty("/CustGSTNo"),
            Model: oModel.getProperty("/Model"),
            Variant: oModel.getProperty("/Variant"),
            Transmission: oModel.getProperty("/Transmission"),
            Color: oModel.getProperty("/Color"),
            Fuel: oModel.getProperty("/Fuel"),
            BoardPlate: oModel.getProperty("/BoardPlate"),
            Make: oModel.getProperty("/Make"),
            Emission: oModel.getProperty("/Emission"),
            ExShowroom: parseFloat(oModel.getProperty("/ExShowroom")).toFixed(
              2
            ),
            TCS1Perc: (
              parseFloat(oModel.getProperty("/TCS1Perc")) || 0
            ).toFixed(2),
            ROADTAX: (parseFloat(oModel.getProperty("/ROADTAX")) || 0).toFixed(
              2
            ),
            AddOnInsurance: (
              parseFloat(oModel.getProperty("/AddOnInsurance")) || 0
            ).toFixed(2),
            TempCharges: (
              parseFloat(oModel.getProperty("/TempCharges")) || 0
            ).toFixed(2),
            RegHypCharge: (
              parseFloat(oModel.getProperty("/RegHypCharge")) || 0
            ).toFixed(2),
            ShieldOfTrust4YR45K: (
              parseFloat(oModel.getProperty("/ShieldOfTrust4YR45K")) || 0
            ).toFixed(2),
            EXTDWarrantyFOR4YR80K: (
              parseFloat(oModel.getProperty("/EXTDWarrantyFOR4YR80K")) || 0
            ).toFixed(2),
            STDFittings: (
              parseFloat(oModel.getProperty("/STDFittings")) || 0
            ).toFixed(2),
            FastTag: (parseFloat(oModel.getProperty("/FastTag")) || 0).toFixed(
              2
            ),
            VAS: (parseFloat(oModel.getProperty("/VAS")) || 0).toFixed(2),
            RSA: (parseFloat(oModel.getProperty("/RSA")) || 0).toFixed(2),
            DiscountOffers: (
              parseFloat(oModel.getProperty("/DiscountOffers")) || 0
            ).toFixed(2),
            ConsumerScheme: (
              parseFloat(oModel.getProperty("/ConsumerScheme")) || 0
            ).toFixed(2),
            ExShowroomAfterScheme: (
              parseFloat(oModel.getProperty("/ExShowroomAfterScheme")) || 0
            ).toFixed(2),
            TotalOnRoad: (
              parseFloat(oModel.getProperty("/TotalOnRoad")) || 0
            ).toFixed(2),
            ValidUpto:
              that.formatter.DateFormatter(oModel.getProperty("/ValidUpto")) ||
              oModel.getProperty("/ValidUpto"),
            QuotationIssuedBy: oModel.getProperty("/QuotationIssuedBy"),
            EmployeeMobile: oModel.getProperty("/EmployeeMobile"),
            Company: oModel.getProperty("/Company"),
            CompanyCode: oModel.getProperty("/CompanyCode"),
            Branch: oModel.getProperty("/Branch"),
            Status: oModel.getProperty("/Status"),
          },
        ];
      },

      _sendAjaxRequest: function (url, type, formData) {
        var oModel = this.getView().getModel("QData");
        var that = this;
        try {
          $.ajax({
            url: url,
            type: type,
            headers: {
              "Content-Type": "application/json",
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            data: JSON.stringify(formData),
            success: function (data) {
              BusyIndicator.hide();
              if (type === "POST") {
                oModel.setProperty("/QuotationNumber", data.QuotationNumber);
                that._submitSuccess();
              }
            },
            error: function (xhr, status, error) {
              BusyIndicator.hide();
              MessageToast.show(
                that.i18nModel.getText("msgSchemeDetailErrorSave")
              );
            },
          });
        } catch (e) {
          MessageToast.show(that.i18nModel.getText("commanMessage"));
        }
      },

      onPressEdit: function () {
        var oModel = this.getOwnerComponent().getModel("QData");
        var eModel = this.getOwnerComponent().getModel("UserDetails");
        var formData = this._getFormData();
        var submit = oModel.getProperty("/EnableSubmit");

        var sRole = eModel.getProperty("/Role");
        var edits = oModel.getProperty("/isEditable");
        var masteredits = oModel.getProperty("/MasterEdit");

        if (sRole === "Admin" || sRole === "GM" || sRole === "CEO") {
          oModel.setProperty("/isEditable", !edits);
          oModel.setProperty("/MasterEdit", !masteredits);
        } else {
          oModel.setProperty("/MasterEdit", !masteredits);
        }

        if (masteredits === true) {
          this._enableSubmit();
          if (submit) {
            BusyIndicator.show(0);
            var qtn = oModel.getProperty("/QuotationNumber");
            var url = `https://rest.shahportal.in/Quotations?QuotationNumber=${encodeURIComponent(
              qtn
            )}`;
            this._sendAjaxRequest(url, "PUT", formData);

            this.byId("idPDFBtn").setEnabled(true);
            oModel.setProperty("/VisibleStatus", false);
          } else {
            this.onVariantChange();
            MessageToast.show(
              this.i18nModel.getText("msgSchemeDetailsMandatory")
            );
            oModel.setProperty("/MasterEdit", masteredits);
            oModel.setProperty("/isEditable", edits);
          }
        } else {
          this.byId("idPDFBtn").setEnabled(false);
          oModel.setProperty("/VisibleStatus", true);
          this.ajaxCallVariant();
        }
      },

      onPressSubmit: function () {
        var address = this.getView()
          .getModel("QData")
          .getProperty("/CustAddress");
        if (
          this.getView().byId("idCustAddress").getValueState() === "None" &&
          address != ""
        ) {
          BusyIndicator.show(0);
          var formData = this._getFormData();
          var url = "https://rest.shahportal.in/Quotations";
          this._sendAjaxRequest(url, "POST", formData);
        } else {
          MessageToast.show(
            this.i18nModel.getText("msgSchemeDetailsMandatory")
          );
        }
      },

      onDownloadPDF: function () {
        var oPage = this.getView().byId("idMaintainQPage");
        oPage.setBusy(true);
        var that = this;
        const oModel = this.getOwnerComponent().getModel("QData");
        const company = oModel.getProperty("/Company");
        const fontStyle = oModel.getProperty("/FontStyle");
        const companyName = oModel.getProperty("/CompanyCodeData/CompanyName");
        const firmName = oModel.getProperty("/CompanyCodeData/FirmName");
        const address = oModel.getProperty("/CompanyCodeData/Address");
        const pin = oModel.getProperty("/CompanyCodeData/Pincode");
        const mobile = oModel.getProperty("/CompanyCodeData/mobile");
        const email = oModel.getProperty("/CompanyCodeData/email");
        const website = oModel.getProperty("/CompanyCodeData/website");
        const gstin = oModel.getProperty("/CompanyCodeData/GSTIN");
        const quotationIssuedBy = oModel.getProperty("/QuotationIssuedBy");
        const employeeMobile = oModel.getProperty("/EmployeeMobile");
        const quotationNumber = oModel.getProperty("/QuotationNumber");
        const quotationDate =
          that.formatter.DateFormatter(oModel.getProperty("/QuotationDate")) ||
          oModel.getProperty("/QuotationDate");
        const customerName = oModel.getProperty("/CustomerName");
        const custAddress = oModel.getProperty("/CustAddress");
        const custPanNumber = oModel.getProperty("/CustPanNumber");
        const custMobile = oModel.getProperty("/CustMobile");
        const custGSTNo = oModel.getProperty("/CustGSTNo");
        const custEmail = oModel.getProperty("/CustEmail");
        const custPinCode = oModel.getProperty("/CustPinCode");
        const custAadhar = oModel.getProperty("/CustAadhar");
        const model = oModel.getProperty("/Model");
        const variant = oModel.getProperty("/Variant");
        const transmission = oModel.getProperty("/Transmission");
        const fuel = oModel.getProperty("/Fuel");
        const colour = oModel.getProperty("/Color");
        const make = oModel.getProperty("/Make");
        const emission = oModel.getProperty("/Emission");
        const exShowroom = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/ExShowroom")
        );
        const tcs1 = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/TCS1Perc")
        );
        const roadTax = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/ROADTAX")
        );
        const addOnInsurance = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/AddOnInsurance")
        );
        const regnHyp = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/RegHypCharge")
        );
        const shieldOfTrust = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/ShieldOfTrust4YR45K")
        );
        const extWarranty = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/EXTDWarrantyFOR4YR80K")
        );
        const stdFitment = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/STDFittings")
        );
        const fastTag = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/FastTag")
        );
        const rsa = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/RSA")
        );
        const vas = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/VAS")
        );
        const discountOffers = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/DiscountOffers")
        );
        const consumerScheme = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/ConsumerScheme")
        );
        const exShowroomAfterScheme = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/ExShowroomAfterScheme")
        );
        const onRoad = that.formatter.IndiaNumberFormatter(
          oModel.getProperty("/TotalOnRoad")
        );
        const city = oModel.getProperty("/CompanyCodeData/City");
        const bankName = oModel.getProperty("/CompanyCodeData/BankName");
        const bankAddress = oModel.getProperty("/CompanyCodeData/BankAddress");
        const accountNo = oModel.getProperty("/CompanyCodeData/AccountNo");
        const ifsc = oModel.getProperty("/CompanyCodeData/IFSCCode");
        const validUpto =
          that.formatter.DateFormatter(oModel.getProperty("/ValidUpto")) ||
          oModel.getProperty("/ValidUpto");
        const mLogo = oModel.getProperty("/MLogo");
        const hLogo1 = oModel.getProperty("/HLogo1");
        const hLogo2 = oModel.getProperty("/HLogo2");
        const hQRCode = oModel.getProperty("/HQRCode");
        const mQRCode = oModel.getProperty("/MQRCode");

        setTimeout(function () {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          doc.setFont(`${fontStyle}`, "bold");

          if (company === "Hyundai") {
            doc.setTextColor(9, 44, 116);
            doc.setDrawColor(9, 44, 116);
            doc.setLineWidth(0.8);
            doc.rect(5, 5, 200, 287);

            doc.addImage(hLogo1, "PNG", 8.5, 13, 32, 31);

            doc.setLineWidth(0.7);
            doc.line(44, 8, 44, 38);

            //(X, Y, Width, Height)
            doc.addImage(hLogo2, "JPG", 48, 9, 68, 8);

            doc.setFontSize(9);
            doc.text(`${firmName}`, 48, 23.5);
            doc.text(`${address}, ${pin}`, 48, 28);
            doc.text(`Cell : ${mobile} - Email : ${email}`, 48, 32.5);
            doc.text(`Website : ${website}`, 48, 37);

            doc.setFontSize(11);
            doc.text(`GSTIN : ${gstin}`, 150, 10);
            doc.setFontSize(10);
            doc.text(`Date : ${quotationDate}`, 170, 38);

            doc.setLineWidth(0.55);
            doc.line(5, 40, 205, 40);

            doc.setFontSize(13);
            doc.text("QUOTATION", 90, 45);

            doc.setFontSize(10);

            doc.text("To.", 15, 52);
            doc.text(`: ${customerName}`, 27, 52);

            doc.text("Address :", 100, 64);
            const wrappedText = doc.splitTextToSize(
              `${custAddress}, ${custPinCode}`,
              80
            );
            const startX = 117,
              startY = 64;
            const lineHeight = 6;
            wrappedText.forEach((line, index) => {
              doc.text(line, startX, startY + index * lineHeight);
            });

            doc.text("No.", 100, 52);
            doc.text(`: ${quotationNumber}`, 115, 52);

            if (custPanNumber !== "") {
              doc.line(144, 54.5, 144, 59);
              doc.text("PAN", 146, 58);
              doc.text(`: ${custPanNumber}`, 154, 58);
            }

            doc.text("GSTIN", 15, 64);
            doc.text(`: ${custGSTNo}`, 27, 64);

            doc.text("Aadhar", 100, 58);
            doc.text(`: ${custAadhar}`, 115, 58);

            doc.text("Cell", 15, 58);
            doc.text(`: ${custMobile}`, 27, 58);

            doc.text("Email", 15, 70);
            doc.text(`: ${custEmail}`, 27, 70);

            doc.line(5, 74, 205, 74);

            doc.text("Dear Sir,", 15, 79);
            doc.text(
              "With reference to your enquiry. We are please to submit our Quotation as under :",
              33,
              83
            );

            doc.setLineWidth(0.45);
            doc.rect(15, 86, 180, 24);
            doc.line(15, 94, 195, 94);
            doc.line(15, 102, 195, 102);
            doc.line(115, 86, 115, 110);
            doc.setFontSize(10.5);

            doc.text(`Model : ${model}`, 17, 91.5);
            doc.text(`Colour : ${colour}`, 17, 107.5);
            doc.text(`Variants : ${variant}`, 17, 99.5);
            doc.text(`Make : ${make}`, 117, 107.5);
            doc.text(`Transmission : ${transmission}`, 117, 91.5);
            doc.text(`Fuel : ${fuel}, ${emission}`, 117, 99.5);

            doc.rect(15, 111, 180, 100);
            for (let i = 0; i < 13; i++) {
              doc.line(15, 7 * i + 119, 195, 7 * i + 119);
            }

            doc.text("Ex-Showroom", 19, 116.5);
            doc.text(`${exShowroom}`, 117, 116.5);

            doc.setFontSize(10);
            doc.text("TCS 1%", 19, 124);
            doc.text(`${tcs1}`, 117, 124);

            doc.text("Add on insurance", 19, 131);
            doc.text(`${addOnInsurance}`, 117, 131);

            doc.text("Road Tax", 19, 138);
            doc.text(`${roadTax}`, 117, 138);

            doc.text("Regn. + Hyp.", 19, 145);
            doc.text(`${regnHyp}`, 117, 145);

            doc.text("Fast Tag", 19, 152);
            doc.text(`${fastTag}`, 117, 152);

            doc.text("Std. Fitment / Accessories", 19, 159);
            doc.text(`${stdFitment}`, 117, 159);

            doc.text("Shield of Trust", 19, 166);
            doc.text(`${shieldOfTrust}`, 117, 166);

            doc.text("Extended warranty", 19, 173);
            doc.text(`${extWarranty}`, 117, 173);

            doc.text("VAS", 19, 180);
            doc.text(`${vas}`, 117, 180);

            doc.text("RSA", 19, 187);
            doc.text(`${rsa}`, 117, 187);

            doc.text("Scheme Discount", 19, 194);
            doc.text(`${consumerScheme}`, 117, 194);

            doc.text("Discount Offers", 19, 201);
            doc.text(`${discountOffers}`, 117, 201);

            doc.setFontSize(12);
            doc.text("Total on Road Price", 19, 208.5);
            doc.text(`${onRoad}`, 117, 208.5);

            doc.line(70, 111, 70, 211);
            doc.line(115, 111, 115, 211);
            doc.rect(15, 212, 180, 7);

            doc.setFontSize(10);
            var ddtext = `Please issue a Demand Draft in favour of ${firmName}`;
            const text1Width = doc.getTextWidth(ddtext);
            doc.text(ddtext, 105 - text1Width / 2, 216.8);

            doc.rect(15, 220, 61, 40);

            doc.setFontSize(10.5);
            for (let i = 0; i < 2; i++) {
              doc.text("RTGS & NEFT:", 17 + i * 0.1, 226 + i * 0.1);
              const wrappedText = doc.splitTextToSize(`${firmName}`, 60);
              const startX = 17,
                startY = 231;
              const lineHeight = 4;
              wrappedText.forEach((line, index) => {
                doc.text(
                  line,
                  startX + i * 0.1,
                  startY + index * lineHeight + i * 0.1
                );
              });
            }

            doc.setFontSize(10);
            doc.text(`${bankName}`, 17, 241);
            doc.text(`${bankAddress}`, 17, 246);
            doc.text(`Cash Credit A/c. No. ${accountNo}`, 17, 251);
            doc.text(`IFSC Code : ${ifsc}`, 17, 256);

            doc.setFontSize(11);
            for (let i = 0; i < 2; i++) {
              doc.text("SCAN & PAY", 84 + i * 0.1, 224 + i * 0.1);
            }

            // (X, Y, Width, Height)
            doc.addImage(hQRCode, "JPG", 78, 226, 35, 35);

            doc.setLineWidth(0.3);
            doc.line(115, 219, 115, 261);

            doc.text("NOTE :", 116, 224);

            doc.setFontSize(8.5);
            doc.text(
              "1) I have read understood & accepted all the terms",
              116,
              229
            );
            doc.text("& conditions as mentioned overleaf.", 116, 233);

            doc.text(
              "2) Price subject to matter at the time of Delivery.",
              116,
              239
            );

            doc.text(
              "3) PAN & AADHAR Linkage is mandatory by Income",
              116,
              245
            );
            doc.text(
              "Tax Act & If on Linkage of same will affect upto",
              116,
              249
            );
            doc.text("5% as TCS in place of 1%", 116, 253);

            doc.text("", 116, 248);
            doc.text("", 116, 252);

            doc.setFontSize(9.5);
            doc.text(`Valid upto : ${validUpto}`, 116, 260);

            doc.setFontSize(11);
            doc.text("CUSTOMER'S SIGN.", 22, 278);
            doc.text("EXECUTIVE SIGN.", 88, 278);
            doc.text("MANAGER SIGN.", 152, 278);

            doc.setLineWidth(0.5);
            doc.rect(15, 280, 180, 10);

            doc.setFontSize(11);
            doc.text(`Quotation Issued by : ${quotationIssuedBy}`, 22, 286.5);
            doc.text(`Cell : ${employeeMobile}`, 140, 286.5);
          } else {
            doc.setLineWidth(0.8);
            doc.rect(5, 5, 200, 287);

            //(X, Y, Width, Height)
            doc.addImage(mLogo, "PNG", 8.5, 10, 32, 33);

            doc.setLineWidth(0.7);
            doc.line(44, 8, 44, 38);

            doc.setFontSize(23);
            doc.text(companyName, 48, 16);

            doc.setFontSize(9.4);
            const wrappedText2 = doc.splitTextToSize(`${address}, ${pin}`, 100);
            const startX2 = 48,
              startY2 = 23;
            const lineHeight2 = 4.8;
            wrappedText2.forEach((line, index) => {
              doc.text(line, startX2, startY2 + index * lineHeight2);
            });
            doc.text(`Cell : ${mobile}`, 48, 32.5);
            doc.text(`Email : ${email}`, 48, 37);

            doc.setFontSize(11);
            doc.text(`GSTIN : ${gstin}`, 150, 10);
            doc.setFontSize(10);
            doc.text(`Date : ${quotationDate}`, 170, 38);

            doc.setLineWidth(0.55);
            doc.line(5, 40, 205, 40);

            doc.setFontSize(13);
            doc.text("PERFORMA INVOICE", 80, 45);

            doc.setFontSize(10);

            doc.text("To.", 15, 52);
            doc.text(`: ${customerName}`, 27, 52);

            doc.text("Address :", 100, 64);
            const wrappedText = doc.splitTextToSize(
              `${custAddress}, ${custPinCode}`,
              80
            );
            const startX = 117,
              startY = 64;
            const lineHeight = 6;
            wrappedText.forEach((line, index) => {
              doc.text(line, startX, startY + index * lineHeight);
            });

            doc.text("No.", 100, 52);
            doc.text(`: ${quotationNumber}`, 115, 52);

            if (custPanNumber !== "") {
              doc.line(144, 54.5, 144, 59);
              doc.text("PAN", 146, 58);
              doc.text(`: ${custPanNumber}`, 154, 58);
            }

            doc.text("GSTIN", 15, 64);
            doc.text(`: ${custGSTNo}`, 27, 64);

            doc.text("Aadhar", 100, 58);
            doc.text(`: ${custAadhar}`, 115, 58);

            doc.text("Cell", 15, 58);
            doc.text(`: ${custMobile}`, 27, 58);

            doc.text("Email", 15, 70);
            doc.text(`: ${custEmail}`, 27, 70);

            doc.line(5, 74, 205, 74);

            doc.text("Dear Sir,", 15, 79);
            doc.text(
              "With reference to your enquiry. We are please to submit our Performa Invoice as under :",
              33,
              83
            );

            doc.setLineWidth(0.45);
            doc.rect(15, 86, 180, 24);
            doc.line(15, 94, 195, 94);
            doc.line(15, 102, 195, 102);
            doc.line(130, 86, 130, 110);

            doc.setFontSize(10.5);
            doc.text(`Model : ${model}`, 17, 91.5);
            doc.text(`Colour : ${colour}`, 17, 107.5);
            doc.text(`Variants : ${variant}`, 17, 99.5);
            doc.text(`Make : ${make}`, 132, 107.5);
            doc.text(`Transmission : ${transmission}`, 132, 91.5);
            doc.text(`Fuel : ${fuel}`, 132, 99.5);

            doc.rect(15, 111, 180, 100);
            for (let i = 0; i < 13; i++) {
              doc.line(15, 7 * i + 119, 195, 7 * i + 119);
            }

            doc.text("Ex-Showroom", 19, 116.5);
            doc.text(`${exShowroom}`, 132, 116.5);

            doc.setFontSize(10);
            doc.text("Scheme Discount", 19, 124);
            doc.text(`${consumerScheme}`, 132, 124);

            doc.text("Ex-Showroom after Discount", 19, 131);
            doc.text(`${exShowroomAfterScheme}`, 132, 131);

            doc.text("TCS 1%", 19, 138);
            doc.text(`${tcs1}`, 132, 138);

            doc.text("Insurance", 19, 145);
            doc.text(`${addOnInsurance}`, 132, 145);

            doc.text("Road Tax", 19, 152);
            doc.text(`${roadTax}`, 132, 152);

            doc.text("Regn. + Hyp.", 19, 159);
            doc.text(`${regnHyp}`, 132, 159);

            doc.text("Fast Tag", 19, 166);
            doc.text(`${fastTag}`, 132, 166);

            doc.text("Accessories", 19, 173);
            doc.text(`${stdFitment}`, 132, 173);

            doc.text("Shield", 19, 180);
            doc.text(`${shieldOfTrust}`, 132, 180);

            doc.text("VAS", 19, 187);
            doc.text(`${vas}`, 132, 187);

            doc.text("RSA", 19, 194);
            doc.text(`${rsa}`, 132, 194);

            doc.text("Discount Offers", 19, 201);
            doc.text(`${discountOffers}`, 132, 201);

            doc.setFontSize(12);
            doc.text("Total on Road Price", 19, 208.5);
            doc.text(`${onRoad}`, 132, 208.5);

            doc.line(130, 111, 130, 211);
            doc.rect(15, 212, 180, 7);

            doc.setFontSize(10);
            var ddtext = `Please issue a Demand Draft / Cheque favouring ${firmName}`;
            const text1Width = doc.getTextWidth(ddtext);
            doc.text(ddtext, 105 - text1Width / 2, 216.8);

            doc.rect(15, 220, 61, 40);

            doc.setFontSize(10.5);
            for (let i = 0; i < 2; i++) {
              doc.text("RTGS & NEFT:", 17 + i * 0.1, 228 + i * 0.1);
              doc.text(`${companyName}`, 17 + i * 0.1, 233 + i * 0.1);
            }

            doc.setFontSize(10);
            doc.text(`${bankName}`, 17, 239);
            doc.text(`${bankAddress}`, 17, 244);
            doc.text(`Cash Credit A/c. No. ${accountNo}`, 17, 249);
            doc.text(`IFSC Code : ${ifsc}`, 17, 254);

            doc.setFontSize(11);
            for (let i = 0; i < 2; i++) {
              doc.text("SCAN & PAY", 84 + i * 0.1, 224 + i * 0.1);
            }

            // (X, Y, Width, Height)
            doc.addImage(mQRCode, "JPG", 78, 226, 35, 35);

            doc.setLineWidth(0.3);
            doc.line(115, 219, 115, 261);

            doc.text("NOTE :", 116, 225);

            doc.setFontSize(9);
            doc.text("1) I have read understood &", 116, 231);
            doc.text("accepted all the terms &", 116, 235);
            doc.text("conditions as mentioned", 116, 239);
            doc.text("overleaf.", 116, 243);

            doc.text("2) Price subject to matter at", 116, 249);
            doc.text("the time of Delivery.", 116, 253);

            doc.setFontSize(9.5);
            doc.text(`Valid upto : ${validUpto}`, 116, 260);

            doc.line(160, 219, 160, 256);

            doc.setFontSize(10);
            doc.text(`For ${companyName}`, 162, 224);

            doc.setFontSize(11);
            doc.text("CUSTOMER'S SIGN.", 22, 278);
            doc.text("EXECUTIVE SIGN.", 88, 278);
            doc.text("MANAGER SIGN.", 152, 278);

            doc.setLineWidth(0.5);
            doc.rect(15, 280, 180, 10);

            doc.setFontSize(11);
            doc.text(`Issued by : ${quotationIssuedBy}`, 22, 286.5);
            doc.text(`Cell : ${employeeMobile}`, 140, 286.5);
          }

          doc.addPage();
          if (company === "Hyundai") {
            doc.setTextColor(9, 44, 116);
            doc.setDrawColor(9, 44, 116);

            doc.setLineWidth(0.6);
            doc.rect(20, 25, 170, 215);

            const text1 = `Detailed Noticed Condition on the`;
            const text2 = `Quotation Issued by ${companyName}`;

            const text1Width = doc.getTextWidth(text1);
            const text2Width = doc.getTextWidth(text2);

            const xPosition1 = (205 - text1Width) / 2;
            const xPosition2 = (205 - text2Width) / 2;
            doc.setFontSize(12);
            doc.text(text1, xPosition1, 32);
            doc.text(text2, xPosition2, 37);

            doc.setFontSize(10.5);
            doc.text("1.", 26, 50);
            doc.text(
              "Quotation contains price of particular type of Vehicle on a particular date and does not",
              32,
              50
            );
            doc.text(
              "in any way indicate the availability of the vehicle.",
              32,
              55
            );

            doc.text("2.", 26, 65);
            doc.text(
              "Enquires regarding availability of the vehicle should be made before taking out draft",
              32,
              65
            );
            doc.text("for payment from Bank/Financial Institutions.", 32, 70);

            doc.text("3.", 26, 80);
            doc.text("Terms of delivery cash / demand draft only", 32, 80);

            doc.text("4.", 26, 90);
            doc.text(
              "Price is subject to change at any time without prior notice and such the actual price to",
              32,
              90
            );
            doc.text(
              "be charged in the bill will be that prevailing on the date os delivery of the vehicle ",
              32,
              95
            );
            doc.text(
              "irrespective of when the payment is made or accepted by us.",
              32,
              100
            );

            doc.text("5.", 26, 110);
            doc.text(
              "If the delivery of vehicle is not taken by the customer within 30 days 8% interest will",
              32,
              110
            );
            doc.text(
              "be payable by the customer from 31 day till the date of delivery.",
              32,
              115
            );

            doc.text("6.", 26, 125);
            doc.text(
              "Delivery subject to availability and delivery period is within engagement and subject",
              32,
              125
            );
            doc.text(
              "to change without notice. Delivery schedule shall be subject to delay due to strike,",
              32,
              130
            );
            doc.text(
              "lockout, Act of God, war epidemic and or any other unforeseen circumstance which",
              32,
              135
            );
            doc.text("are beyond our control.", 32, 140);

            doc.text("7.", 26, 150);
            doc.text(
              "In case of cancellation no interest will be payable",
              32,
              150
            );

            doc.text("8.", 26, 160);
            doc.text("Cancellation of Booking Charge Rs. 500/-", 32, 160);

            doc.text("9.", 26, 170);
            doc.text(
              "Any verbal/oral commitment made by any Employee will not be Entertained / Accepted",
              32,
              170
            );

            doc.text("10.", 26, 180);
            doc.text(
              `All disputes are subject to ${city} jurisdiction only.`,
              32,
              180
            );

            doc.text("11.", 26, 190);
            doc.text(
              "Address Proof: Individual Ration Card/Passport/LIC Policy (more than a year)",
              32,
              190
            );
            doc.text(
              "Companies: Co. KST certificate/Telephone bill/Agreement Papers.",
              32,
              195
            );
          } else {
            doc.setLineWidth(0.6);
            doc.rect(20, 25, 170, 215);

            const text1 = `Detailed Noticed Condition on the`;
            const text2 = `Performa Invoice Issued by ${companyName}`;

            const text1Width = doc.getTextWidth(text1);
            const text2Width = doc.getTextWidth(text2);

            const xPosition1 = (205 - text1Width) / 2;
            const xPosition2 = (205 - text2Width) / 2;
            doc.setFontSize(12);
            doc.text(text1, xPosition1, 32);
            doc.text(text2, xPosition2, 37);

            doc.setFontSize(10.5);
            doc.text("1.", 26, 50);
            doc.text(
              "Performa Invoice contains price of particular type of Vehicle on a particular date and",
              32,
              50
            );
            doc.text(
              "does not in any way indicate the availability of the vehicle.",
              32,
              55
            );

            doc.text("2.", 26, 65);
            doc.text(
              "Enquires regarding availability of the vehicle should be made before taking out draft",
              32,
              65
            );
            doc.text("for payment from Bank/Financial Institutions.", 32, 70);

            doc.text("3.", 26, 80);
            doc.text("Terms of delivery cash / demand draft only", 32, 80);

            doc.text("4.", 26, 90);
            doc.text(
              "Price is subject to change at any time without prior notice and such the actual price to",
              32,
              90
            );
            doc.text(
              "be charged in the bill will be that prevailing on the date os delivery of the vehicle ",
              32,
              95
            );
            doc.text(
              "irrespective of when the payment is made or accepted by us.",
              32,
              100
            );

            doc.text("5.", 26, 110);
            doc.text(
              "Delivery subject to availability and delivery period is within engagement and subject",
              32,
              110
            );
            doc.text(
              "to change without notice. Delivery schedule shall be subject to delay due to strike,",
              32,
              115
            );
            doc.text(
              "lockout, Act of God, war epidemic and or any other unforeseen circumstance which",
              32,
              120
            );
            doc.text("are beyond our control.", 32, 125);

            doc.text("6.", 26, 135);
            doc.text(
              "In case of cancellation no interest will be payable",
              32,
              135
            );

            doc.text("7.", 26, 145);
            doc.text("Cancellation of Booking Charge Rs. 2100/-", 32, 145);

            doc.text("8.", 26, 155);
            doc.text(
              "Any verbal/oral commitment made by any Employee will not be Entertained / Accepted",
              32,
              155
            );

            doc.text("9.", 26, 165);
            doc.text(
              `All disputes are subject to ${city} jurisdiction only.`,
              32,
              165
            );

            doc.text("10.", 26, 175);
            doc.text("ID & Address Proof: PAN & Aadhar", 32, 175);
            doc.text(
              "Companies: Co. GST certificate/Agreement Papers.",
              32,
              180
            );

            doc.text("11.", 26, 190);
            doc.text(
              "PAN & AADHAR Linkage is mandatory by Income Tax Act & If non Linkage of same will",
              32,
              190
            );
            doc.text("affect upto 5% as TCS in place of 1%", 32, 195);
          }

          doc.text("Customer Signature", 135, 230);
          doc.save(`${company} Quotation by ${quotationIssuedBy}.pdf`);

          oPage.setBusy(false);
        }, 500);
      },
    });
  }
);
