sap.ui.define(
    [
        "./BaseController",
        "sap/m/MessageToast",
        'sap/ui/export/Spreadsheet',
        "../model/formatter",
    ],
    function(BaseController, MessageToast, Spreadsheet, Formatter) {
        "use strict";
        return BaseController.extend(
            "sap.ui.com.project1.controller.ManageInvoice", {
                Formatter: Formatter,
                onInit: function() {
                    this.getOwnerComponent().getRouter().getRoute("RouteManageInvoice").attachMatched(this._onRouteMatched, this);
                },

                _onRouteMatched: async function() {
                    try {
                        sap.ui.core.BusyIndicator.show(0);
                        this.commonLoginFunction();
                        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                        this._isClearPressed = false; // ensure full data is not requested'
                        const currentYear = new Date().getFullYear();
                        let fyStart, fyEnd;

                        if (new Date().getMonth() >= 3) {
                            fyStart = new Date(currentYear, 3, 1); // April 1
                            fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
                        } else {
                            fyStart = new Date(currentYear - 1, 3, 1); // April 1 last year
                            fyEnd = new Date(currentYear, 2, 31); // March 31 this year
                        }
                        // Set the date range UI (override user-selected values)
                        const dateRangeControl = this.byId("CI_id_InvoiceDatePicker");
                        if (dateRangeControl) {
                            dateRangeControl.setDateValue(fyStart);
                            dateRangeControl.setSecondDateValue(fyEnd);
                        }
                        await this._loadBranchCode()
                        await this.ManageInvoice_onSearch();

                    } catch (error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(error.message || error.responseText);
                    } finally {
                        sap.ui.core.BusyIndicator.hide();
                    }
                },

                _loadBranchCode: async function() {
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
                    } else {
                        filters.BranchID = "";
                    }
                    try {
                        const oView = this.getView();

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

                ManageInvoice_onSearch: async function() {
                    var oView = this.getView();
                    const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
                    const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

                    let params = {};
                    let invoiceDateProvided = false;

                    try {
                        sap.ui.core.BusyIndicator.show(0);
                        let aBranchCodes = "";

                        if (Array.isArray(omainModel) && omainModel.length) {
                            aBranchCodes = omainModel.map(item => item.BranchID).filter(Boolean).join(",");
                        } else if (oExistingModel.BranchCode) {
                            aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim()).join(",");
                        }

                        if (oExistingModel.Role === "Admin") {
                            params.BranchCode = aBranchCodes;
                            params.Role = "Admin";
                        }

                        /* ---------------- Filter Bar Values ---------------- */
                        const filterItems = this.byId("CI_id_InvoiceFilterBar").getFilterGroupItems();

                        filterItems.forEach(item => {
                            const control = item.getControl();
                            const key = item.getName();

                            if (control && typeof control.getValue === "function") {
                                const value = control.getValue()?.trim();
                                if (!value) return;

                                if (key === "InvoiceDate" && value.includes("-")) {
                                    const [start, end] = value.split("-").map(date =>
                                        date.trim().split("/").reverse().join("-")
                                    );

                                    params.InvoiceStartDate = start;
                                    params.InvoiceEndDate = end;
                                    invoiceDateProvided = true;
                                } else {
                                    params[key] = value;
                                }
                            }
                        });

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
                        /* ---------------- Default Financial Year ---------------- */
                        else if (!invoiceDateProvided) {
                            params.InvoiceStartDate = formatDate(fyStart);
                            params.InvoiceEndDate = formatDate(fyEnd);
                            params.FinancialYear = financialYearLabel;

                            const oDateRange = this.byId("CI_id_InvoiceDatePicker");
                            if (oDateRange) {
                                oDateRange.setDateValue(fyStart);
                                oDateRange.setSecondDateValue(fyEnd);
                            }
                        }
                        /* ---------------- User Selected Date ---------------- */
                        else {
                            const startDate = new Date(params.InvoiceStartDate);
                            const endDate = new Date(params.InvoiceEndDate);

                            if (
                                formatDate(startDate) === formatDate(fyStart) &&
                                formatDate(endDate) === formatDate(fyEnd)
                            ) {
                                params.FinancialYear = financialYearLabel;
                            }
                        }

                        /* ---------------- Filter Model Fetch (WITH BranchCode) ---------------- */
                        let filterModelParams = {
                            InvoiceStartDate: params.InvoiceStartDate,
                            InvoiceEndDate: params.InvoiceEndDate
                        };

                        if (oExistingModel.Role === "Admin") {
                            filterModelParams.BranchCode = aBranchCodes;
                            filterModelParams.Role = "Admin";
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
                        sap.ui.core.BusyIndicator.hide();
                    } catch (err) {
                        sap.ui.core.BusyIndicator.hide();
                        console.error(err);
                        sap.m.MessageToast.show("Technical Error");
                    }
                },

                _buildUniqueCustomerModel: function(aInvoices) {
                    const oMap = {};
                    const aUniqueCustomers = [];

                    aInvoices.forEach(oItem => {
                        if (!oMap[oItem.CustomerID]) {
                            oMap[oItem.CustomerID] = true;
                            aUniqueCustomers.push({
                                CustomerID: oItem.CustomerID,
                                CustomerName: oItem.CustomerName
                            });
                        }
                    });

                    const oModel = new sap.ui.model.json.JSONModel(aUniqueCustomers);
                    this.getView().setModel(oModel, "CustomerFilterModel");
                },

                onPressClear: function() {
                    this.byId("CI_id_InvNo").setValue("");
                    this.byId("CI_id_InvoiceDatePicker").setValue("");
                    this.byId("CI_id_CustomerNameComboBox").setValue("");
                    this.byId("CI_id_StatusComboBox").setValue("");
                    this._isClearPressed = true;
                },

                onSelectionChange: function(oEvent) {
                    this.data = oEvent.getSource().getSelectedItem().getBindingContext("ManageInvoiceModel").getObject();
                    if (this.data.Status === "Submitted") {
                        this.byId("CI_InvoiceDelete").setEnabled(true);
                    } else {
                        this.byId("CI_InvoiceDelete").setEnabled(false);
                    }
                },

                CI_OnPressDeleteInvoice: function() {
                    var that = this;
                    this.showConfirmationDialog(
                        that.i18nModel.getText("msgBoxConfirm"),
                        that.i18nModel.getText("msgBoxConfirmDelete"),
                        async function() {
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
                            function() {
                                that.closeBusyDialog();
                            })
                },


                CI_onPressAddInvoice: function() {
                    this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", {
                        sPath: "X",
                        dash: "ManageInvoice"
                    });
                },


                CI_onPressInvoiceRow: function(oEvent) {
                    this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", {
                        sPath: encodeURIComponent(oEvent.getSource().getBindingContext("ManageInvoiceModel").getObject().InvNo),
                        dash: "ManageInvoice"
                    });
                },

                onNavBack: function() {
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("TilePage");
                },

                onHome: function() {
                    this.CommonLogoutFunction();
                },

                CI_onPressDownload: function() {
                    var table = this.byId("CI_id_InvoiceTable");
                    const oModelData = table.getModel("ManageInvoiceModel").getData();
                    const aFormattedData = oModelData.map(item => {
                        return {
                            ...item,
                            InvoiceDate: Formatter.formatDate(item.InvoiceDate),
                            PayByDate: Formatter.formatDate(item.PayByDate),
                            TotalAmountCurrency: item.TotalAmount + " " + item.Currency

                        };
                    });
                    const aCols = [{
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
                            label: this.i18nModel.getText("customerID"),
                            property: "CustomerID",
                            type: "string"
                        },
                        {
                            label: this.i18nModel.getText("bookingID"),
                            property: "BookingID",
                            type: "string"
                        },
                        {
                            label: this.i18nModel.getText("invoiceDate"),
                            property: "InvoiceDate",
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
                        {
                            label: this.i18nModel.getText("PayByDate"),
                            property: "PayByDate",
                            type: "string "
                        },
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
                        },
                        {
                            label: this.i18nModel.getText("amountInINR"),
                            property: "AmountInINR",
                            type: "string"
                        },
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
                    oSheet.build().then(function() {
                            MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
                        }.bind(this))
                        .finally(function() {
                            oSheet.destroy();
                        });
                }
            }
        );
    }
);