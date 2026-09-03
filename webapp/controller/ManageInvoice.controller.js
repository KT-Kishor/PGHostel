sap.ui.define(
    [
        "./BaseController",
        "sap/m/MessageToast",
        'sap/ui/export/Spreadsheet',
        "../model/formatter",
    ],
    function (BaseController, MessageToast, Spreadsheet, Formatter) {
        "use strict";
        return BaseController.extend(
            "sap.ui.com.project1.controller.ManageInvoice", {
            Formatter: Formatter,
            onInit: function () {
                // this._isFinancialYearSet = false;
                this._isFirstInvoiceLoad = true;
                this.getOwnerComponent().getRouter().getRoute("RouteManageInvoice").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                try {
                    this.getBusyDialog();

                    const bLoginFunction =
                        await this.commonLoginFunction("ManageInvoice");

                    if (!bLoginFunction) {
                        return;
                    }

                    const oArguments =
                        oEvent.getParameter("arguments") || {};

                    const sPath = oArguments.sPath;

                    if (sPath === "TilePage") {
                        this._clearInvoiceFilters();
                        this._setFinancialYearDateRange();
                    }

                    /*
                     * If the route was matched after returning from details,
                     * do not clear or reset the date range.
                     */
                   this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    await this._loadBranchCode();
                    await this.ManageInvoice_onSearch();

                } catch (error) {
                    MessageToast.show(
                        error.message ||
                        error.responseText ||
                        "An error occurred"
                    );
                } finally {
                    this.closeBusyDialog();
                }
            },
            _clearInvoiceFilters: function () {
                const oInvoiceNo =
                    this.byId("CI_id_InvNo");

                const oCustomer =
                    this.byId("CI_id_CustomerNameComboBox");

                const oStatus =
                    this.byId("CI_id_StatusComboBox");

                const oDateRange =
                    this.byId("CI_id_InvoiceDatePicker");

                if (oInvoiceNo) {
                    oInvoiceNo.setSelectedKey("");
                    oInvoiceNo.setValue("");
                }

                if (oCustomer) {
                    oCustomer.setSelectedKey("");
                    oCustomer.setValue("");
                }

                if (oStatus) {
                    oStatus.setSelectedKey("");
                    oStatus.setValue("");
                }

                if (oDateRange) {
                    oDateRange.setDateValue(null);
                    oDateRange.setSecondDateValue(null);
                    oDateRange.setValue("");
                }

                this._isClearPressed = false;
            },
            _setFinancialYearDateRange: function () {
                const oDateRange =
                    this.byId("CI_id_InvoiceDatePicker");

                if (!oDateRange) {
                    return;
                }

                const oFinancialYear =
                    this._getFinancialYearDates();

                oDateRange.setDateValue(
                    oFinancialYear.startDate
                );

                oDateRange.setSecondDateValue(
                    oFinancialYear.endDate
                );
            },
            _getFinancialYearDates: function () {
                const oToday = new Date();
                const iYear = oToday.getFullYear();

                if (oToday.getMonth() >= 3) {
                    return {
                        startDate: new Date(iYear, 3, 1),
                        endDate: new Date(iYear + 1, 2, 31)
                    };
                }

                return {
                    startDate: new Date(iYear - 1, 3, 1),
                    endDate: new Date(iYear, 2, 31)
                };
            },
            getGroupHeader: function (oGroup) {
                return this.getStyledGroupHeader(oGroup);
            },

            _loadBranchCode: async function () {
                const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
                const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

                let aBranchCodes = "";

                if (Array.isArray(omainModel) && omainModel.length) {
                    aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
                } else if (oExistingModel.BranchCode) {
                    aBranchCodes = oExistingModel.BranchCode;
                }

                let filters = {};

                if (oExistingModel.Role === "Admin" && aBranchCodes) {
                    filters.BranchID = aBranchCodes;
                    filters.Role = "Admin";
                } else if (oExistingModel.Role === "SuperAdmin") {
                    filters.BranchID = "";
                } else {
                    filters.BranchID = oExistingModel.BranchCode;
                }
                try {
                    const oView = this.getOwnerComponent();

                    const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);

                    const aBranches = Array.isArray(oResponse?.data) ?
                        oResponse.data :
                        (oResponse?.data ? [oResponse.data] : []);

                    const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                    oView.setModel(oBranchModel, "BranchModel");
                } catch (err) {
                    console.error("Error while loading branch data:", err);
                }
            },

            ManageInvoice_onSearch: async function () {
                var oView = this.getView();
                const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
                const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

                let params = {};
                let invoiceDateProvided = false;

                try {
                    this.getBusyDialog()
                    let aBranchCodes = "";

                    if (Array.isArray(omainModel) && omainModel.length) {
                        aBranchCodes = omainModel.map(item => item.BranchID).filter(Boolean).join(",");
                    } else if (oExistingModel.BranchCode) {
                        aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim()).join(",");
                    }

                    if (oExistingModel.Role === "Admin") {
                        params.BranchCode = aBranchCodes;
                        params.Role = "Admin";
                    } else if (oExistingModel.Role === "SuperAdmin") {
                        params.BranchCode = "";
                    } else {
                        params.BranchCode = oExistingModel.BranchCode;
                    }

                    /* ---------------- Filter Bar Values ---------------- */
                    const filterItems = this.byId("CI_id_InvoiceFilterBar").getFilterGroupItems();

                    filterItems.forEach(function (item) {
                        const oControl = item.getControl();
                        const sKey = item.getName();

                        if (!oControl) {
                            return;
                        }

                        if (sKey === "InvoiceDate") {
                            const oStartDate =
                                oControl.getDateValue();

                            const oEndDate =
                                oControl.getSecondDateValue();

                            if (oStartDate && oEndDate) {
                                params.InvoiceStartDate =
                                    this._formatDateForBackend(oStartDate);

                                params.InvoiceEndDate =
                                    this._formatDateForBackend(oEndDate);

                                invoiceDateProvided = true;
                            }

                            return;
                        }

                        if (typeof oControl.getValue === "function") {
                            const sValue =
                                oControl.getValue().trim();

                            if (sValue) {
                                params[sKey] = sValue;
                            }
                        }
                    }, this);

                    /* ---------------- Financial Year Logic ---------------- */
                    const currentYear = new Date().getFullYear();
                    let fyStart, fyEnd, financialYearLabel;

                    if (new Date().getMonth() >= 3) {
                        fyStart = new Date(currentYear, 3, 1);
                        fyEnd = new Date(currentYear + 1, 2, 31);
                        financialYearLabel = `${currentYear}-${currentYear + 1}`;
                    } else {
                        fyStart = new Date(currentYear - 1, 3, 1);
                        fyEnd = new Date(currentYear, 2, 31);
                        financialYearLabel = `${currentYear - 1}-${currentYear}`;
                    }

                    const formatDate = date => date.toISOString().split("T")[0];

                    /* ---------------- Clear Button Handling ---------------- */
                    if (this._isClearPressed) {
                        delete params.InvoiceStartDate;
                        delete params.InvoiceEndDate;
                        delete params.FinancialYear;
                        this._isClearPressed = false;
                    }


                    /* ---------------- Filter Model Fetch (WITH BranchCode) ---------------- */
                    let filterModelParams = {
                        InvoiceStartDate: params.InvoiceStartDate,
                        InvoiceEndDate: params.InvoiceEndDate
                    };

                    if (oExistingModel.Role === "Admin") {
                        filterModelParams.BranchCode = aBranchCodes;
                        filterModelParams.Role = "Admin";
                    } else if (oExistingModel.Role === "SuperAdmin") {
                        filterModelParams.BranchCode = "";
                    } else {
                        filterModelParams.BranchCode = oExistingModel.BranchCode;
                    }

                    await this._fetchCommonData(
                        "HM_ManageInvoice",
                        "ManageInvoiceFilterModel",
                        filterModelParams
                    );

                    /* ---------------- FETCH MAIN TABLE DATA ---------------- */
                    const invoiceResp = await this.ajaxReadWithJQuery("HM_ManageInvoice", params);

                    const aInvoiceData = Array.isArray(invoiceResp?.data) ?
                        invoiceResp.data : [];

                    /* ---------------- BranchName Mapping ---------------- */
                    const aBranchData =
                        oView.getModel("BranchModel")?.getData() || [];

                    const aFinalData = aInvoiceData.map(item => {
                        const oBranch = aBranchData.find(
                            br => br.BranchID === item.BranchCode
                        );
                        return {
                            ...item,
                            BranchName: oBranch?.Name || ""
                        };
                    });

                    /* ---------------- SET TABLE MODEL (VIEW) ---------------- */
                    oView.setModel(
                        new sap.ui.model.json.JSONModel(aFinalData),
                        "ManageInvoiceModel"
                    );

                    /* ---------------- Build Customer Filter ---------------- */
                    this._buildUniqueCustomerModel(aFinalData);
                    this.closeBusyDialog()
                } catch (err) {
                    this.closeBusyDialog()
                    sap.m.MessageToast.show(err.message || err.responseText);
                }
            },
            _formatDateForBackend: function (oDate) {
                const iYear = oDate.getFullYear();

                const sMonth = String(
                    oDate.getMonth() + 1
                ).padStart(2, "0");

                const sDay = String(
                    oDate.getDate()
                ).padStart(2, "0");

                return `${iYear}-${sMonth}-${sDay}`;
            },

            _buildUniqueCustomerModel: function (aInvoices) {
                const oMap = {};
                const aUniqueCustomers = [];

                aInvoices.forEach(oItem => {
                    if (!oMap[oItem.BookingID]) {
                        oMap[oItem.BookingID] = true;
                        aUniqueCustomers.push({
                            BookingID: oItem.BookingID,
                            CustomerName: oItem.CustomerName
                        });
                    }
                });

                const oModel = new sap.ui.model.json.JSONModel(aUniqueCustomers);
                this.getView().setModel(oModel, "CustomerFilterModel");
            },

            onPressClear: function () {
                this.byId("CI_id_InvNo").setValue("");
                this.byId("CI_id_InvoiceDatePicker").setValue("");
                this.byId("CI_id_CustomerNameComboBox").setValue("");
                this.byId("CI_id_StatusComboBox").setValue("");
                this._isClearPressed = true;
            },

            onSelectionChange: function (oEvent) {
                this.data = oEvent.getSource().getSelectedItem().getBindingContext("ManageInvoiceModel").getObject();
                if (this.data.Status === "Submitted") {
                    this.byId("CI_InvoiceDelete").setEnabled(true);
                } else {
                    this.byId("CI_InvoiceDelete").setEnabled(false);
                }
            },

            CI_OnPressDeleteInvoice: function () {
                var that = this;
                this.showConfirmationDialog(
                    that.i18nModel.getText("msgBoxConfirm"),
                    that.i18nModel.getText("msgBoxConfirmDelete"),
                    async function () {
                        that.getBusyDialog();
                        try {
                            await that.ajaxDeleteWithJQuery("/HM_ManageInvoice", {
                                filters: {
                                    InvNo: that.data.InvNo
                                }
                            });
                            MessageToast.show(that.i18nModel.getText("CompanyDeleteMess"));
                            that.ManageInvoice_onSearch();
                        } catch (error) {
                            MessageToast.show(error.responseText || "Error deleting expense");
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function () {
                        that.closeBusyDialog();
                    })
            },


            CI_onPressAddInvoice: function () {
                this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", {
                    sPath: "X",
                    dash: "ManageInvoice"
                });
            },


            CI_onPressInvoiceRow: function (oEvent) {
                this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", {
                    sPath: encodeURIComponent(oEvent.getSource().getBindingContext("ManageInvoiceModel").getObject().InvNo),
                    dash: "ManageInvoice"
                });
            },

            onNavBack: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("TilePage");
            },

            onHome: function () {
                this.CommonLogoutFunction();
            },

            CI_onPressDownload: function () {
                var table = this.byId("CI_id_InvoiceTable");
                const oModelData = table.getModel("ManageInvoiceModel").getData();
                const aFormattedData = oModelData.map(item => {
                    return {
                        ...item,
                        InvoiceDate: Formatter.formatDate(item.InvoiceDate),
                        // PayByDate: Formatter.formatDate(item.PayByDate),
                        TotalAmountCurrency: item.TotalAmount + " " + item.Currency

                    };
                });
                if (oModelData.length === 0) {
                    MessageToast.show("No invoices available to download");
                    return;
                }
                const aCols = [{
                    label: this.i18nModel.getText("sheetBranchName"),
                    property: "BranchName",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("invoiceDate"),
                    property: "InvoiceDate",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("invoiceNo"),
                    property: "InvNo",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("customerName"),
                    property: "CustomerName",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("bookingID"),
                    property: "BookingID",
                    type: "string"
                },

                {
                    label: this.i18nModel.getText("invoiceDescription"),
                    property: "InvoiceDescription",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("totalAmount"),
                    property: "TotalAmountCurrency",
                    type: "string"
                },
                // {
                //     label: this.i18nModel.getText("PayByDate"),
                //     property: "PayByDate",
                //     type: "string "
                // },
                {
                    label: this.i18nModel.getText("status"),
                    property: "Status",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("cgs"),
                    property: "CGST",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("sgst"),
                    property: "SGST",
                    type: "string"
                },
                {
                    label: this.i18nModel.getText("igst"),
                    property: "IGST",
                    type: "string "
                }
                    // {
                    //     label: this.i18nModel.getText("amountInINR"),
                    //     property: "AmountInINR",
                    //     type: "string"
                    // },
                ];
                const oSettings = {
                    workbook: {
                        columns: aCols,
                        context: {
                            sheetName: this.i18nModel.getText("invoiceapp")
                        }
                    },
                    dataSource: aFormattedData,
                    fileName: "ManageInvoice.xlsx"
                };
                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().then(function () {
                    MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
                }.bind(this))
                    .finally(function () {
                        oSheet.destroy();
                    });
            }
        }
        );
    }
);