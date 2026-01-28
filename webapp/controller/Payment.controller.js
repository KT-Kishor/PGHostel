sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
], function (BaseController, Formatter, Spreadsheet, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Payment", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RoutePayment").attachMatched(this._onRouteMatched, this);
            this.fullPaymentData = [];
            this.isFirstLoad = true;
        },

        _onRouteMatched: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                this.isFirstLoad = true;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oLogin = this.getOwnerComponent().getModel("LoginModel").getData();
                this.getView().setModel(new JSONModel({ isSuperAdmin: oLogin.Role === "Super Admin" }), "RoleModel");
                this.commonLoginFunction();
                const oData = await this.ajaxReadWithJQuery("HM_Branch", "");
                const aBranchData = Array.isArray(oData?.commentData) ? oData.commentData : [];
                this.getView().setModel(new JSONModel(aBranchData), "PayBranchModel");
                await this._loadBranchCode();
                this.setDefaultCurrentMonth();
                await this.Onsearch(true);
                this.isFirstLoad = false;
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];
            let aBranchCodes = [];

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
            }
            let filters = {};
            if (oExistingModel.Role === "Admin") {
                filters = {
                    BranchID: aBranchCodes,
                    Role: "Admin"
                };
            } else {
                filters.BranchID = aBranchCodes;
            }

            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        buildBranchMap: function () {
            const aBranches = this.getView().getModel("PayBranchModel")?.getData() || [];
            const mBranchMap = {};

            aBranches.forEach(b => {
                if (b.BranchCode && b.BranchName) {
                    mBranchMap[b.BranchCode] = b.BranchName;
                }
            });

            return mBranchMap;
        },

        prepareMasterFilterData: function (aData) {
            const mBranch = new Map();
            const mCustomer = new Map();
            const mBooking = new Map();

            aData.forEach(item => {
                if (item.BranchCode && !mBranch.has(item.BranchCode)) {
                    mBranch.set(item.BranchCode, {
                        BranchCode: item.BranchCode,
                        BranchName: item.BranchName
                    });
                }
                if (item.CustomerID && !mCustomer.has(item.CustomerID)) {
                    mCustomer.set(item.CustomerID, {
                        CustomerID: item.CustomerID,
                        CustomerName: item.CustomerName
                    });
                }
                if (item.BookingID && !mBooking.has(item.BookingID)) {
                    mBooking.set(item.BookingID, {
                        BookingID: item.BookingID
                    });
                }
            });

            this.getView().setModel(new JSONModel([...mBranch.values()]), "BranchFilterModel");
            this.getView().setModel(new JSONModel([...mCustomer.values()]), "CustomerFilterModel");
            this.getView().setModel(new JSONModel([...mBooking.values()]), "BookingFilterModel");
        },

        Onsearch: function (bInitialLoad) {
            const oView = this.getView();
            const oLogin = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getView().getModel("mainModel")?.getData() || [];
            const oDateRange = this.byId("P_id_Date");
            const sCustomerID =
                oView.byId("P_id_CustomerID").getSelectedKey() || oView.byId("P_id_CustomerID").getValue();
            const sBookingID =
                oView.byId("P_id_BookingID").getSelectedKey() || oView.byId("P_id_BookingID").getValue();
            let sBranch = "";
            const oBranchCombo = oView.byId("P_id_BranchCode");
            if (oBranchCombo) {
                sBranch = oBranchCombo.getSelectedKey();
                if (!sBranch) {
                    const sTyped = (oBranchCombo.getValue() || "").trim().toLowerCase();
                    const aItems = oBranchCombo.getItems();

                    const oMatch = aItems.find(item =>
                        (item.getText() || "").toLowerCase() === sTyped ||
                        (item.getAdditionalText() || "").toLowerCase() === sTyped
                    );

                    if (oMatch) {
                        sBranch = oMatch.getKey();
                    }
                }
            }
            let filters = {};
            if (sCustomerID) {
                filters.CustomerID = sCustomerID;
            }

            if (sBookingID) {
                filters.BookingID = sBookingID;
            }
            if (sBranch) {
                filters.BranchCode = sBranch;
            }
            if (oLogin.Role === "Admin") {
                filters.BranchCode = oLogin.BranchCode ? oLogin.BranchCode.split(",").map(c => c.trim()) : [];
                filters.Role = "Admin";
            }

            if (oLogin.Role === "Super Admin" && !filters.StartDate) {
                filters.GetAll = true;
            }

            function formatLocalDate(d) {
                return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(d);
            }
            const d1 = oDateRange.getDateValue();
            const d2 = oDateRange.getSecondDateValue();

            if (d1 instanceof Date && d2 instanceof Date) {
                filters.StartDate = formatLocalDate(d1);
                filters.EndDate = formatLocalDate(d2);
            } else if (d1 instanceof Date && d2 instanceof Date) {
                delete filters.StartDate;
                delete filters.EndDate;
            } else {
                this.setDefaultCurrentMonth();
            }
            sap.ui.core.BusyIndicator.show(0);
            return this.ajaxReadWithJQuery("HM_Payment", filters).then((oResponse) => {
                const aData = Array.isArray(oResponse?.commentData) ? oResponse.commentData : [];
                
                    if (bInitialLoad && this.fullPaymentData.length === 0) {
                        this.fullPaymentData = aData;
                        this.prepareMasterFilterData(aData);
                    }
                const mBranchMap = this.buildBranchMap();
                aData.forEach(item => {
                    if (!item.BranchName && item.BranchCode) {
                        item.BranchName = mBranchMap[item.BranchCode] || item.BranchCode;
                    }
                });
                this.getView().setModel(new sap.ui.model.json.JSONModel(aData), "mainModel");
            })
                .catch((err) => {
                    sap.m.MessageToast.show(err.message || err.responseText);
                })
                .finally(() => {
                    sap.ui.core.BusyIndicator.hide();
                });
        },

        onAfterRendering: function () {
            const oCombo = this.byId("P_id_BranchCode");
            if (oCombo) {
                oCombo.setFilterFunction((sTerm, oItem) => {
                    sTerm = sTerm.toLowerCase();
                    return ((oItem.getText() || "").toLowerCase().includes(sTerm) || (oItem.getAdditionalText() || "").toLowerCase().includes(sTerm));
                });
            }
        },

        setDefaultCurrentMonth: function () {
            const oDateRange = this.byId("P_id_Date");
            if (!oDateRange) return;
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            oDateRange.setDateValue(firstDay);
            oDateRange.setSecondDateValue(lastDay);
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        FC_onPressClear: function () {
            const oView = this.getView();
            oView.byId("P_id_CustomerID").setSelectedKey("");
            oView.byId("P_id_BookingID").setSelectedKey("");
            oView.byId("P_id_BranchCode").setSelectedKey("");
            const oDate = oView.byId("P_id_Date");
            oDate.setDateValue(null);
            oDate.setSecondDateValue(null);
            oDate.setValue("");
        },

        createTableSheet: function () {
            return [{
                label: "Booking ID",
                property: "BookingID",
                type: "string"
            },
            {
                label: "Payment Date",
                property: "Date",
                type: "String"
            },
            {
                label: "Bank Name",
                property: "BankName",
                type: "string"
            },
            {
                label: "Amount",
                property: "Amount",
                type: "string"
            },
            {
                label: "Payment Type",
                property: "PaymentType",
                type: "string"
            },
            {
                label: "Bank Transaction ID",
                property: "BankTransactionID",
                type: "string"
            },
            {
                label: "Customer Name",
                property: "CustomerName",
                type: "string"
            },
            {
                label: "Deposit",
                property: "Deposit",
                type: "string"
            },
            {
                label: "Return Deposit Date",
                property: "ReturnDepositDate",
                type: "string"
            },
            {
                label: "Return Deposit Mode",
                property: "ReturnDepositMode",
                type: "string"
            },
            {
                label: "Return Deposit Transaction ID",
                property: "ReturnDepositTransactionID",
                type: "string"
            }
            ]
        },

        P_onDownload: function () {
            const oModel = this.byId("P_id_PaymentTable").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Date: Formatter.displayFormatDate(item.Date),
                ReturnDepositDate: Formatter.displayFormatDate(item.ReturnDepositDate),
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Payment_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingPayment"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },
    });
});