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

        // Initialize filters model if it doesn't exist
        if (!this.getView().getModel("/filters")) {
          this.getView().setModel(new JSONModel({
            QuotationNo: "",
            CustomerName: "",
            DateFrom: null,
            DateTo: null
          }), "filters");
        }

        // Set financial year dates
        var fyDates = this._getFinancialYearDates();
        var sDateFrom = this._formatDateForBackend(fyDates.start);
        var sDateTo = this._formatDateForBackend(fyDates.end);

        // Update UI controls
        this.byId("HQ_id_Quotaiondate").setDateValue(fyDates.start);
        this.byId("HQ_id_Quotaiondate").setSecondDateValue(fyDates.end);

        // Update filters model
        this.getView().getModel("filters").setProperty("/DateFrom", sDateFrom);
        this.getView().getModel("filters").setProperty("/DateTo", sDateTo);

        this._ViewDatePickersReadOnly(["HQ_id_Quotaiondate"], this.getView());
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

        // FIRST: Fetch data with financial year filter
        await this._fetchCommonData("Quotation", "CompanyQuotationModel", {
          DateFrom: sDateFrom,
          DateTo: sDateTo
        });

        // SECOND: Apply the FY filter to the table immediately
        var oTable = this.byId("HQ_id_QuotationItemTable");
        var oBinding = oTable.getBinding("items");
        if (oBinding) {
          var fyFilter = new sap.ui.model.Filter("Date", "BT", sDateFrom, sDateTo);
          oBinding.filter([fyFilter]);
        }
        this._refreshFilterBarDropdowns();
        this.getView().getModel("LoginModel").setProperty("/HeaderName", "Manage Quotation");

        if (this.oValue === "HrQuotation") {
          this.HQ_onClearFilters();
        } else {
          // Ensure search is called even if not HrQuotation
          await this.HQ_onSearch();
        }
        this.closeBusyDialog();
      },
      onTableUpdateFinished: function (oEvent) {
        // Update the count in the header when table updates
        var oTable = this.byId("HQ_id_QuotationItemTable");
        var oTitle = oTable.getHeaderToolbar().getContent()[0];
        var iLength = oTable.getBinding("items").getLength();
        oTitle.setText(this.getView().getModel("i18n").getResourceBundle().getText("quotaionDetails") + " (" + iLength + ")");
      },

      _getFinancialYearDates: function () {
        var today = new Date();
        var currentMonth = today.getMonth() + 1;
        var currentYear = today.getFullYear();

        // Assuming financial year runs from April to March
        var fyStart, fyEnd;
        if (currentMonth >= 4) {
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

        // Get current values from controls
        var sQuotationNo = this.byId("HQ_id_quotationNo").getSelectedKey();
        var sCustomerName = this.byId("HQ_id_CustomerName").getSelectedKey();
        var oDateRange = this.byId("HQ_id_Quotaiondate");
        var dateFrom = oDateRange.getDateValue();
        var dateTo = oDateRange.getSecondDateValue();

        // Format dates for filtering
        var sDateFrom = dateFrom ? this._formatDateForBackend(dateFrom) : null;
        var sDateTo = dateTo ? this._formatDateForBackend(dateTo) : null;

        // If no date range is selected, use financial year as default
        if (!sDateFrom || !sDateTo) {
          var fyDates = this._getFinancialYearDates();
          sDateFrom = this._formatDateForBackend(fyDates.start);
          sDateTo = this._formatDateForBackend(fyDates.end);
          this.byId("HQ_id_Quotaiondate").setDateValue(fyDates.start);
          this.byId("HQ_id_Quotaiondate").setSecondDateValue(fyDates.end);
        }

        // Update filters model
        this.getView().getModel("filters").setProperty("/QuotationNo", sQuotationNo || "");
        this.getView().getModel("filters").setProperty("/CustomerName", sCustomerName || "");
        this.getView().getModel("filters").setProperty("/DateFrom", sDateFrom);
        this.getView().getModel("filters").setProperty("/DateTo", sDateTo);

        // Build filters array
        var aFilters = [];
        aFilters.push(new sap.ui.model.Filter("Date", "BT", sDateFrom, sDateTo));

        if (sQuotationNo) {
          aFilters.push(new sap.ui.model.Filter("QuotationNo", "EQ", sQuotationNo));
        }
        if (sCustomerName) {
          aFilters.push(new sap.ui.model.Filter("CustomerName", "EQ", sCustomerName));
        }

        // Apply filters to table
        var oTable = this.byId("HQ_id_QuotationItemTable");
        var oBinding = oTable.getBinding("items");

        if (oBinding) {
          var oCombinedFilter = aFilters.length > 0
            ? new sap.ui.model.Filter(aFilters, true)
            : null;

          oBinding.filter(oCombinedFilter);

          // Update count immediately
          this.onTableUpdateFinished();
        }

        if (oBinding) {
          var oCombinedFilter = new sap.ui.model.Filter(aFilters, true);
          oBinding.filter(oCombinedFilter);

          oTable.attachEventOnce("updateFinished", function () {
            this._refreshFilterBarDropdowns();
            this.closeBusyDialog();
          }.bind(this));
        } else {
          this.closeBusyDialog();
        }
      },
      _refreshFilterBarDropdowns: function () {
        var oFiltersModel = this.getView().getModel("filters");
        var filterData = oFiltersModel.getData();

        // Get current table filtered items
        var oTable = this.byId("HQ_id_QuotationItemTable");
        var aItems = oTable.getItems();
        var aFilteredData = aItems.map(function (oItem) {
          return oItem.getBindingContext("CompanyQuotationModel").getObject();
        });

        // Create unique lists for dropdowns
        var aUniqueQuotations = [];
        var aUniqueCustomers = [];
        var mSeenQuotations = {};
        var mSeenCustomers = {};

        aFilteredData.forEach(function (oItem) {
          if (!mSeenQuotations[oItem.QuotationNo]) {
            aUniqueQuotations.push({
              QuotationNo: oItem.QuotationNo,
              CompanyName: oItem.CompanyName
            });
            mSeenQuotations[oItem.QuotationNo] = true;
          }

          if (!mSeenCustomers[oItem.CustomerName]) {
            aUniqueCustomers.push({
              CustomerName: oItem.CustomerName,
              QuotationNo: oItem.QuotationNo
            });
            mSeenCustomers[oItem.CustomerName] = true;
          }
        });

        // Update dropdown models
        this.getView().setModel(new JSONModel(aUniqueQuotations), "FilteredQuotations");
        this.getView().setModel(new JSONModel(aUniqueCustomers), "FilteredCustomers");
      },
      HQ_onClearFilters: function () {
        // Clear selections
        this.byId("HQ_id_quotationNo").setSelectedKey("");
        this.byId("HQ_id_CustomerName").setSelectedKey("");

        // Reset to financial year dates
        var fyDates = this._getFinancialYearDates();
        this.byId("HQ_id_Quotaiondate").setDateValue(fyDates.start);
        this.byId("HQ_id_Quotaiondate").setSecondDateValue(fyDates.end);

        // Update filters model
        var sDateFrom = this._formatDateForBackend(fyDates.start);
        var sDateTo = this._formatDateForBackend(fyDates.end);
        this.getView().getModel("filters").setProperty("/QuotationNo", "");
        this.getView().getModel("filters").setProperty("/CustomerName", "");
        this.getView().getModel("filters").setProperty("/DateFrom", sDateFrom);
        this.getView().getModel("filters").setProperty("/DateTo", sDateTo);

        // Apply FY filter immediately
        var oTable = this.byId("HQ_id_QuotationItemTable");
        var oBinding = oTable.getBinding("items");
        if (oBinding) {
          var fyFilter = new sap.ui.model.Filter("Date", "BT", sDateFrom, sDateTo);
          oBinding.filter([fyFilter]);
        }
      },

      onDateRangeChange: function (oEvent) {
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