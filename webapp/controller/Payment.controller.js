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
                this.onClearAndSearch("P_id_Filterbar");
                this.commonLoginFunction();
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
                this.getView().setModel(new sap.ui.model.json.JSONModel(aData),"mainModel");

            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        Onsearch: function () {
            const oView = this.getView();

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

            sap.ui.core.BusyIndicator.show(0);
            return this.ajaxReadWithJQuery("HM_Payment", filters).then((oResponse) => {
                console.log(oResponse);
                const aData = Array.isArray(oResponse?.commentData) ? oResponse.commentData : [];
                    this.getView().setModel(new sap.ui.model.json.JSONModel(aData),"mainModel");
                })
                .catch((err) => {
                    sap.m.MessageToast.show(err.message || err.responseText);
                })
                .finally(() => {
                    sap.ui.core.BusyIndicator.hide();
                });
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
            this.getView().byId("P_id_BookingID").setSelectedKey("")
        },
    });
});