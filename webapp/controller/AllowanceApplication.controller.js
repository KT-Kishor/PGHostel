sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
], function(Controller, utils, MessageToast, Formatter, JSONModel) {
    "use strict";
    return Controller.extend("sap.kt.com.minihrsolution.controller.AllowanceApplication", {
        Formatter: Formatter,
        onInit: function() {
            this.getRouter().getRoute("RouteAllowancePage").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function(oEvent) {
            var LoginFUnction = await this.commonLoginFunction("Allowance");
            if (!LoginFUnction) return;
            this.getBusyDialog();
            try {
                this.LoginModel = this.getView().getModel("LoginModel");
                if (!this.getView().getModel("ManagerModel")) this._fetchCommonData("ManagerFunction", "ManagerModel", {
                    ManagerID: this.LoginModel.getProperty("/EmployeeID")
                });
                 let today = new Date();
                let year = today.getFullYear();
                let AllowanceStartDate, AllowanceEndDate;
                if (today.getMonth() + 1 < 4) {
                    AllowanceStartDate	 = new Date(year - 1, 3, 1);
                    AllowanceEndDate = new Date(year, 2, 31);
                } else {
                    AllowanceStartDate	 = new Date(year, 3, 1);
                    AllowanceEndDate = new Date(year + 1, 2, 31);
                }
                const dateRangeControl = this.byId("All_id_InvoiceDatePicker");
                if (dateRangeControl) {
                    dateRangeControl.setDateValue(AllowanceStartDate);
                    dateRangeControl.setSecondDateValue(AllowanceEndDate);
                }
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var View = new JSONModel({
                    SaveBtn: false,
                    SubmitBtn: false,
                    required: true,
                    minDate: new Date(),
                    finacialStart: AllowanceStartDate,
                    finacialEnd: AllowanceEndDate
                });
                this.getOwnerComponent().setModel(View, "viewModel");
                this.ViewModel = this.getView().getModel("viewModel");
                var oDateModel = new sap.ui.model.json.JSONModel({
                    dates: []
                }); // JSONModel for date picker
                this.getView().setModel(oDateModel);
                this.CommonModel();
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Allowance Application");
                this.onChangeEmployeeID();
                this.Exp_onSearch();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
            this.initializeBirthdayCarousel();
        },

        _updateDateList: function(iMonth, iYear) {
            var iLastDay = new Date(iYear, iMonth + 1, 0).getDate();
            var aDates = [];
            for (var d = 1; d <= iLastDay; d++) {
                var oDate = new Date(iYear, iMonth, d); // Format date as dd/MM/yyyy
                var sDay = String(oDate.getDate()).padStart(2, "0");
                var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
                var sYear = oDate.getFullYear();
                var sFormatted = `${sDay}/${sMonth}/${sYear}`;
                aDates.push({
                    key: sFormatted, // unique key
                    day: sFormatted // display text
                });
            }
            this.getView().getModel().setProperty("/dates", aDates);
        },

        // function to always set start & end dates
        _setAllowanceDates: function(iMonth, iYear) {
            var oStartDate = new Date(iYear, iMonth, 1);  
            var sStartDay = String(oStartDate.getDate()).padStart(2, "0");
            var sStartMonth = String(oStartDate.getMonth() + 1).padStart(2, "0");
            var sStartYear = oStartDate.getFullYear();
            var sAllowanceStartDate = `${sStartDay}/${sStartMonth}/${sStartYear}`;

            var oEndDate = new Date(iYear, iMonth + 1, 0);
            var sEndDay = String(oEndDate.getDate()).padStart(2, "0");
            var sEndMonth = String(oEndDate.getMonth() + 1).padStart(2, "0");
            var sEndYear = oEndDate.getFullYear();
            var sAllowanceEndDate = `${sEndDay}/${sEndMonth}/${sEndYear}`;

            var oCreateModel = this.getOwnerComponent().getModel("CreateAllowanceModel");
            if (oCreateModel) {
                oCreateModel.setProperty("/AllowanceStartDate", sAllowanceStartDate);
                oCreateModel.setProperty("/AllowanceEndDate", sAllowanceEndDate);
            }
        },

        onMonthChange: function () {
            var oMonthSelect = sap.ui.getCore().byId("monthSelect");
            var oYearSelect = sap.ui.getCore().byId("yearSelect");
            var oDateMultiBox = sap.ui.getCore().byId("dateMultiBox");

            var iMonth = parseInt(oMonthSelect.getSelectedKey()); // 0-based month
            var iYear = parseInt(oYearSelect.getSelectedKey());

            if (isNaN(iMonth) || isNaN(iYear)) {
                return; // user hasn't selected both yet
            }

            // ---------- Allowance Start & End Date ----------
            var oStartDate = new Date(iYear, iMonth, 1);  // Start of month
            var sStartDay = String(oStartDate.getDate()).padStart(2, "0");
            var sStartMonth = String(oStartDate.getMonth() + 1).padStart(2, "0");
            var sStartYear = oStartDate.getFullYear();
            var sAllowanceStartDate = `${sStartDay}/${sStartMonth}/${sStartYear}`;

            // End of month
            var oEndDate = new Date(iYear, iMonth + 1, 0);
            var sEndDay = String(oEndDate.getDate()).padStart(2, "0");
            var sEndMonth = String(oEndDate.getMonth() + 1).padStart(2, "0");
            var sEndYear = oEndDate.getFullYear();
            var sAllowanceEndDate = `${sEndDay}/${sEndMonth}/${sEndYear}`;

            // Update CreateAllowanceModel
            var oCreateModel = this.getOwnerComponent().getModel("CreateAllowanceModel");
            if (oCreateModel) {
                oCreateModel.setProperty("/AllowanceStartDate", sAllowanceStartDate);
                oCreateModel.setProperty("/AllowanceEndDate", sAllowanceEndDate);
            }

            // ---------- Populate Dates into MultiComboBox ----------
            var daysInMonth = oEndDate.getDate();
            var aDates = [];
            for (var day = 1; day <= daysInMonth; day++) {
                let dayStr = day.toString().padStart(2, "0"); 
                let monthStr = (iMonth + 1).toString().padStart(2, "0");
                let fullDate = `${dayStr}/${monthStr}/${iYear}`; // dd/MM/yyyy

                aDates.push({
                    key: fullDate,
                    day: fullDate
                });
            }

            var oModel = new sap.ui.model.json.JSONModel({ dates: aDates });
            oDateMultiBox.setModel(oModel);
        },

        onTableSelectionChange: function(oEvent) {
            var Status = oEvent.getSource().getSelectedItem().getBindingContext("AllowanceModel").getObject().Status;
            this.DeleteAllowanceID = oEvent.getSource().getSelectedItem().getBindingContext("AllowanceModel").getObject().AllowanceID;
            if (Status === "Draft") {
                this.byId("All_id_DeleteBtn").setEnabled(true);
            } else {
                this.byId("All_id_DeleteBtn").setEnabled(false);
            }
        },

        onChangeEmployeeID: async function(params) {
            var selectedItem = this.byId("All_id_EmployeeName").getSelectedItem();
            var EmployeeID = selectedItem ? selectedItem.getText() : this.LoginModel.getProperty("/EmployeeID");
            if (params && params.EmployeeID) { // Override EmployeeID if params are passed
                EmployeeID = params.EmployeeID;
            }
            const fetchParams = {EmployeeID: EmployeeID};
            if (params?.AllowanceStartDate && params?.AllowanceEndDate) { 
                fetchParams.AllowanceStartDate = params.AllowanceStartDate;
                fetchParams.AllowanceEndDate = params.AllowanceEndDate;
            }
            await this._fetchCommonData("Allowance", "FilterAllowanceModel", fetchParams);
            var FilterModel = this.getView().getModel("FilterAllowanceModel");
            if (FilterModel) {
            var data = FilterModel.getData();
            var uniqueAllowanceName = [...new Map(data.map(item => [item.AllowanceName, item])).values()];
            var uniqueSource = [...new Map(data.map(item => [item.Source, item])).values()];
            var uniqueDestination = [...new Map(data.map(item => [item.Destination, item])).values()];
            FilterModel.setData({
                AllowanceNameSet: uniqueAllowanceName,
                SourceSet: uniqueSource,
                DestinationSet: uniqueDestination
            });
        }
        },

        // Function to initialize the common model for expense creation
        CommonModel: function() {
            var oModel = new JSONModel({
                EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
                EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
                AllowanceName: "",
                Dates:"",
                AllowanceType: "",
                Country: "",
                Source: "",
                Destination: "",
                CostCenter: "Kvriksha Technologies Private Limited Kalaburagi",
                TripType: "",
                Comments: "",
                Status: "Draft",
                AllowanceStartDate:"",
                AllowanceEndDate:"",
            });
            this.getOwnerComponent().setModel(oModel, "CreateAllowanceModel");
        },

        // Navigate back to the tile page
        onPressback: function() {
            this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function() {
            this.CommonLogoutFunction();
        },

        // Open the "Add Expense" fragment
        Exp_onPressAddExpense: function() {
            this.CommonModel(); // resets the CreateAllowanceModel
            var oView = this.getView();
            var oDateMultiBox = sap.ui.getCore().byId("dateMultiBox");
            if (oDateMultiBox) {  // Clear previously selected dates in MultiComboBox
                oDateMultiBox.removeAllSelectedItems();
            }
            var oView = this.getView();
            if (!this.Expense) {
                this.Expense = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.AddAllowance",
                    controller: this
                }).then(function(Expense) {
                    this.Expense = Expense;
                    oView.addDependent(this.Expense);
                    var today = new Date();
                    var iMonth = today.getMonth(); // 0–11
                    var iYear = today.getFullYear();
                    sap.ui.getCore().byId("monthSelect").setSelectedKey(iMonth.toString()); // Preselect month & year
                    sap.ui.getCore().byId("yearSelect").setSelectedKey(iYear.toString());
                    this._setAllowanceDates(iMonth, iYear);
                    this._updateDateList(iMonth, iYear); // Populate dates
                    this.Expense.open();
                }.bind(this));
            } else {
                var today = new Date();
                var iMonth = today.getMonth(); // 0–11
                var iYear = today.getFullYear();
                sap.ui.getCore().byId("monthSelect").setSelectedKey(iMonth.toString()); // Preselect month & year
                sap.ui.getCore().byId("yearSelect").setSelectedKey(iYear.toString());
                this._setAllowanceDates(iMonth, iYear);
                this._updateDateList(iMonth, iYear); // Populate dates
                this.Expense.open();
            }
        },

        // Close the "Add Expense" fragment and reset validation states
        Exp_Frg_onPressClose: function() {
            this.Expense.close();
            var core = sap.ui.getCore();
            core.byId("All_id_AllowanceName").setValueState("None");
            core.byId("monthSelect").setValueState("None");
            core.byId("yearSelect").setValueState("None");
            core.byId("dateMultiBox").setValueState("None");
            core.byId("All_id_Country").setValueState("None");
            core.byId("All_id_State").setValueState("None");
            core.byId("All_id_Source").setValueState("None");
            core.byId("All_id_Destination").setValueState("None");
            core.byId("All_id_EmployeeRemark").setValueState("None");
        },

        // Submit the expense after validation
        Exp_Frg_onPressSubmit: async function() {
            var that = this;
            try {
                const isValid =
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("All_id_AllowanceName"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("All_id_TravelAllowance"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("All_id_Country"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("All_id_State"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("All_id_Source"), "ID") &&
                    (this.ViewModel.getProperty("/required") === true ? utils._LCvalidateMandatoryField(sap.ui.getCore().byId("All_id_Destination"), "ID") : true) &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("All_id_ExpenseType"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("All_id_EmployeeRemark"), "ID");

                if (!isValid) {
                    return MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
                const oModel = this.getView().getModel("CreateAllowanceModel").getData();
                oModel.AllowanceStartDate = oModel.AllowanceStartDate.split("/").reverse().join("-");
                oModel.AllowanceEndDate = oModel.AllowanceEndDate.split("/").reverse().join("-");
                var aSelectedDates = sap.ui.getCore().byId("dateMultiBox").getSelectedKeys(); // array of YYYY-MM-DD
                oModel.Dates = aSelectedDates;
                this.getBusyDialog();
                const oResponse = await that.ajaxCreateWithJQuery("Allowance", {
                    data: oModel
                });
                if (oResponse) {
                    that.Expense.close();
                    that.Exp_onPressClear();
                    await that._fetchCommonData("AllowanceTotalCalculation", "", {
                        AllowanceID: oResponse.AllowanceID, EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
                    });
                    this.closeBusyDialog();
                    that.onChangeEmployeeID();
                    await that.Exp_onSearch();
                    MessageToast.show(that.i18nModel.getText("allowanceCreatedMess"));
                } else {
                    MessageToast.show(that.i18nModel.getText("allowanceCreatedMessFailed"));
                }
            } catch (oError) {
                MessageToast.show(that.i18nModel.getText("allowanceCreatedMessFailed"));
            } finally {
                this.closeBusyDialog();
            }
        },

        Exp_onCheckExpenseDetails: function(oEvent) {
            var AllowanceID = oEvent.getSource().getBindingContext("AllowanceModel").getObject().AllowanceID;
            this.getRouter().navTo("RouteAllowanceDetails", {
                sPath: AllowanceID.replaceAll("/", "")
            });
        },

        Exp_onLiveExpenseName: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

        Exp_onChangeCountry: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent, "oEvent");
            const oSelectedItem = oEvent.getSource().getSelectedItem();
            const oStateCombo = sap.ui.getCore().byId("All_id_State");
            const oSourceCombo = sap.ui.getCore().byId("All_id_Source");
            const oDestCombo = sap.ui.getCore().byId("All_id_Destination");
            const oModel = this.getView().getModel("CreateAllowanceModel");

            // Clear dependents first
            oStateCombo.setSelectedKey("");
            oStateCombo.getBinding("items")?.filter([]);
            oSourceCombo.setSelectedKey("");
            oSourceCombo.getBinding("items")?.filter([]);
            oDestCombo.setSelectedKey("");
            oDestCombo.getBinding("items")?.filter([]);

            if (!oSelectedItem) {
                // Reset model properties
                oModel.setProperty("/Country", "");
                oModel.setProperty("/State", "");
                oModel.setProperty("/Source", "");
                oModel.setProperty("/Destination", "");
            } else {
                // Fetch selected country
                const sCountryCode = oSelectedItem.getAdditionalText(); // e.g. "IN"
                const CountryName = oSelectedItem.getText();

                // Filter States
                oStateCombo.getBinding("items")?.filter([
                    new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                ]);

                // Update model
                oModel.setProperty("/Country", CountryName || "");
            }
        },

        Exp_onChangeState: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent, "oEvent");

            const oSelectedItem = oEvent.getSource().getSelectedItem();
            const oCitySource = sap.ui.getCore().byId("All_id_Source");
            const oCityDest = sap.ui.getCore().byId("All_id_Destination");
            const oCountryCB = sap.ui.getCore().byId("All_id_Country");
            const oModel = this.getView().getModel("CreateAllowanceModel");

            // Clear cities
            oCitySource.setSelectedKey("");
            oCitySource.getBinding("items")?.filter([]);
            oCityDest.setSelectedKey("");
            oCityDest.getBinding("items")?.filter([]);

            if (!oSelectedItem) {
                oModel.setProperty("/State", "");
                oModel.setProperty("/Source", "");
                oModel.setProperty("/Destination", "");
            } else {
                const sStateName = oSelectedItem.getKey() || oSelectedItem.getText();
                const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();

                // Filter Cities (Source + Destination)
                const aFilters = [
                    new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                    new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                ];

                oCitySource.getBinding("items")?.filter(aFilters);
                oCityDest.getBinding("items")?.filter(aFilters);

                oModel.setProperty("/State", sStateName || "");
            }
        },

        Exp_onChangeSource: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
            if (oEvent.getSource().getValue() === '') {
                oEvent.getSource().setValueState("None");
            }
        },

        Exp_onChangeDestination: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
            if (oEvent.getSource().getValue() === '') {
                oEvent.getSource().setValueState("None");
            }
        },

        Exp_onChangeEmployeeRemark: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

        // Delete the Expenase and Expense Item
        Exp_onPressDeleteExpense: async function(oEvent) {
            var that = this;
            this.showConfirmationDialog(
                this.i18nModel.getText("msgBoxConfirm"),
                this.i18nModel.getText("commonMesBoxConfirmDeleteAllowance"),
                async function() {
                        that.getBusyDialog();
                        try {
                            await that.ajaxDeleteWithJQuery("/Allowance", {
                                filters: {
                                    AllowanceID: that.DeleteAllowanceID
                                }
                            });
                            MessageToast.show(that.i18nModel.getText("allowanceDeleteMess")); // <== use 'that' instead of 'this'
                            that.onChangeEmployeeID();
                            that.Exp_onSearch();
                            that.byId("All_id_DeleteBtn").setEnabled(false);
                        } catch (error) {
                            MessageToast.show(error.responseText || "Error deleting allowance");
                        } finally {
                            that.closeBusyDialog();
                        }
                    },
                    function() {
                        that.closeBusyDialog();
                    })
        },

         //Filter Function
        Exp_onSearch: async function() {
            try {
                this.getBusyDialog();
                var oTable = this.getView().byId("All_id_Expense");
                oTable.setEnableBusyIndicator(true);

                const aFilterItems = this.byId("All_id_FilterBar").getFilterGroupItems();
                const params = {
                    "EmployeeID": this.LoginModel.getProperty("/EmployeeID")
                };

                let dateRangeProvided = false;
                aFilterItems.forEach((oItem) => { // Parse filter values
                    const oControl = oItem.getControl();
                    const sKey = oItem.getName();

                    if (oControl && typeof oControl.getValue === "function") {
                        const sValue = oControl.getValue().trim();
                        if (sKey === "AllowanceDate" && sValue.includes("-")) {
                            const [start, end] = sValue.split("-").map(date =>
                                date.trim().split("/").reverse().join("-")
                            );
                            params.AllowanceStartDate = start;
                            params.AllowanceEndDate = end;
                            dateRangeProvided = true;
                        } else if (sValue) {
                            params[sKey] = sValue;
                        }
                    }
                });

                // Get Financial Year Start & End
                const currentYear = new Date().getFullYear();
                let fyStart, fyEnd, financialYearLabel;
                if (new Date().getMonth() >= 3) {
                    fyStart = new Date(currentYear, 3, 1); // April 1
                    fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
                    financialYearLabel = `${currentYear}-${currentYear + 1}`;
                } else {
                    fyStart = new Date(currentYear - 1, 3, 1);
                    fyEnd = new Date(currentYear, 2, 31);
                    financialYearLabel = `${currentYear - 1}-${currentYear}`;
                }
                const formatDate = (date) => date.toISOString().split("T")[0];
                if (this._isClearPressed) { // Handle clear button pressed
                    delete params.AllowanceStartDate	;
                    delete params.AllowanceEndDate;
                    delete params.FinancialYear;
                    this._isClearPressed = false;
                } else if (!dateRangeProvided) { // Apply financial year filter
                    params.AllowanceStartDate = formatDate(fyStart);
                    params.AllowanceEndDate = formatDate(fyEnd);
                    params.FinancialYear = financialYearLabel;
                    const dateRangeControl = this.byId("All_id_InvoiceDatePicker");
                    if (dateRangeControl) {
                        dateRangeControl.setDateValue(fyStart);
                        dateRangeControl.setSecondDateValue(fyEnd);
                    }
                } else {
                    const AllowanceStartDate = new Date(params.AllowanceStartDate); // If user selected date matches FY, attach FinancialYear
                    const AllowanceEndDate = new Date(params.AllowanceEndDate);
                    if (AllowanceStartDate.getTime() === fyStart.getTime() && AllowanceEndDate.getTime() === fyEnd.getTime()) {
                        params.FinancialYear = financialYearLabel;
                    }
                }
                await this._fetchCommonData("Allowance", "AllowanceModel", params, ["All_id_Expense"]); // Fetch Data
                this.onChangeEmployeeID(params);
                this.closeBusyDialog();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },

        Exp_onPressClear: async function() {
            this.byId("All_id_EmployeeName").setSelectedKey("");
            this.byId("All_id_ConsFilterBar").setSelectedKey("");
            this.byId("All_id_SourceFilter").setSelectedKey("");
            this.byId("All_id_DestinationFilter").setSelectedKey("");
            this.byId("All_id_StatusFilter").setSelectedKey("");
            this.byId("All_id_InvoiceDatePicker").setValue("");
            this._isClearPressed = true;
        },

        Exp_onChangeExpenseType: function(oEvent) {
            if (oEvent.getSource()._getSelectedItemText() !== 'Customer Facing') {
                this.ViewModel.setProperty("/required", false);
            } else {
                this.ViewModel.setProperty("/required", true);
            }
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        getGroupHeader: function(oGroup) {
            return this.getStyledGroupHeader(oGroup);
        },

        exp_validateTravelAllownce: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        }
    });
});