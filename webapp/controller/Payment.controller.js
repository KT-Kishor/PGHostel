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
            this.goclick = 0;
        },

        _onRouteMatched: async function () {
            this.getBusyDialog()
            try {
                var LoginFUnction = await this.commonLoginFunction("ManagePaymentHistory");
                if (!LoginFUnction) return;
                this.isFirstLoad = true;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oLogin = this.getOwnerComponent().getModel("LoginModel").getData();
                this.getView().setModel(new JSONModel({ isSuperAdmin: oLogin.Role === "SuperAdmin" }), "RoleModel");
                this.commonLoginFunction();
                const oData = await this.ajaxReadWithJQuery("HM_Branch", "");
                const aBranchData = Array.isArray(oData?.commentData) ? oData.commentData : [];
                this.getView().setModel(new JSONModel(aBranchData), "PayBranchModel");
                this.onClearAndSearch("P_id_Filterbar");
                await this._loadBranchCode();
                this.setDefaultCurrentMonth();
                await this.Onsearch(true);
                this.isFirstLoad = false;
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },
         getGroupHeader: function (oGroup) {
                    return this.getStyledGroupHeader(oGroup);
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
            this.getBusyDialog()
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {}
        },

        prepareMasterFilterData: function (aData) {
            const mBranch = new Map();
            const mBooking = new Map();

            aData.forEach(item => {
                if (item.BranchCode && !mBranch.has(item.BranchCode)) {
                    mBranch.set(item.BranchCode, {
                        BranchCode: item.BranchCode,
                        Name: item.BranchName
                    });
                }
                if (item.BookingID && !mBooking.has(item.BookingID)) {
                    mBooking.set(item.BookingID, {
                        BookingID: item.BookingID
                    });
                }
            });

            this.getView().setModel(new JSONModel([...mBranch.values()]), "BranchFilterModel");
            this.getView().setModel(new JSONModel([...mBooking.values()]), "BookingFilterModel");
        },

        Onsearch: function (bInitialLoad) {
            const oView = this.getView();
            const oLogin = this.getOwnerComponent().getModel("LoginModel").getData();
            const oDateRange = this.byId("P_id_Date");
            const sBookingID = oView.byId("P_id_BookingID").getSelectedKey() || oView.byId("P_id_BookingID").getValue();
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
                    if (oMatch) sBranch = oMatch.getKey();
                }
            }
            let filters = {};
            if (sBookingID) filters.BookingID = sBookingID;
            if (oLogin.Role === "Admin") {
                filters.BranchCode = oLogin.BranchCode ? oLogin.BranchCode.split(",").map(c => c.trim()) : [];
                filters.Role = "Admin";
            }else {
                    filters.BranchCode = oLogin.BranchCode ? oLogin.BranchCode.split(",").map(c => c.trim()) : [];
            }
             if (sBranch) filters.BranchCode = sBranch ? sBranch : filters.BranchCode;

            if (oLogin.Role === "SuperAdmin" && !filters.StartDate) filters.GetAll = true;
            function formatLocalDate(d) {
                return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(d);
            }
            const d1 = oDateRange.getDateValue();
            const d2 = oDateRange.getSecondDateValue();

            if (d1 && d2) {
                filters.StartDate = formatLocalDate(d1);
                filters.EndDate = formatLocalDate(d2);
            } else {
                this.goclick++;

                if (this.goclick >= 2) {
                    this.setDefaultCurrentMonth();
                    const firstDay = oDateRange.getDateValue();
                    const lastDay = oDateRange.getSecondDateValue();
                    filters.StartDate = formatLocalDate(firstDay);
                    filters.EndDate = formatLocalDate(lastDay);
                }
                else {
                    delete filters.StartDate;
                    delete filters.EndDate;
                    filters.GetAll = true;
                }
            }
            this.getBusyDialog()
            return this.ajaxReadWithJQuery("HM_Payment", filters).then((oResponse) => {
                const aDatas = Array.isArray(oResponse?.commentData) ? oResponse.commentData : [];
                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                const oDatas = aDatas.map(item => {
                    const branch = branchData.find(br => br.BranchID === item.BranchCode);
                    return {
                        ...item,
                        BranchName: branch ? branch.Name : item.BranchCode
                    };
                });

                if (bInitialLoad && this.fullPaymentData.length === 0) {
                    this.fullPaymentData = oDatas;
                    this.prepareMasterFilterData(oDatas);
                }
                // const mBranchMap = this.buildBranchMap();
                // aData.forEach(item => {
                //     if (!item.Name && item.BranchCode) {
                //         item.Name = mBranchMap[item.BranchCode] || item.BranchCode;
                //     }
                // });
                this.getView().setModel(new JSONModel(oDatas), "mainModel");
            })
                .catch((err) => {
                    MessageToast.show(err.message || err.responseText);
                })
                .finally(() => {
                    this.closeBusyDialog()
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
            oView.byId("P_id_BookingID").setSelectedKey("");
            oView.byId("P_id_BookingID").setSelectedKey("");
            oView.byId("P_id_BranchCode").setSelectedKey("");
            const oDate = oView.byId("P_id_Date");
            oDate.setDateValue(null);
            oDate.setSecondDateValue(null);
            oDate.setValue("");
            this.goclick = 0;
        },

        createTableSheet: function () {
            return [{
                label: "Property Name",
                property: "BranchName",
                type: "string"
            },
                {
                label: "Booking ID",
                property: "BookingID",
                type: "string"
            },
            {
                label: "Customer Name",
                property: "CustomerName",
                type: "string"
            },
            {
                label: "Payment Date",
                property: "Date",
                type: "String"
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
                label: "Bank Name",
                property: "BankName",
                type: "string"
            },
            {
                label: "Amount",
                property: "Amount",
                type: "string"
            }
            ]
        },

        P_onDownload: function () {
            const oModel = this.byId("P_id_PaymentTable").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) return MessageToast.show(this.i18nModel.getText("MSnodata"));

            const adjustedData = oModel.map(item => ({
                ...item,
                Date: Formatter.displayFormatDate(item.Date),
                Amount: item.Amount + " " + item.Currency
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Payment Details"
                    }
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