sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "../model/formatter",
    "sap/m/MessageToast",
], function(
    BaseController,
    JSONModel,
    utils,
    formatter,
    MessageToast) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrder", {
        formatter: formatter,
        onInit: function() {
            this.getRouter().getRoute("PurchaseOrder").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function() {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            var LoginFUnction = await this.commonLoginFunction("PurchaseOrder");
            if (!LoginFUnction) return;
            this._fetchCommonData("ManageCustomer", "ManageCustomerModel");
            await this.PO_onSearch()
            var model = new JSONModel({
                "CustomerName": "",
                "Type": "",
                "Address": "",
                "StartDate": "",
                "EndDate": "",
                "PAN": "",
                "CurrentDate": "",
                "Description": "",
                "Unit": "",
                "Amount": "",
                "Currency": "",
                "Notes": "",
                "PurchaseOrders": [],
            })
            this.getView().setModel(model, "PurchaseOrderModel");
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Purchase Order");
            this.initializeBirthdayCarousel();
        },
        onPressback: function() {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function() {
            this.CommonLogoutFunction()
        },
        PO_onCreatePurchaseOrder: function() {
            this.getRouter().navTo("PurchaseOrderObject", {
                sPath: "PurchaseOrder"
            });
        },
        PO_onCloseFrag: function() {
            this.PO_oDialog.close();
            var oModel = this.getView().getModel("PurchaseOrderModel");
            oModel.setProperty("/PurchaseOrders", []);
        },
        PO_onAmountInputChange: function(oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        onDescriptionInputLiveChange: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
        },
        FPO_onDateChange: function(oEvent) {
            utils._LCvalidateDate(oEvent)
        },
        PO_ReadCall: async function() {
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("PurchaseOrder").then((oData) => {
                var PoData = Array.isArray(oData.data) ? oData.data : [oData.data];
                this.getOwnerComponent().setModel(new JSONModel(PoData), "POModel");
                this.closeBusyDialog()
            });

        },
        PO_onDeleteButtonPress: function() {
            var Table = this.getView().byId("idPOTable");
            var selectedItem = Table.getSelectedItem();
            if (!selectedItem) {
                MessageToast.show(this.i18nModel.getText("selectPurchaseOrder"));
                return;
            }
            var PoNumber = selectedItem.getBindingContext("POModel").getProperty("PoNumber");
            this.showConfirmationDialog(
                "Delete Confirmation",
                "Are you sure you want to delete this Purchase Order?",
                () => {
                    this.getBusyDialog()
                    this.ajaxDeleteWithJQuery("PurchaseOrder", {
                        filters: {
                            PoNumber: PoNumber
                        }
                    }).then(() => {
                        MessageToast.show(this.i18nModel.getText("purchaseOrderDeleted"));
                        this.PO_ReadCall();

                    });
                },
                function() {
                    Table.removeSelections()
                }
            );

        },
        onColumnListItemPress: function(oEvent) {
            var PoNumber = oEvent.getSource().getBindingContext("POModel").getObject().PoNumber;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("PurchaseOrderObject", {
                sPath: PoNumber
            })
        },
        PO_onSearch: async function() {
            try {
                this.getBusyDialog();

                const PoControl = this.byId("PO_id_PoNumber");
                const Po = PoControl.getSelectedKey() || PoControl.getValue();

                const oDateRange = this.byId("PO_idECreationDatePicker");
                const odateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });

                const oStartDate = oDateRange.getDateValue();
                const oEndDate = oDateRange.getSecondDateValue();

                const filters = {};

                if (Po) {
                    filters.PoNumber = Po;
                }

                // Financial Year calculation
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

                if (oStartDate && oEndDate) {
                    filters.StartDate = odateFormat.format(oStartDate);
                    filters.EndDate = odateFormat.format(oEndDate);

                    if (
                        oStartDate.getTime() === fyStart.getTime() &&
                        oEndDate.getTime() === fyEnd.getTime()
                    ) {
                        filters.FinancialYear = financialYearLabel;
                    }
                } else {
                    filters.StartDate = odateFormat.format(fyStart);
                    filters.EndDate = odateFormat.format(fyEnd);
                    filters.FinancialYear = financialYearLabel;

                    oDateRange.setDateValue(fyStart);
                    oDateRange.setSecondDateValue(fyEnd);
                }
                this._fetchCommonData("PurchaseOrder", "POModelfilter", {
                    StartDate: filters.StartDate,
                    EndDate: filters.EndDate
                });
                await this._fetchCommonData("PurchaseOrder", "POModel", filters);
                this.closeBusyDialog();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show("Technical error occurred");
            }
        },
        PO_onPressClear: function() {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("");
            this.getView().byId("PO_id_PoNumber").setSelectedKey("");
            this.byId("PO_idECreationDatePicker").setValue("");
        },
        onClearNotesPress: function() {
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes", "")
        }
    });
});