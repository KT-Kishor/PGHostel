sap.ui.define(
  [
    "./BaseController", //import base controller
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
  ],
  function (BaseController, Formatter, MessageBox, JSONModel) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.HrQuotation", {
      Formatter: Formatter,
      onInit: function () {
        this.getRouter().getRoute("RouteHrQuotation").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: async function () {
        var LoginFunction = await this.commonLoginFunction("HrQuotation");
        if (!LoginFunction) return;
        this.getBusyDialog();

        // Set financial year dates in the date range picker
        var fyDates = this._getFinancialYearDates();
        this.byId("HQ_id_Quotaiondate").setDateValue(fyDates.start);
        this.byId("HQ_id_Quotaiondate").setSecondDateValue(fyDates.end);

        this._ViewDatePickersReadOnly(["HQ_id_Quotaiondate"], this.getView());
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        // Fetch data with financial year filter initially
        await this._fetchCommonData("Quotation", "CompanyQuotationModel", {
          DateFrom: this._formatDateForBackend(fyDates.start),
          DateTo: this._formatDateForBackend(fyDates.end)
        });
        this.getView().getModel("LoginModel").setProperty("/HeaderName", "Manage Quotation");

        if (this.oValue === "HrQuotation") {
          this.HQ_onClearFilters();
        }
        await this.HQ_onSearch()
        this.closeBusyDialog();

      },
      _getFinancialYearDates: function () {
        var today = new Date();
        var currentMonth = today.getMonth() + 1; // JavaScript months are 0-11
        var currentYear = today.getFullYear();

        // Assuming financial year runs from April to March
        var fyStart, fyEnd;

        if (currentMonth >= 4) {
          // Current financial year is current year April to next year March
          fyStart = new Date(currentYear, 3, 1); // April 1 (month is 0-based)
          fyEnd = new Date(currentYear + 1, 2, 31); // March 31 of next year
        } else {
          // Current financial year is previous year April to current year March
          fyStart = new Date(currentYear - 1, 3, 1);
          fyEnd = new Date(currentYear, 2, 31);
        }

        return {
          start: fyStart,
          end: fyEnd
        };
      },
      // Helper function to format date for backend
      _formatDateForBackend: function (date) {
        if (!date) return null;
        var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
        return oDateFormat.format(date);
      },
      HQ_onSearch: async function () {
        this.getBusyDialog();

        var oFilterBar = this.byId("HQ_id_QuotationFilterBar");
        var aFilterItems = oFilterBar.getFilterGroupItems();
        var aFilters = [];
        var oDateRange = this.byId("HQ_id_Quotaiondate");
        var dateFrom = oDateRange.getDateValue();
        var dateTo = oDateRange.getSecondDateValue();

        // Create date filters if dates are selected
        if (dateFrom && dateTo) {
          var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
          var sDateFrom = oDateFormat.format(dateFrom);
          var sDateTo = oDateFormat.format(dateTo);

          // Create filter for date range
          aFilters.push(new sap.ui.model.Filter("Date", sap.ui.model.FilterOperator.BT, sDateFrom, sDateTo));
        }

        // Handle other filters
        aFilterItems.forEach(function (oItem) {
          if (oItem.getName() === "Date") return; // Skip date as we already handled it

          var sName = oItem.getName();
          var oControl = oFilterBar.determineControlByFilterItem(oItem);
          var sValue;

          if (oControl.isA("sap.m.ComboBox")) {
            sValue = oControl.getSelectedKey();
          } else if (oControl.getValue) {
            sValue = oControl.getValue();
          }

          if (sValue) {
            aFilters.push(new sap.ui.model.Filter(sName, sap.ui.model.FilterOperator.Contains, sValue));
          }
        });

        // Apply filters to table
        var oTable = this.byId("HQ_id_QuotationItemTable");
        var oBinding = oTable.getBinding("items");

        if (oBinding) {
          oBinding.filter(aFilters);
          oTable.attachEventOnce("updateFinished", function () {
            this.closeBusyDialog();
          }.bind(this));
        } else {
          this.closeBusyDialog();
        }
      },
      onDateRangeChange: function (oEvent) {
        this.HQ_onSearch();
      },


      HQ_onClearFilters: function () {
        // Clear all filters except the date range
        this.byId("HQ_id_quotationNo").setSelectedKey("");
        this.byId("HQ_id_CustomerName").setSelectedKey("");
        // this.byId("HQ_id_Quotaiondate").setValue("");

        // Reset date range to financial year
        var fyDates = this._getFinancialYearDates();
        this.byId("HQ_id_Quotaiondate").setDateValue(fyDates.start);
        this.byId("HQ_id_Quotaiondate").setSecondDateValue(fyDates.end);
        this.HQ_onSearch();
      },

      HQ_onPressAddQuotation: function () {
        this.getRouter().navTo("RouteHrQuotationDetails", { sQuotationNo: "new" })
      },

      // Function to navigate back to the TileAdminView route
      onPressback: function () {
        this.getRouter().navTo("RouteTilePage");
      },

      onLogout: function () {
        this.CommonLogoutFunction();
      },

      HQ_onPressBack: function () {
        this.navigateToRouteView1();
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