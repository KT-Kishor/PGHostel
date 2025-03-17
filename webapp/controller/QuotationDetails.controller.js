sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator",
    "../model/formatter",
  ],
  (Controller, MessageToast, BusyIndicator, formatter) => {
    "use strict";

    return Controller.extend("project3.controller.QuotationDetails", {
      formatter: formatter,
      onInit() {
        this.getRouter()
          .getRoute("RouteQuotationDetails")
          .attachMatched(this._onRouteMatched, this);
        this.getOwnerComponent()
          .getModel("QData")
          .setProperty("/setDefFilter", true);
      },

      _onRouteMatched: function () {
        this._makeDatePickersReadOnly(["idQDate"]);
        this.clearQuotationForm();
        this.API = "https://rest.shahportal.in";
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.onRefreshApplication("Quotation");
        var oModel = this.getOwnerComponent().getModel("QData");

        var aData = oModel.getProperty("/QTableData");
        oModel.setProperty("/RowCount", aData ? aData.length : 0);
        var oBinding = oModel.bindList("/QTableData");
        oBinding.attachChange(function () {
          oModel.setProperty("/RowCount", oBinding.getLength());
        });

        var oModel = this.getView().getModel("QData");
        oModel.setProperty("/MasterEdit", true);
        var setDefFilter = oModel.getProperty("/setDefFilter");
        if (setDefFilter) {
          this._setFilterValues();
        }
        this.CommonBaseLocation();
        this.CommonCompanyDetails();
        this.CommonSelfService();

        var eModel = this.getView().getModel("UserDetails");
        if (!eModel) {
          BusyIndicator.hide();
          MessageToast.show(this.i18nModel.getText("quoSchemefailedtofetch"));
        }
        var sRole = eModel.getProperty("/Role");
        if (sRole === "Admin" || sRole === "CEO") {
          oModel.setProperty("/isEditable", true);
          oModel.setProperty("/isCoEdit", true);
        } else if (sRole === "GM") {
          oModel.setProperty("/isEditable", true);
          oModel.setProperty("/isCoEdit", false);
        } else {
          oModel.setProperty("/isEditable", false);
          oModel.setProperty("/isCoEdit", false);
        }
        oModel.setProperty("/VisibleStatus", false);
        this.onSearch();
        BusyIndicator.hide();
      },

      onPressback: function () {
        BusyIndicator.show(0);
        var eModel = this.getView().getModel("UserDetails");
        if (!eModel) {
          BusyIndicator.hide();
          MessageToast.show(this.i18nModel.getText("quoSchemefailedtofetch"));
        }
        this.getRouter().navTo("RouteAppVisibility");
        this.getOwnerComponent()
          .getModel("QData")
          .setProperty("/setDefFilter", true);
      },

      onLogout: function () {
        BusyIndicator.show();
        var oView = this.getView();
        [
          "idFilterCompany",
          "idBranch",
          "idQDate",
          "idQIBy",
          "idFilterPinCode",
          "idStatus",
        ].forEach((field) => {
          if (field === "idQDate") {
            var oDatePicker = oView.byId("idQDate");
            if (oDatePicker) {
              oDatePicker.setValue("");
            }
          } else {
            var oComboBox = oView.byId(field);
            if (oComboBox) {
              oComboBox.setSelectedKey("");
            }
          }
        });
        var oModel = this.getOwnerComponent().getModel("QData");
        oModel.setProperty("/setDefFilter", true);
        oModel.setProperty("/allCompanyCodeDetails", null);
        this.navigateLoginPage();
      },

      onRouteToDash: function () {
        BusyIndicator.show(0);
        this.getRouter().navTo("RouteQuotationDashboard");
      },

      _setFilterValues: function () {
        var that = this;
        var eModel = this.getOwnerComponent().getModel("UserDetails");
        if (!eModel) {
          BusyIndicator.hide();
          MessageToast.show(that.i18nModel.getText("msgSchemeUploadFailed"));
        }

        var employeeName = eModel.getProperty("/EmployeeName");
        var companyName = eModel.getProperty("/Company");
        var branchName = eModel.getProperty("/Branch");

        var status = this.getView().byId("idStatus");
        var employee = this.getView().byId("idQIBy");
        var branch = this.getView().byId("idBranch");
        var company = this.getView().byId("idFilterCompany");
        if (status || employee || branch || company) {
          status.setSelectedKey("New");
          employee.setValue(employeeName);
          branch.setValue(branchName);
          company.setValue(companyName);
        }
      },

      onFilterPinChange: function () {
        var data = this.getView().byId("idFilterPinCode");
        var sValue = data.getValue();
        if (sValue.length > 6) {
          sValue = sValue.slice(0, 6);
          data.setValue(sValue);
        }
      },

      onCompanyFilterChange: function () {
        var oView = this.getView();
        var branch = oView.byId("idBranch");
        var empName = oView.byId("idQIBy");
        branch.setBusyIndicatorDelay(0);
        branch.setBusy(true);
        branch.setValue("");
        branch.setSelectedKey("");
        empName.setBusyIndicatorDelay(0);
        empName.setBusy(true);
        empName.setValue("");
        empName.setSelectedKey("");
        this.CommonBaseLocation();
        this.CommonSelfService();
      },

      onBranchFilterChange: function () {
        var oView = this.getView();
        var empName = oView.byId("idQIBy");
        empName.setBusyIndicatorDelay(0);
        empName.setBusy(true);
        empName.setValue("");
        empName.setSelectedKey("");
        this.CommonSelfService();
      },

      onSearch: function () {
        var oView = this.getView();
        var oTable = oView.byId("idQTable");
        oTable.setBusyIndicatorDelay(0);
        oTable.setBusy(true);
        var oModel = this.getOwnerComponent().getModel("QData");
        var filterParams = {};
        var that = this;

        [
          "idFilterCompany",
          "idBranch",
          "idQDate",
          "idQIBy",
          "idFilterPinCode",
          "idStatus",
        ].forEach((field) => {
          var selectedKey = oView.byId(field).getValue();
          if (selectedKey) {
            filterParams[this.getFieldName(field)] = selectedKey;
          }
        });

        var url = this.API + "/Quotations";

        var queryString = Object.keys(filterParams)
          .map((key) => `${key}=${encodeURIComponent(filterParams[key])}`)
          .join("&");

        if (queryString) {
          url += "?" + queryString;
        }
        try {
          $.ajax({
            url: url,
            type: "GET",
            headers: {
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: (data) => {
              oModel.setProperty("/QTableData", data.results);
              oTable.setBusy(false);
            },
            error: function (err) {
              MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
              oTable.setBusy(false);
            },
          });
        } catch (e) {
          MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          oTable.setBusy(false);
        }
      },

      getFieldName: function (field) {
        let fieldMap = {
          idFilterCompany: "Company",
          idBranch: "Branch",
          idQDate: "QuotationDate",
          idQIBy: "QuotationIssuedBy",
          idFilterPinCode: "CustPinCode",
          idStatus: "Status",
        };
        return fieldMap[field] || field;
      },

      onPressClear: function () {
        var oView = this.getView();
        var branch = oView.byId("idBranch");
        var empName = oView.byId("idQIBy");
        branch.setBusyIndicatorDelay(0);
        branch.setBusy(true);
        empName.setBusyIndicatorDelay(0);
        empName.setBusy(true);

        var eModel = this.getView().getModel("UserDetails");
        if (!eModel) {
          BusyIndicator.hide();
          MessageToast.show(this.i18nModel.getText("quoSchemefailedtofetch"));
        }
        var sRole = eModel.getProperty("/Role");

        var fValues;

        if (sRole === "Admin" || sRole === "CEO") {
          fValues = [
            "idFilterCompany",
            "idBranch",
            "idQDate",
            "idQIBy",
            "idFilterPinCode",
            "idStatus",
          ];
        } else if (sRole === "GM") {
          fValues = [
            "idBranch",
            "idQDate",
            "idQIBy",
            "idFilterPinCode",
            "idStatus",
          ];
        } else {
          fValues = ["idQDate", "idFilterPinCode", "idStatus"];
        }

        fValues.forEach((field) => {
          if (field === "idQDate") {
            var oDatePicker = oView.byId("idQDate");
            if (oDatePicker) {
              oDatePicker.setValue("");
            }
          } else {
            var oComboBox = oView.byId(field);
            if (oComboBox) {
              oComboBox.setSelectedKey("");
            }
          }
        });

        this.CommonBaseLocation();
        this.CommonCompanyDetails();
        this.CommonSelfService();
      },

      onPresstoQ: function () {
        var that = this;
        BusyIndicator.show(0);
        var oModel = this.getOwnerComponent().getModel("QData");
        oModel.setProperty("/setDefFilter", false);
        var eModel = this.getOwnerComponent().getModel("UserDetails");
        if (!eModel) {
          BusyIndicator.hide();
          MessageToast.show(that.i18nModel.getText("msgSchemeUploadFailed"));
        }
        oModel.setProperty(
          "/QuotationIssuedBy",
          eModel.getProperty("/EmployeeName")
        );
        oModel.setProperty(
          "/EmployeeMobile",
          eModel.getProperty("/CellNumber")
        );
        oModel.setProperty("/Company", eModel.getProperty("/Company"));
        oModel.setProperty("/CompanyCode", eModel.getProperty("/CompanyCode"));
        oModel.setProperty("/Branch", eModel.getProperty("/Branch"));
        oModel.setProperty("/Status", "New");
        oModel.setProperty("/AddCase", true);
        oModel.setProperty("/ShowCase", false);

        this.getRouter().navTo("RouteMaintainQuotation");
      },

      onRowPress: function (oEvent) {
        BusyIndicator.show(0);
        var oModel = this.getOwnerComponent().getModel("QData");
        oModel.setProperty("/setDefFilter", false);
        oModel.setProperty("/MasterEdit", false);
        oModel.setProperty("/isEditable", false);
        var oSelectedData = oEvent
          .getSource()
          .getBindingContext("QData")
          .getObject();
        oModel.setProperty("/Company", oSelectedData.Company);
        oModel.setProperty("/CompanyCode", oSelectedData.CompanyCode);
        oModel.setProperty("/Branch", oSelectedData.Branch);
        oModel.setProperty("/Status", oSelectedData.Status);
        oModel.setProperty("/QuotationNumber", oSelectedData.QuotationNumber);
        oModel.setProperty("/QuotationDate", oSelectedData.QuotationDate);
        oModel.setProperty("/CustomerName", oSelectedData.CustomerName);
        oModel.setProperty("/CustAddress", oSelectedData.CustAddress);
        oModel.setProperty("/CustMobile", oSelectedData.CustMobile);
        oModel.setProperty("/CustPanNumber", oSelectedData.CustPanNumber);
        oModel.setProperty("/CustAadhar", oSelectedData.CustAadhar);
        oModel.setProperty("/CustPinCode", oSelectedData.CustPinCode);
        oModel.setProperty("/CustGSTNo", oSelectedData.CustGSTNo);
        oModel.setProperty("/CustEmail", oSelectedData.CustEmail);
        oModel.setProperty("/Model", oSelectedData.Model);
        oModel.setProperty("/Variant", oSelectedData.Variant);
        oModel.setProperty("/Transmission", oSelectedData.Transmission);
        oModel.setProperty("/Color", oSelectedData.Color);
        oModel.setProperty("/Fuel", oSelectedData.Fuel);
        oModel.setProperty("/BoardPlate", oSelectedData.BoardPlate);
        oModel.setProperty("/Make", oSelectedData.Make);
        oModel.setProperty("/Emission", oSelectedData.Emission);
        oModel.setProperty("/ExShowroom", oSelectedData.ExShowroom || 0.0);
        oModel.setProperty("/TCS1Perc", oSelectedData.TCS1Perc || 0.0);
        oModel.setProperty("/ROADTAX", oSelectedData.ROADTAX || 0.0);
        oModel.setProperty(
          "/AddOnInsurance",
          oSelectedData.AddOnInsurance || 0.0
        );
        oModel.setProperty("/RegHypCharge", oSelectedData.RegHypCharge || 0.0);
        oModel.setProperty(
          "/ShieldOfTrust4YR45K",
          oSelectedData.ShieldOfTrust4YR45K || 0.0
        );
        oModel.setProperty(
          "/EXTDWarrantyFOR4YR80K",
          oSelectedData.EXTDWarrantyFOR4YR80K || 0.0
        );
        oModel.setProperty("/STDFittings", oSelectedData.STDFittings || 0.0);
        oModel.setProperty("/FastTag", oSelectedData.FastTag || 0.0);
        oModel.setProperty("/VAS", oSelectedData.VAS || 0.0);
        oModel.setProperty("/RSA", oSelectedData.RSA || 0.0);
        oModel.setProperty(
          "/DiscountOffers",
          oSelectedData.DiscountOffers || 0.0
        );
        oModel.setProperty(
          "/ConsumerScheme",
          oSelectedData.ConsumerScheme || 0.0
        );
        oModel.setProperty(
          "/ExShowroomAfterScheme",
          oSelectedData.ExShowroomAfterScheme || 0.0
        );
        oModel.setProperty("/TotalOnRoad", oSelectedData.TotalOnRoad || 0.0);
        oModel.setProperty("/ValidUpto", oSelectedData.ValidUpto);
        oModel.setProperty(
          "/QuotationIssuedBy",
          oSelectedData.QuotationIssuedBy
        );
        oModel.setProperty("/EmployeeMobile", oSelectedData.EmployeeMobile);

        this.getRouter().navTo("RouteMaintainQuotation");

        var oModel = this.getOwnerComponent().getModel("QData");
        oModel.setProperty("/AddCase", false);
        oModel.setProperty("/ShowCase", true);
      },

      CommonCompanyDetails: function () {
        var oModel = this.getOwnerComponent().getModel("QData");
        var that = this;
        try {
          $.ajax({
            url: this.API + "/CompanyDetails",
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: function (data) {
              oModel.setProperty("/CompanyDetailsData", data.results);
            }.bind(this),
            error: function (err) {
              MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
            },
          });
        } catch (e) {
          MessageToast.show(that.i18nModel.getText("commanMessage"));
        }
      },

      CommonBaseLocation: function () {
        var oModel = this.getOwnerComponent().getModel("QData");
        var oView = this.getView();
        var company = oView.byId("idFilterCompany").getValue();
        var that = this;

        try {
          $.ajax({
            url: this.API + "/BaseLocation?Company=" + company,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: function (data) {
              oModel.setProperty("/BaseLocationData", data.results);
              oView.byId("idBranch").setBusy(false);
            }.bind(this),
            error: function (err) {
              oView.byId("idBranch").setBusy(false);
              MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
            },
          });
        } catch (e) {
          oView.byId("idBranch").setBusy(false);
          MessageToast.show(that.i18nModel.getText("commanMessage"));
        }
      },

      CommonSelfService: function () {
        var oModel = this.getOwnerComponent().getModel("QData");
        var oView = this.getView();
        var company = oView.byId("idFilterCompany").getValue();
        var branch = oView.byId("idBranch").getValue();
        var that = this;

        try {
          $.ajax({
            url: this.API + `/SelfService?Company=${company}&Branch=${branch}`,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
              password:
                "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
            },
            success: function (data) {
              oModel.setProperty("/SelfServiceData", data.results);
              oView.byId("idQIBy").setBusy(false);
            }.bind(this),
            error: function (err) {
              oView.byId("idQIBy").setBusy(false);
              MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
            },
          });
        } catch (e) {
          oView.byId("idQIBy").setBusy(false);
          MessageToast.show(that.i18nModel.getText("commanMessage"));
        }
      },
    });
  }
);
