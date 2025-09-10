sap.ui.define(
    [
        "./BaseController", //import base controller
        "../model/formatter",
        "sap/ui/model/json/JSONModel",
        'sap/ui/export/Spreadsheet',
    ],
    function(BaseController, Formatter, JSONModel,Spreadsheet) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.HrQuotation", {
            Formatter: Formatter,
            onInit: function() {
                this.getRouter().getRoute("RouteHrQuotation").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function() {
                var LoginFunction = await this.commonLoginFunction("HrQuotation");
                if (!LoginFunction) return;
                this.getBusyDialog();
                this._isClearPressed = false;
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
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

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
                    this.HQ_onSearch();
                } else {
                    // Ensure search is called even if not HrQuotation
                    this.HQ_onSearch();
                }
                this.closeBusyDialog();
                this.initializeBirthdayCarousel();
            },

            onTableUpdateFinished: function(oEvent) {
                // Update the count in the header when table updates
                var oTable = this.byId("HQ_id_QuotationItemTable");
                var oTitle = oTable.getHeaderToolbar().getContent()[0];
                var iLength = oTable.getBinding("items").getLength();
                oTitle.setText(this.getView().getModel("i18n").getResourceBundle().getText("quotaionDetails") + " (" + iLength + ")");
            },

            _getFinancialYearDates: function() {
                var today = new Date();
                var currentMonth = today.getMonth() + 1;
                var currentYear = today.getFullYear();

                //  financial year runs from April to March
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
            _formatDateForBackend: function(date) {
                if (!date) return null;
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });
                return oDateFormat.format(date);
            },

            HQ_onSearch: async function() {
                try {
                    this.getBusyDialog();
                    const aFilterItems = this.byId("HQ_id_QuotationFilterBar").getFilterGroupItems();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd"
                    });
                    const params = {};
                    let dateProvided = false;

                    // Read filters
                    aFilterItems.forEach((oItem) => {
                        const oControl = oItem.getControl();
                        const sName = oItem.getName();

                        if (!oControl) return;

                        // Date range
                        if (sName === "Date" && oControl.isA("sap.m.DateRangeSelection")) {
                            const oStartDate = oControl.getDateValue();
                            const oEndDate = oControl.getSecondDateValue();
                            if (oStartDate && oEndDate) {
                                params.DateFrom = oDateFormat.format(oStartDate);
                                params.DateTo = oDateFormat.format(oEndDate);
                                dateProvided = true;
                            }
                            return;
                        }

                        // ComboBox (supports manual entry)
                        if (oControl.isA("sap.m.ComboBox")) {
                            const selectedKey = oControl.getSelectedKey();
                            if (selectedKey) {
                                params[sName] = selectedKey;
                            } else {
                                const typedValue = oControl.getValue().trim();
                                if (typedValue) {
                                    params[sName] = typedValue;
                                }
                            }
                            return;
                        }

                        // Generic value-based controls
                        if (typeof oControl.getValue === "function") {
                            const sValue = oControl.getValue().trim();
                            if (sValue) {
                                params[sName] = sValue;
                            }
                        }
                    });

                    // Financial Year fallback
                    const fy = this._getFinancialYearDates();
                    const financialYearLabel = fy.start.getFullYear() + "-" + fy.end.getFullYear();

                    if (this._isClearPressed) {
                        // Skip filters
                        delete params.DateFrom;
                        delete params.DateTo;
                        delete params.FinancialYear;
                    } else if (!dateProvided) {
                        // No user date selection → use FY
                        params["DateFrom"] = oDateFormat.format(fy.start);
                        params["DateTo"] = oDateFormat.format(fy.end)
                        params["FinancialYear"] = financialYearLabel;

                        const oDateControl = this.byId("HQ_id_Quotaiondate");
                        if (oDateControl) {
                            oDateControl.setDateValue(fy.start);
                            oDateControl.setSecondDateValue(fy.end);
                        }
                    } else {
                        // Check if selected dates match FY
                        const selectedStart = new Date(params["DateFrom"]);
                        const selectedEnd = new Date(params["DateTo"]);
                        if (
                            selectedStart.getTime() === fy.start.getTime() &&
                            selectedEnd.getTime() === fy.end.getTime()
                        ) {
                            params["FinancialYear"] = financialYearLabel;
                        }
                    }

                    // Set filters to model
                    this.getView().getModel("filters")?.setData(params);

                    // Fetch all data
                    await this._fetchCommonData("Quotation", "AllQuotationsModel", {
                        DateFrom: params.DateFrom,
                        DateTo: params.DateTo
                    });

                    // Fetch filtered view data
                    await this._fetchCommonData("Quotation", "CompanyQuotationModel", {
                        QuotationNo: params.QuotationNo || null,
                        CustomerName: params.CustomerName || null,
                        DateFrom: params.DateFrom,
                        DateTo: params.DateTo,
                        CompanyCode: params.CompanyCode || null,
                    });

                    // Filter table
                    const oTable = this.byId("HQ_id_QuotationItemTable");
                    const oBinding = oTable.getBinding("items");

                    if (oBinding) {
                        const aFilters = [];

                        if (params.DateFrom && params.DateTo) {
                            aFilters.push(new sap.ui.model.Filter("Date", "BT", params.DateFrom, params.DateTo));
                        }
                        if (params.QuotationNo) {
                            aFilters.push(new sap.ui.model.Filter("QuotationNo", "Contains", params.QuotationNo));
                        }
                        if (params.CustomerName) {
                            aFilters.push(new sap.ui.model.Filter("CustomerName", "Contains", params.CustomerName));
                        }
                        if (params.CompanyCode) {
                            aFilters.push(new sap.ui.model.Filter("CompanyCode", "EQ", params.CompanyCode));
                        }

                        const oFilter = aFilters.length ? new sap.ui.model.Filter(aFilters, true) : null;
                        oBinding.filter(oFilter);

                        this.onTableUpdateFinished();

                        await new Promise(resolve => {
                            oTable.attachEventOnce("updateFinished", () => {
                                setTimeout(() => {
                                    this._refreshFilterBarDropdowns();
                                    resolve();
                                }, 200);
                            });
                        });
                    }

                } catch (error) {
                    console.error("Search error:", error);
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage") || "Error during search.");
                } finally {
                    this.closeBusyDialog();
                }
            },

            _refreshFilterBarDropdowns: function() {
                const oAllQuotationsModel = this.getView().getModel("AllQuotationsModel");
                if (!oAllQuotationsModel) return;

                const aAllData = oAllQuotationsModel.getData() || [];
                let aFilteredData = [];

                if (this._isClearPressed) {
                    aFilteredData = aAllData; // No filtering — use all data
                    this._isClearPressed = false;
                } else {
                    let oStartDate, oEndDate; // Filter by selected date range or fallback to FY
                    const oDateRange = this.byId("HQ_id_Quotaiondate");

                    if (oDateRange?.getDateValue() && oDateRange?.getSecondDateValue()) {
                        oStartDate = oDateRange.getDateValue();
                        oEndDate = oDateRange.getSecondDateValue();
                    } else {
                        const fyDates = this._getFinancialYearDates();
                        oStartDate = fyDates.start;
                        oEndDate = fyDates.end;
                    }

                    aFilteredData = aAllData.filter(oItem => {
                        const sItemDate = oItem.Date;
                        if (!sItemDate) return false;

                        const oItemDate = new Date(sItemDate);
                        return oItemDate >= oStartDate && oItemDate <= oEndDate;
                    });
                }

                // Build unique dropdown lists
                const aUniqueQuotations = [];
                const aUniqueCustomers = [];
                const mSeenQuotations = {};
                const mSeenCustomers = {};

                aFilteredData.forEach(oItem => {
                    if (oItem?.QuotationNo && !mSeenQuotations[oItem.QuotationNo]) {
                        aUniqueQuotations.push({
                            QuotationNo: oItem.QuotationNo,
                            CompanyName: oItem.CompanyName || ""
                        });
                        mSeenQuotations[oItem.QuotationNo] = true;
                    }

                    if (oItem?.CustomerName && !mSeenCustomers[oItem.CustomerName]) {
                        aUniqueCustomers.push({
                            CustomerName: oItem.CustomerName,
                            QuotationNo: oItem.QuotationNo || ""
                        });
                        mSeenCustomers[oItem.CustomerName] = true;
                    }
                });

                // Set models and refresh dropdowns
                this.getView().setModel(new sap.ui.model.json.JSONModel(aUniqueQuotations), "FilteredQuotations");
                this.getView().setModel(new sap.ui.model.json.JSONModel(aUniqueCustomers), "FilteredCustomers");

                this.byId("HQ_id_quotationNo")?.getBinding("items")?.refresh(true);
                this.byId("HQ_id_CustomerName")?.getBinding("items")?.refresh(true);
            },

            HQ_onClearFilters: function() {
                this.byId("HQ_id_quotationNo").setSelectedKey("");
                this.byId("HQ_id_CustomerName").setSelectedKey("");
                this.byId("HQ_id_Quotaiondate").setValue("");
                this.byId("HQ_id_CompanyCodeComboBox").setSelectedKey("");
                this._isClearPressed = true;
            },

            onDateRangeChange: function(oEvent) {
                var oDateRange = oEvent.getSource();
                var dateFrom = oDateRange.getDateValue();
                var dateTo = oDateRange.getSecondDateValue();
                var oFiltersModel = this.getView().getModel("filters");
                if (oFiltersModel) {
                    oFiltersModel.setProperty("/DateFrom", dateFrom ? this._formatDateForBackend(dateFrom) : null);
                    oFiltersModel.setProperty("/DateTo", dateTo ? this._formatDateForBackend(dateTo) : null);
                }
            },

            HQ_onPressAddQuotation: function() {
                this.getRouter().navTo("RouteHrQuotationDetails", {
                    sQuotationNo: "new"
                })
            },

            onPressback: function() {
                this.getRouter().navTo("RouteTilePage"); // Function to navigate back to the TileAdminView route
            },

            onLogout: function() {
                this.CommonLogoutFunction();
            },

            HQ_onPressBack: function() {
                this.navigateToRouteView1();
            },

            HQ_onPressQuotation: function(oEvent) {
                var oContext = oEvent.getSource().getBindingContext("CompanyQuotationModel");
                var oData = oContext.getObject(); // get full object
                var sQuotationNo = oData.QuotationNo; // extract actual QuotationNo

                this.getRouter().navTo("RouteHrQuotationDetails", {
                    sQuotationNo: encodeURIComponent(sQuotationNo)
                });
            },

            HQ_DownloadTableData:function(){
                 var table = this.byId("HQ_id_QuotationItemTable");
                        var oBinding = table.getBinding("items");
            var aFilteredData = oBinding.getCurrentContexts().map(function (oContext) {
                return oContext.getObject();
            });

             const aFormattedData = aFilteredData.map(item => {
            return {
              ...item,
              Date: Formatter.formatDate(item.Date),   
            };
          });
          const aCols = [
            { label: this.i18nModel.getText("quotationNo"), property: "QuotationNo", type: "string" },
            { label: this.i18nModel.getText("quotaiodate"), property: "Date", type: "string" },
            { label: this.i18nModel.getText("customerName"), property: "CustomerName", type: "string" },
            { label: this.i18nModel.getText("customerGSTNO"), property: "CustomerGSTNO", type: "string" },
            { label: this.i18nModel.getText("email"), property: "CustomerEmailID", type: "string" },
            { label: this.i18nModel.getText("mobileNo"), property: "CustomerMobileNo", type: "string " },
            { label: this.i18nModel.getText("pdfTotal"), property: "TotalSum", type: "string" },
          ];
          const oSettings = {
            workbook: {
              columns: aCols,
              context: {
                sheetName: this.i18nModel.getText("invoiceapp")
              }
            },
            dataSource: aFormattedData,
            fileName: "Quatation.xlsx"
          };
          const oSheet = new Spreadsheet(oSettings);
          oSheet.build().then(function () {
            MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
          }.bind(this))
            .finally(function () {
              oSheet.destroy();
            });

            }
        });
    });