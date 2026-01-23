sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
], function (BaseController, Formatter, Spreadsheet, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Payment", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RoutePayment").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            try {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oLogin = this.getOwnerComponent().getModel("LoginModel").getData();
                this.getView().setModel(new sap.ui.model.json.JSONModel({ isSuperAdmin: oLogin.Role === "Super Admin" }), "RoleModel");
                this.onClearAndSearch("P_id_Filterbar");
                this.commonLoginFunction();
                this.setDefaultCurrentMonth();
                await this._loadBranchCode();
                await this.Onsearch("true");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            let aBranchCodes = [];

            if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(c => c.trim());
            }

            let filters = {};
            if (oExistingModel.Role) {
                filters.BranchCode = aBranchCodes;
            }

            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_Payment", filters);
                const aData = Array.isArray(oResponse?.commentData) ? oResponse.commentData : [];
                this.getView().setModel(new sap.ui.model.json.JSONModel(aData), "mainModel");

            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        Onsearch: function () {
            const oView = this.getView();
            const oLogin = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];
            const oDateRange = this.byId("P_id_Date");
            const sCustomerID =
                oView.byId("P_id_CustomerID").getSelectedKey() ||
                oView.byId("P_id_CustomerID").getValue();

            const sBookingID =
                oView.byId("P_id_BookingID").getSelectedKey() ||
                oView.byId("P_id_BookingID").getValue();

            let filters = {};
            if (sCustomerID) {
                filters.CustomerID = sCustomerID;
            }

            if (sBookingID) {
                filters.BookingID = sBookingID;
            }
            let aBranchCodes = [];
            if (Array.isArray(omainModel) && omainModel.length && oLogin.Role === "Super Admin") {
                aBranchCodes = omainModel.map(item => item.BranchCode).filter(Boolean).join(",");
            } else if (oLogin.BranchCode) {
                aBranchCodes = oLogin.BranchCode.split(",").map(c => c.trim());
            }

            if (oLogin.Role === "Admin") {
                filters.BranchCode = aBranchCodes;
                filters.Role = "Admin";
            } else if (oLogin.Role === "Super Admin") {
                filters.BranchCode = "";
                filters.Role = "Super Admin";
            }

            // if (sCustomerID) filters.CustomerID = sCustomerID;
            // if (sBookingID) filters.BookingID = sBookingID;
            if (oDateRange?.getDateValue() && oDateRange?.getSecondDateValue()) {
                filters.StartDate = oDateRange.getDateValue().toISOString().slice(0, 10);
                filters.EndDate = oDateRange.getSecondDateValue().toISOString().slice(0, 10);
            }
            sap.ui.core.BusyIndicator.show(0);
            return this.ajaxReadWithJQuery("HM_Payment", filters).then((oResponse) => {
                console.log(oResponse);
                const aData = Array.isArray(oResponse?.commentData) ? oResponse.commentData : [];
                this.getView().setModel(new sap.ui.model.json.JSONModel(aData), "mainModel");
            })
                .catch((err) => {
                    sap.m.MessageToast.show(err.message || err.responseText);
                })
                .finally(() => {
                    sap.ui.core.BusyIndicator.hide();
                });
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

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                P_id_CustomerID: new Set(),
                P_id_BookingID: new Set()
            };

            data.forEach(item => {
                if (item.CustomerID) uniqueValues.P_id_CustomerID.add(item.CustomerID);
                if (item.BookingID) uniqueValues.P_id_BookingID.add(item.BookingID);
            });

            let oView = this.getView();

            ["P_id_CustomerID", "P_id_BookingID"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;

                oComboBox.destroyItems();

                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        FC_onPressClear: function () {
            this.getView().byId("P_id_CustomerID").setSelectedKey("");
            this.getView().byId("P_id_BookingID").setSelectedKey("");
            this.getView().byId("P_id_Date").setValue("");
        },

        createTableSheet: function () {
            return [{
                label: "Booking ID",
                property: "BookingID",
                type: "string"
            },
            {
                label: "Payment Date",
                property: "PaymentDate",
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
            },
            {
                label: "Payment Type",
                property: "Type",
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