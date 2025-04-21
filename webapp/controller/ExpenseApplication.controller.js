sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
], function(Controller, utils, MessageToast, Formatter, BusyIndicator, JSONModel) {
    "use strict";
    return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseApplication", {
        Formatter: Formatter,
        onInit: async function() {
            await this.getRouter().getRoute("RouteExpensePage").attachMatched(this._onRouteMatched, this);
            await this._fetchCommonData("BaseLocation", "BaseLocationModel");
            await this._fetchCommonData("Country", "CountryModel");
            await this._fetchCommonData("ExpenseItemType", "ExpenseTypeModel");
        },

        _onRouteMatched: async function(oEvent) {
            this.commonLoginFunction("Expense");
            await this._fetchCommonData("Expense", "FilterExpenseModel");
            var FilterModel = this.getView().getModel("FilterExpenseModel");

            if (FilterModel) {
                FilterModel.setData([
                    ...new Map(
                        FilterModel.getData().map((item) => [item.ExpenseName, item])
                    ).values()
                ]);
            }

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.Exp_onSearch();
            var View = new JSONModel({
                SaveBtn: false,
                SubmitBtn: false,
                required: true,
                minDate:new Date()
            });
            this.getOwnerComponent().setModel(View, "viewModel");
            this.ViewModel = this.getView().getModel("viewModel");
            this.LoginModel = this.getView().getModel("LoginModel");
            this.CommonModel();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Expense Details");
        },
 // Function to initialize the common model for expense creation
        CommonModel: function() {
            var oModel = new JSONModel({
                EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
                EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
                ExpenseName: "",
                ExpStartDate: "",
                ExpEndDate: "",
                TravelAllowance: "",
                Country: "",
                Source: "",
                Destination: "",
                CostCenter: "Kalpavriksha Technologies Kalaburagi",
                TripType: "Customer Facing",
                Comments: "",
                Status: "Draft"
            });
            this.getOwnerComponent().setModel(oModel, "CreateExpenseModel");
        },
         // Navigate back to the tile page
        onPressback: function() {
            this.getRouter().navTo("RouteTilePage");
        },
         // Logout and navigate to the login page
        onLogout: function() {
            this.CommonLogoutFunction();
        },
   // Open the "Add Expense" fragment
        Exp_onPressAddExpense: function() {
            this.CommonModel();
            var oView = this.getView();
            if (!this.Expense) {
                this.Expense = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.AddExpense",
                    controller: this
                }).then(function(Expense) {
                    this.Expense = Expense;
                    oView.addDependent(this.Expense);
                    this.Expense.open();
                }.bind(this));
            } else {
                this.Expense.open();
            }
        },
 // Close the "Add Expense" fragment and reset validation states
        Exp_Frg_onPressClose: function() {
            this.Expense.close();
            var core = sap.ui.getCore();
            core.byId("exp-Id-ExpenseName").setValueState("None");
            core.byId("exp-Id-StartDate").setValueState("None");
            core.byId("exp-Id-EndDate").setValueState("None");
            core.byId("exp-Id-Country").setValueState("None");
            core.byId("exp-Id-Source").setValueState("None");
            core.byId("exp-Id-Destination").setValueState("None");
            core.byId("exp-Id-EmployeeRemark").setValueState("None");
        },
// Submit the expense after validation
        Exp_Frg_onPressSubmit: async function() {
            var that = this;
            try {
                // Validate mandatory fields
                const isValid =
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-ExpenseName"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-StartDate"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-EndDate"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("exp-Id-Country"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("exp-Id-Source"), "ID") &&
                    (this.ViewModel.getProperty("/required") === true ?
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("exp-Id-Destination"), "ID") :
                        true) &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-EmployeeRemark"), "ID");

                if (!isValid) {
                    return MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
               this.byId("exp_Id_ExpenseTable").setBusy(true);

                // Get and format model data
                const oModel = this.getView().getModel("CreateExpenseModel").getData();
                oModel.ExpStartDate = oModel.ExpStartDate.split("/").reverse().join("-");
                oModel.ExpEndDate = oModel.ExpEndDate.split("/").reverse().join("-");

                const oResponse = await that.ajaxCreateWithJQuery("Expense", {data: oModel});
                if (oResponse) {
                    that.Expense.close();
                    await that._fetchCommonData("ExpenseTotalCalculation", "", {ExpenseID: oResponse.ExpenseID});
                    await that._fetchCommonData("Expense", "ExpenseModel");
                    that.getView().getModel("FilterExpenseModel").setData([...new Map(that.getView().getModel("ExpenseModel").getData().map((item) => [item.ExpenseName, item])).values()]);
                    MessageToast.show(that.i18nModel.getText("expenseCreatedMess"));
                } else {
                    MessageToast.show(that.i18nModel.getText("expenseCreatedMessFailed"));
                }
            } catch (oError) {
                MessageToast.show(that.i18nModel.getText("expenseCreatedMessFailed"));
            } finally {
                that.byId("exp_Id_ExpenseTable").setBusy(false);
            }
        },

        Exp_onCheckExpenseDetails: function(oEvent) {
            BusyIndicator.show(0);
            var ExpenseID = oEvent.getSource().getBindingContext("ExpenseModel").getObject().ExpenseID;
            this.getRouter().navTo("RouteExpensDetails", {
                sPath: ExpenseID.replaceAll("/", "")
            });
        },

        Exp_onLiveExpenseName: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

        Exp_onDatePickerChange: function(oEvent) {
            utils._LCvalidateDate(oEvent, "oEvent");
            sap.ui.getCore().byId("exp-Id-EndDate").setMinDate(new Date(oEvent.getSource().getValue().split("/").reverse().join('-')));
        },

        Exp_onEndDateChange: function(oEvent) {
            utils._LCvalidateDate(oEvent, "oEvent");
        },

        Exp_onChangeCountry: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent, "oEvent");
            if(oEvent.getSource().getValue()===''){
                oEvent.getSource().setValueState("None")
            }
        },

        Exp_onChangeSource: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent, "oEvent");
            if(oEvent.getSource().getValue()===''){
                oEvent.getSource().setValueState("None")
            }
        },

        Exp_onChangeDestination: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent, "oEvent");
            if(oEvent.getSource().getValue()===''){
                oEvent.getSource().setValueState("None")
            }   
        },

        Exp_onChangeEmployeeRemark: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

        Exp_onPressExpenseDownload: function() {
            let fileUrl = window.location.href.split("index")[0] + "/Perdiem_DeclarationForm.doc";
            sap.m.URLHelper.redirect(fileUrl, true)
        },

        onSignout: function() {
            this.getRouter().navTo("RouteLoginPage");
        },
// Delete the Expenase and Expense Item
        Exp_onPressDeleteExpense: async function (oEvent) {
            this.byId("exp_Id_ExpenseTable").setBusy(true);
            var that = this;
            this.showConfirmationDialog(
                this.i18nModel.getText("msgBoxConfirm"),
                this.i18nModel.getText("commonMesBoxConfirmDelete"),
                async function () {
                    that.byId("exp_Id_ExpenseTable").setBusy(true);
                    const expenseID = oEvent.getSource().getBindingContext("ExpenseModel").getObject().ExpenseID;
                    try {
                        await that.ajaxDeleteWithJQuery("/Expense", { filters: { ExpenseID: expenseID } });
                        MessageToast.show(that.i18nModel.getText("expenseDeleteMess")); // <== use 'that' instead of 'this'
                        that._fetchCommonData("Expense", "ExpenseModel");
                    } catch (error) {
                        MessageToast.show(error.responseText || "Error deleting expense");
                    } finally {
                        that.byId("exp_Id_ExpenseTable").setBusy(false);
                    }
                },
                function () { that.byId("exp_Id_ExpenseTable").setBusy(false);})
        },        
//Filter Function
        Exp_onSearch: async function() {
            try {
                BusyIndicator.show(0);
                const aFilterItems = this.byId("Exp-id-FilterBar").getFilterGroupItems();
                const params = {};

                aFilterItems.forEach(function(oItem) {
                    const oControl = oItem.getControl();
                    const sKey = oItem.getName();

                    if (oControl && typeof oControl.getValue === "function") {
                        const sValue = oControl.getValue().trim();

                        if (sValue) {
                            params[sKey] = sValue;
                        }
                    }
                });
                await this._fetchCommonData("Expense", "ExpenseModel", params);

            } catch (error) {
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            } finally {
                BusyIndicator.hide();
            }
        },

        Exp_onPressClear: function() {
            this.byId("Exp_id_EmployeeName").setSelectedKey("");
            this.byId("Exp_id_ConsFilterBar").setSelectedKey("");
            this.byId("Exp_id_SourceFilter").setSelectedKey("");
            this.byId("Exp_id_DestinationFilter").setSelectedKey("");
            this.byId("Exp_id_StatusFilter").setSelectedKey("");
        },

        Exp_onChangeExpenseType: function(oEvent) {
            if (oEvent.getSource()._getSelectedItemText() !== 'Customer Facing') {
                this.ViewModel.setProperty("/required", false);
                this.getView().getModel("CreateExpenseModel").getData().Destination = "";
            } else {
                this.ViewModel.setProperty("/required", true);
            }
        },


    });
});