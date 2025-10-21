sap.ui.define([
        "./BaseController",
        "sap/ui/model/json/JSONModel",
        "../utils/validation",
        "sap/m/MessageToast",
        "../model/formatter",
        "sap/m/MessageBox",
        "sap/suite/ui/commons/Timeline",
        "sap/suite/ui/commons/TimelineItem",
    ],
    function(Controller, JSONModel, utils, MessageToast, Formatter, MessageBox, Timeline, TimelineItem) {
        "use strict";
        return Controller.extend("sap.kt.com.minihrsolution.controller.AllowanceDetails", {
            Formatter: Formatter,
            onInit: function() {
                // Attach route matched event for "RouteAllowanceDetails"
                this.getRouter().getRoute("RouteAllowanceDetails").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function(oEvent) {
                var LoginFUnction = await this.commonLoginFunction("Allowance");
                if (!LoginFUnction) return;
                this.getBusyDialog();
                this.scrollToSection("AllItem_id_objectPageLayoutExpence", "AllItem_id_ExpObjectPageSection");
                try {
                    this.byId("AllItem_id_objectPageLayoutExpence").setHeaderContentPinned(true); /// Header content pinned
                    this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                    this.AllowanceID = oEvent.getParameter("arguments").sPath;

                    this.MyInBox = false;
                    if (this.AllowanceID.includes("MyInbox")) {
                        this.AllowanceID = this.AllowanceID.split("|")[0];
                        this.MyInBox = true;
                    }
                    await this._fetchCommonData("Allowance", "FilteredAllowanceModel", {
                        AllowanceID: this.AllowanceID,
                    });

                    var viewModel = new JSONModel({
                        isEditMode: false,
                        status: true,
                        editable: false,
                        enable: true,
                        enableDelete: true,
                        required: true,
                        SubmitBtn: false,
                        SaveBtn: false,
                        DateVisible: false,
                        MutiDateVis: false
                    });

                    this.getView().setModel(viewModel, "viewModel");
                    this.LoginModel = this.getView().getModel("LoginModel");
                    this.ViewModel = this.getView().getModel("viewModel");

                    var oUploadModel = new sap.ui.model.json.JSONModel({
                        File: "",
                        FileName: "",
                        FileType: ""
                    });
                    this.getView().setModel(oUploadModel, "UploadModel");
                    this.FilteredAllowanceModel = this.getView().getModel("FilteredAllowanceModel").getData();
                    this.IndexNoIncreent();
                    if (this.FilteredAllowanceModel[0].Status === "Submitted" || this.FilteredAllowanceModel[0].Status === "Send to account") {
                        this.byId("AllItem_id_ItemTable").setMode(sap.m.ListMode.None);
                    } else {
                        this.byId("AllItem_id_ItemTable").setMode(sap.m.ListMode.SingleSelectLeft);
                    }

                    if (
                        this.FilteredAllowanceModel[0].Status === "Draft" ||
                        this.FilteredAllowanceModel[0].Status === "Send back by manager" ||
                        this.FilteredAllowanceModel[0].Status === "Send back by account"
                    ) {
                        this.ViewModel.setProperty("/status", true);
                    } else {
                        this.ViewModel.setProperty("/status", false);
                    }

                    if (this.FilteredAllowanceModel[0].TripType !== "Customer Facing") {
                        this.ViewModel.setProperty("/required", false);
                    }
                    var oTokenModel = new JSONModel({
                        tokens: []
                    });
                    this.getView().setModel(oTokenModel, "tokenModel");
                    this.CountryAndCity();
                    this._applyCountryStateCityFilters();
                    this.closeBusyDialog();
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            },

            _applyCountryStateCityFilters: function() {
                const oModel = this.getView().getModel("FilteredAllowanceModel");
                const oCountryCB = this.byId("AllItem_id_Country");
                const oStateCB = this.byId("AllItem_id_State");
                const oSourceCB = this.byId("AllItem_id_Source");
                const oDestCB = this.byId("AllItem_id_Destination");

                const sCountry = oModel.getProperty("/0/Country"); // e.g. "Australia"
                const sState = oModel.getProperty("/0/State"); // e.g. "Queensland"
                const sSource = oModel.getProperty("/0/Source"); // e.g. "Bongaree"
                const sDest = oModel.getProperty("/0/Destination"); // e.g. "Bongaree"

                oStateCB.getBinding("items")?.filter([]); // Reset all filters
                oSourceCB.getBinding("items")?.filter([]);
                oDestCB.getBinding("items")?.filter([]);

                if (sCountry) {
                    const aCountryData = this.getView().getModel("CountryModel").getData(); // Find countryCode by name
                    const oCountryObj = aCountryData.find(c => c.countryName === sCountry);
                    if (oCountryObj) {
                        const sCountryCode = oCountryObj.code;
                        oStateCB.getBinding("items")?.filter([ // Filter States by Country
                            new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                        ]);

                        if (sState) {
                            const aFilters = [ // Filter Cities by State + Country
                                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sState),
                                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                            ];
                            oSourceCB.getBinding("items")?.filter(aFilters);
                            oDestCB.getBinding("items")?.filter(aFilters);
                        }
                    }
                }

                oCountryCB.setValue(sCountry || ""); // Ensure values are set back in UI
                oStateCB.setValue(sState || "");
                oSourceCB.setValue(sSource || "");
                oDestCB.setValue(sDest || "");
            },

            onLogout: function() {
                this.CommonLogoutFunction();
            },
            onAddItemAllowance: function() {
                var year = new Date(this.FilteredAllowanceModel[0]?.AllowanceStartDate).getFullYear();
                var month = new Date(this.FilteredAllowanceModel[0].AllowanceStartDate).getMonth();
                let date = new Date(year, month, 1); // month is 0-based (0 = Jan)
                let dates = [];

                while (date.getMonth() === month) {
                    // Format date as dd/mm/yyyy
                    let day = String(date.getDate()).padStart(2, '0');
                    let mon = String(date.getMonth() + 1).padStart(2, '0');
                    let yr = date.getFullYear();
                    let sWeekday = date.toLocaleDateString('en-US', {
                        weekday: 'long'
                    });

                    let formattedDate = `${day}/${mon}/${yr}`;
                    dates.push({
                        key: formattedDate,
                        day: formattedDate,
                        weekday: sWeekday
                    });
                    
                    // Move to next day
                    date.setDate(date.getDate() + 1);
                }
                var oModel = new sap.ui.model.json.JSONModel({
                    dates: dates
                });
                this.getView().setModel(oModel);
            },
            // Allowance Item Index increment and ItemAllowance Read call
            IndexNoIncreent: function() {
                var that = this;
                var oView = this.getView();
                this.getBusyDialog();

                this._fetchCommonData("Allowance", "ItemAllowanceModel", {
                    EmployeeID: that.FilteredAllowanceModel[0].EmployeeID,
                    AllowanceID: that.AllowanceID
                })
                .then(function() {
                    let modelData = oView.getModel("ItemAllowanceModel").getData();

                    if (!Array.isArray(modelData) || modelData.length === 0) {
                        that.IndexNo = 0;
                        return;
                    }

                    let expandedData = [];
                    modelData.forEach(item => {
                        if (item.Dates) {
                            let dates = item.Dates.split(","); // Split by comma
                            dates.forEach(date => {
                                expandedData.push({
                                    ...item,
                                    Dates: date.trim()
                                });
                            });
                        } else {
                            expandedData.push(item);
                        }
                    });

                    // Sort by Dates
                    expandedData.sort((a, b) => {
                        const parseDate = (dateStr) => {
                            const [day, month, year] = dateStr.split("/");
                            return new Date(`${year}-${month}-${day}`);
                        };
                        return parseDate(a.Dates) - parseDate(b.Dates);
                    });

                    // Add IndexNo
                    expandedData.forEach((item, index) => {
                        item.IndexNo = index + 1;
                        that.IndexNo = index + 1;
                    });

                    oView.getModel("ItemAllowanceModel").setData(expandedData);

                })
                .catch(function(error) {
                    that.IndexNo = 0;
                })
                .finally(function() {
                    that.closeBusyDialog();
                });
            },

            //Open Fragment in Expeanse Item Create and Update 
            openFragment: function() {
                var oView = this.getView();
                var oModel = oView.getModel("FilteredAllowanceModel").getData()[0];
                this.ViewModel.setProperty("/MinDate", new Date(oModel.AllowanceStartDate.split("/").reverse().join("-")));
                this.ViewModel.setProperty("/MaxDate", new Date(oModel.AllowanceEndDate.split("/").reverse().join("-")));
                var oView = this.getView();
                if (!this.AllowanceItem) {
                    this.AllowanceItem = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AddItemAllowance",
                        controller: this,
                    }).then(
                        function(AllowanceItem) {
                            this.AllowanceItem = AllowanceItem;
                            oView.addDependent(this.AllowanceItem);
                            this.AllowanceItem.open();
                        }.bind(this)
                    );
                } else {
                    this.AllowanceItem.open();
                }
            },

            Exp_Det_onChangeExpanesItem: function(oEvent) {
                this.SelectedData = oEvent.getSource().getSelectedItem().getBindingContext("ItemAllowanceModel").getObject();
                if (this.SelectedData.ItemType === "Peridiem") {
                    this.ViewModel.setProperty("/enable", true);
                    this.ViewModel.setProperty("/enableDelete", false);
                } else {
                    this.ViewModel.setProperty("/enable", true);
                    this.ViewModel.setProperty("/enableDelete", true);
                }
            },

            //  Create Allowance Item
            Exp_Det_onPressAddExpenseItem: function() {
                this.ViewModel.setProperty("/SubmitBtn", true);
                this.ViewModel.setProperty("/enable", true);
                this.ViewModel.setProperty("/MutiDateVis", true);
                this.ViewModel.setProperty("/DateVisible", false);
                this.ViewModel.setProperty("/SaveBtn", false);
                this.onAddItemAllowance();
                var jsonAllowance = {
                    EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
                    EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
                    IndexNo: this.IndexNo + 1,
                    AllowanceAmount: "0",
                    Currency: "INR",
                    Dates: (this.getView().getModel("FilteredAllowanceModel").getData()[0].Dates),
                    Comments: "",
                    Submit: true,
                    Save: false,
                    ConversionRate: "0",
                    ForeignAmount: "0",
                };
                var oAllowanceCreateModel = new JSONModel(jsonAllowance);
                this.getView().setModel(oAllowanceCreateModel, "AllowanceCreateModel");
                this.openFragment();
                var oDateMultiBox = sap.ui.getCore().byId("dateMultiBoxFrag");
                if (oDateMultiBox) {
                    oDateMultiBox.removeAllSelectedItems();
                }
            },

            onChangeCurrency: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },

            //Update Allowance Items
            Exp_Det_onPressExpenseItemEdit: function() {
                if (this.byId("AllItem_id_ItemTable").getSelectedItem() === null) {
                    return MessageToast.show(this.i18nModel.getText("allowanceEditSelectRowMess"));
                }
                this.ViewModel.setProperty("/SubmitBtn", false);
                this.ViewModel.setProperty("/SaveBtn", true);
                this.ViewModel.setProperty("/MutiDateVis", false);
                this.ViewModel.setProperty("/DateVisible", true);
                this.openFragment();
                if (this.SelectedData.ItemType === "NIGHT ALLOWANCE") {
                    this.ViewModel.setProperty("/enable", false);
                } else {
                    this.ViewModel.setProperty("/enableDelete", true);
                }
                var jsonAllowance = {
                    IndexNo: this.SelectedData.IndexNo,
                    ItemID: this.SelectedData.ItemID,
                    ItemType: this.SelectedData.ItemType,
                    AllowanceAmount: this.SelectedData.Currency === "INR" ? this.SelectedData.AllowanceAmount : this.SelectedData.ForeignAmount,
                    Currency: this.SelectedData.Currency,
                    ModeOfPayment: this.SelectedData.ModeOfPayment,
                    AllowanceDate: (this.SelectedData.AllowanceDate),
                    Comments: this.SelectedData.Comments,
                    ConversionRate: this.SelectedData.ConversionRate,
                    ForeignAmount: this.SelectedData.ForeignAmount,
                    TotalAmount: this.SelectedData.AllowanceAmount,
                    Submit: false,
                    Save: true,
                };
                var oAllowanceCreateModel = new JSONModel(jsonAllowance);
                this.getView().setModel(oAllowanceCreateModel, "AllowanceCreateModel");
            },

            // close Fragment
            Exp_Det_onPressClose: function() {
                // sap.ui.getCore().byId("item_id_Amount").setValueState("None");
                // sap.ui.getCore().byId("item_id_ConvertionRate").setValueState("None");
                // sap.ui.getCore().byId("item_id_Comments").setValueState("None");
                // sap.ui.getCore().byId("item_id_ItemType").setValueState("None");
                sap.ui.getCore().byId("dateMultiBoxFrag").setValueState("None");
                this.byId("AllItem_id_ItemTable").removeSelections();
                this.ViewModel.setProperty("/enable", true);
                this.AllowanceItem.close();
            },

            onSelectdate: function(oEvent) {
                var oMultiComboBox = oEvent.getSource();
                var sNewValue = oEvent.getParameter("newValue");
                if (sNewValue) {
                    oMultiComboBox.setValueState("None");
                } else {
                    oMultiComboBox.setValueState("Error");
                    oMultiComboBox.setValueStateText(this.i18nModel.getText("selectDate"));
                }
            },

            Exp_Det_onPressBackBtn: function() {
                if (this.MyInBox) {
                    this.getRouter().navTo("RouteMyInbox", {
                        sMyInBox: "AllowanceDetails"
                    });
                } else {
                    if (this.ViewModel.getProperty("/isEditMode")) {
                        this.showConfirmationDialog(
                            this.i18nModel.getText("ConfirmActionTitle"),
                            this.i18nModel.getText("backConfirmation"),
                            function() {
                                this.getRouter().navTo("RouteAllowancePage");
                            }.bind(this),
                        );
                    } else {
                        this.getRouter().navTo("RouteAllowancePage");
                    }
                    this.byId("AllItem_id_Country").setValueState("None");
                    this.byId("AllItem_id_Source").setValueState("None");
                    this.byId("AllItem_id_Destination").setValueState("None");
                }
            },

            Exp_Det_onEditOrSavePress: function() {
                var isEditMode = this.ViewModel.getProperty("/isEditMode");
                this.byId("AllItem_id_ItemTable").removeSelections();
                if (isEditMode) {
                    this.onPressSave();
                } else {
                    this.onMyButtonPressEdit();
                }
            },

            onMyButtonPressEdit: function() {
                this.ViewModel.setProperty("/editable", true);
                this.ViewModel.setProperty("/isEditMode", true);
                this.ViewModel.setProperty("/enable", false);
                this.ViewModel.setProperty("/enableDelete", false);
            },

            //Amount Validation
            LC_ExpAmount: function(oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.Exp_Frg_onChangeConverstionRate();
            },
            // Conversion Rate validation
            LC_ExpConversionRate: function(oEvent) {
                utils._LCvalidateMultipleDecimal(oEvent);
                this.Exp_Frg_onChangeConverstionRate();
            },
            //Comments Validation
            LC_ExpComments: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            LC_ValidateDate: function(oEvent) {
                const oToDatePicker = oEvent.getSource(); // DatePicker control
                const oToDate = oToDatePicker.getDateValue(); // Date object
                if (oToDate) {
                    oToDatePicker.setValueState("None"); // Clear error state
                }
            },

            //Source Validation
            Exp_Det_SourceChange: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent, "oEvent");
                if (oEvent.getSource().getValue() === '') {
                    oEvent.getSource().setValueState("None")
                }
            },
            // Destination Validation
            Exp_Det_DestinationChange: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent, "oEvent");
                if (oEvent.getSource().getValue() === '') {
                    oEvent.getSource().setValueState("None")
                }
            },

            Exp_Det_CountryChange: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent, "oEvent");
                const oCountryCB = this.byId("AllItem_id_Country");
                const oStateCB = this.byId("AllItem_id_State");
                const oSourceCB = this.byId("AllItem_id_Source");
                const oDestCB = this.byId("AllItem_id_Destination");
                const oModel = this.getView().getModel("FilteredAllowanceModel");
                oStateCB.setValue("");
                oStateCB.getBinding("items")?.filter([]);
                oSourceCB.setValue("");
                oSourceCB.getBinding("items")?.filter([]);
                oDestCB.setValue("");
                oDestCB.getBinding("items")?.filter([]);

                const oSelectedItem = oCountryCB.getSelectedItem();
                if (!oSelectedItem) {
                    oModel.setProperty("/0/Country", ""); // reset model
                    oModel.setProperty("/0/State", "");
                    oModel.setProperty("/0/Source", "");
                    oModel.setProperty("/0/Destination", "");
                    return;
                }

                const sCountryCode = oSelectedItem.getAdditionalText(); // --- Filter States by Country ---
                oStateCB.getBinding("items")?.filter([
                    new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                ]);

                // update model 
                oModel.setProperty("/0/Country", oSelectedItem.getText());
                this.CountryAndCity();
            },

            Exp_Det_StateChange: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent, "oEvent");
                const oStateCB = this.byId("AllItem_id_State");
                const oSourceCB = this.byId("AllItem_id_Source");
                const oDestCB = this.byId("AllItem_id_Destination");
                const oCountryCB = this.byId("AllItem_id_Country");
                const oModel = this.getView().getModel("FilteredAllowanceModel");

                oSourceCB.setValue(""); // Reset cities
                oSourceCB.getBinding("items")?.filter([]);
                oDestCB.setValue("");
                oDestCB.getBinding("items")?.filter([]);

                const oSelectedItem = oStateCB.getSelectedItem();
                if (!oSelectedItem) {
                    oModel.setProperty("/0/State", "");
                    oModel.setProperty("/0/Source", "");
                    oModel.setProperty("/0/Destination", "");
                    return;
                }

                const sStateName = oSelectedItem.getKey() || oSelectedItem.getText();
                let sCountryCode = "";
                const oCountryItem = oCountryCB.getSelectedItem();
                if (oCountryItem) {
                    sCountryCode = oCountryItem.getAdditionalText(); // Use selected item
                } else {
                    const sCountryValue = oCountryCB.getValue();
                    const aCountries = this.getView().getModel("CountryModel").getData();
                    const oMatch = aCountries.find(item => item.countryName === sCountryValue);
                    if (oMatch) {
                        sCountryCode = oMatch.code || oMatch.CountryCode; // Match actual property
                    }
                }
                const aFilters = [
                    new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                    new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                ];

                oSourceCB.getBinding("items")?.filter(aFilters);
                oDestCB.getBinding("items")?.filter(aFilters);
                oModel.setProperty("/0/State", sStateName);
            },

            CountryAndCity: function() {
                var Code = this.getView().getModel("CountryModel").getData().filter((item) => item.countryName === this.byId("AllItem_id_Country").getValue());
                var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, Code[0].code);
                this.byId("AllItem_id_Source").getBinding("items").filter(oFilter);
                this.byId("AllItem_id_Destination").getBinding("items").filter(oFilter);
            },

            onPressSave: async function() {
                if (utils._LCvalidateMandatoryField(this.byId("AllItem_id_Source"), "ID") && (this.ViewModel.getProperty("/required") === true ? utils._LCvalidateMandatoryField(this.byId("AllItem_id_Destination"), "ID") : true) && utils._LCstrictValidationComboBox(this.byId("AllItem_id_Country"), "ID") && utils._LCstrictValidationComboBox(this.byId("AllItem_id_State"), "ID")) {
                    var oModel = this.getView().getModel("FilteredAllowanceModel");
                    delete oModel.getData()[0].Comments;
                    oModel.getData()[0].Visible = false;
                    var oData = {
                        data: oModel.getData()[0],
                        filters: {
                            AllowanceID: oModel.getData()[0].AllowanceID,
                        },
                    };
                    this.getBusyDialog();
                    await this.ajaxUpdateWithJQuery("Allowance", oData)
                        .then((oData) => {
                            if (oData) {
                                this.ViewModel.setProperty("/editable", false);
                                this.ViewModel.setProperty("/isEditMode", false);
                                this.ViewModel.setProperty("/enable", true);
                                this.ViewModel.setProperty("/enableDelete", true);
                                MessageToast.show(this.i18nModel.getText("allowanceUpdateMess"));
                            } else {
                                MessageToast.show(this.i18nModel.getText("allowanceUpdateMessFailed"));
                            }
                            this.closeBusyDialog();
                        })
                        .catch((oError) => {
                            this.closeBusyDialog();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            Exp_Frg_onItemTypeChange: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                var oText = oEvent.getSource().getSelectedItem().getText();
                if (oText === "NIGHT ALLOWANCE") {
                    this.ViewModel.setProperty("/enable", false);
                    this.getView().getModel("AllowanceCreateModel").getData().AllowanceAmount = 0;
                    this.getView().getModel("AllowanceCreateModel").getData().ModeOfPayment = "Employee";
                } else {
                    this.ViewModel.setProperty("/enable", true);
                }
            },

            _LCvalidateMultiComboBox: function(oMultiComboBox) {
                if (!oMultiComboBox) return false;
                var aSelectedKeys = oMultiComboBox.getSelectedKeys();
                if (!aSelectedKeys || aSelectedKeys.length === 0) {
                    oMultiComboBox.setValueState("Error");
                    oMultiComboBox.setValueStateText(this.i18nModel.getText("selectDate")); // from i18n
                    return false;
                }
                oMultiComboBox.setValueState("None");
                return true;
            },

            async Exp_Det_onPressSubmit() {
                var oModel = this.getView().getModel("AllowanceCreateModel").getData();
                var oItemModel = this.getView().getModel("ItemAllowanceModel").getData(); // Existing saved items
                if (this._LCvalidateMultiComboBox(sap.ui.getCore().byId("dateMultiBoxFrag"))) {
                    var FilterModel = this.getView().getModel("FilteredAllowanceModel").getData()[0];
                    var aSelectedDates = sap.ui.getCore().byId("dateMultiBoxFrag").getSelectedKeys(); // array of YYYY-MM-DD
                   // oModel.Dates = aSelectedDates;

                  let oDateBox = sap.ui.getCore().byId("dateMultiBoxFrag");
                    let selectedDates = [];
                    if (oDateBox.getVisible()) {
                        selectedDates = oDateBox.getSelectedKeys(); // ["01/10/2025", ...]
                    } else {
                        selectedDates = [oModel.AllowanceDate];
                    }

                    // Convert existing item dates to the same format as selectedDates
                    const existingDates = oItemModel.map(item => item.AllowanceDate); // ["01/10/2025", ...]

                    // Find duplicates
                    const duplicateDates = selectedDates.filter(date => existingDates.includes(date));

                    if (duplicateDates.length > 0) {
                        MessageToast.show(`Allowance already exists for: ${duplicateDates.join(", ")}`);
                        
                        // Remove duplicates from selection
                        const newSelectedDates = selectedDates.filter(date => !duplicateDates.includes(date));
                        oDateBox.setSelectedKeys(newSelectedDates); // update MultiComboBox visually
                        
                        if (newSelectedDates.length === 0) return; // stop if no new dates
                        
                        selectedDates = newSelectedDates; // continue with non-duplicate dates
                    }

                    // Now selectedDates only contains valid, non-duplicate dates
                    aSelectedDates = selectedDates;

                    if (oModel.Currency !== "INR") this.Exp_Frg_onChangeConverstionRate();
                    var oData = {
                        data: {
                            // Comments: oModel.Comments,
                            AllowanceID: FilterModel.AllowanceID,
                            ConversionRate: oModel.Currency !== "INR" ? oModel.ConversionRate : "1",
                            Currency: oModel.Currency,
                            Country: FilterModel.Country,
                            EmployeeName: FilterModel.EmployeeName,
                            EmployeeID: FilterModel.EmployeeID,
                            AllowanceAmount: oItemModel[0].AllowanceAmount,
                            Dates: aSelectedDates,
                            ForeignAmount: oItemModel[0].ForeignAmount,
                        },
                    };
                    this.getBusyDialog();
                    try {
                        const oCreateResponse = await this.ajaxUpdateWithJQuery("AllowanceDetail", oData);
                        if (oCreateResponse) {
                            MessageToast.show(this.i18nModel.getText("allowanceCreatedMess"));
                            this._fetchCommonData("Allowance", "FilteredAllowanceModel", {
                                AllowanceID: this.AllowanceID,
                            });
                            this.IndexNoIncreent();
                            this.ViewModel.setProperty("/enable", true);
                            this.AllowanceItem.close();
                            this.AllowanceTotalCalculation();
                            this.closeBusyDialog();
                            var oDateMultiBox = sap.ui.getCore().byId("dateMultiBoxFrag");
                            if (oDateMultiBox) {
                                oDateMultiBox.removeAllSelectedItems();
                            }
                        } else {
                            MessageToast.show(this.i18nModel.getText("allowanceCreatedMessFailed"));
                            this.closeBusyDialog();
                        }
                    } catch (oError) {
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    }
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            async Exp_Det_onPressSaveExpense() {
                var oModel = this.getView().getModel("AllowanceCreateModel").getData();
                var FilterModel = this.getView().getModel("FilteredAllowanceModel").getData()[0];
                if (utils._LCvalidateDate(sap.ui.getCore().byId("item_id_AllowanceDate"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("item_id_ConvertionRate"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("item_id_ItemType"), "ID") &&
                    (
                        oModel.ItemType === "NIGHT ALLOWANCE" ?
                        true :
                        (
                            utils._LCvalidateAmount(sap.ui.getCore().byId("item_id_Amount"), "ID") &&
                            utils._LCstrictValidationComboBox(sap.ui.getCore().byId("item_id_Currency"), "ID") &&
                            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("item_id_Comments"), "ID") &&
                            (
                                oModel.Currency !== "INR" ?
                                utils._LCvalidateMultipleDecimal(sap.ui.getCore().byId("item_id_ConvertionRate"), "ID") :
                                true
                            )))) {

                    if (oModel.Currency !== "INR") this.Exp_Frg_onChangeConverstionRate();
                    var oData = {
                        data: {
                            Comments: oModel.Comments,
                            AllowanceID: FilterModel.AllowanceID,
                            ConversionRate: oModel.Currency !== "INR" ? oModel.ConversionRate : "1",
                            Currency: oModel.Currency,
                            EmployeeID: FilterModel.EmployeeID,
                            AllowanceAmount: oModel.Currency !== "INR" ? oModel.TotalAmount : oModel.AllowanceAmount,
                            AllowanceDate: oModel.AllowanceDate,
                            ForeignAmount: oModel.AllowanceAmount,
                            ItemType: oModel.ItemType,
                            ModeOfPayment: oModel.ModeOfPayment,
                        },
                        filters: {
                            ItemID: this.SelectedData.ItemID,
                        },
                    };
                    this.getBusyDialog();
                    await this.ajaxUpdateWithJQuery("ItemAllowance", oData)
                        .then((oData) => {
                            if (oData) {
                                this._fetchCommonData("Allowance", "FilteredAllowanceModel", {
                                    AllowanceID: this.AllowanceID,
                                });
                                this.IndexNoIncreent();
                                this.AllowanceTotalCalculation();
                                this.AllowanceItem.close();
                                this.ViewModel.setProperty("/enable", true);
                                MessageToast.show(this.i18nModel.getText("allowanceUpdateMess"));
                                this.closeBusyDialog();
                            } else {
                                MessageToast.show(this.i18nModel.getText("allowanceUpdateMessFailed"));
                                this.closeBusyDialog();
                            }
                        })
                        .catch((oError) => {
                            this.closeBusyDialog();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                } else {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            Exp_Det_onPressExpenseItemDelete: async function() {
                const that = this;
                const selectedItem = this.byId("AllItem_id_ItemTable").getSelectedItem();
                if (!selectedItem) {
                    return MessageToast.show(this.i18nModel.getText("allowanceDeleteSelectRowMess"));
                }
                this.showConfirmationDialog(
                    this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("commonMesBoxConfirmDeleteAllowance"),
                    async function() {
                            that.getBusyDialog();
                            try {
                                await that.ajaxUpdateWithJQuery("/AllowanceDelete", {
                                    data: {
                                        Dates: selectedItem.getBindingContext("ItemAllowanceModel").getObject().Dates,
                                        AllowanceID: selectedItem.getBindingContext("ItemAllowanceModel").getObject().AllowanceID,
                                    }
                                });

                                MessageToast.show(that.i18nModel.getText("allowanceItemDeleteMess"));
                                await that.AllowanceTotalCalculation();
                                await that.IndexNoIncreent();
                            } catch (error) {
                                MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                            } finally {
                                that.closeBusyDialog();
                            }
                        },
                        function() {
                            that.closeBusyDialog();
                        });
            },

            AllowanceTotalCalculation: async function() {
                await this._fetchCommonData("AllowanceTotalCalculation", "", {
                    AllowanceID: this.AllowanceID
                });
                await this._fetchCommonData("Allowance", "FilteredAllowanceModel", {
                    AllowanceID: this.AllowanceID
                });
            },

            Exp_Det_onPressSubmitExpenseItems: function() {
                var that = this;
                var oModelData = that.getView().getModel("FilteredAllowanceModel").getData()[0];

                if (oModelData.TotalAmount <= 0) {
                    return MessageBox.error(that.i18nModel.getText("allowanceTotalAmountMess"));
                }

                var itemAllowances = that.getView().getModel("ItemAllowanceModel").getData();

                if (oModelData.TravelAllowance === "YES") {
                    var hasPerDiemDeclaration = itemAllowances.some(function(item) {
                        return item.ItemType === "Perdiem Declaration";
                    });

                    if (!hasPerDiemDeclaration) {
                        return MessageBox.error(that.i18nModel.getText("expensePerdiemDeclarationValidation"));
                    }
                }

                var checkbox = new sap.m.CheckBox({
                    text: that.i18nModel.getText("allowanceSubmittedMess"),
                    selected: false
                });

                var commentTextArea = new sap.m.TextArea({
                    placeholder: that.i18nModel.getText("enterComments"),
                    rows: 3,
                    width: "100%",
                    visible: oModelData.Status !== "Draft",
                    value: "",
                    valueState: sap.ui.core.ValueState.None
                });

                // Dialog for submission confirmation
                var dialog = new sap.m.Dialog({
                    title: that.i18nModel.getText("confirmTitle"),
                    type: sap.m.DialogType.Message,
                    content: [checkbox, commentTextArea],
                    beginButton: new sap.m.Button({
                        text: "OK",
                        type: "Transparent",
                        press: function() {
                            if (checkbox.getSelected()) {
                                //  Validate if comment is required and empty
                                if (commentTextArea.getVisible() && !commentTextArea.getValue().trim()) {
                                    commentTextArea.setValueState(sap.ui.core.ValueState.Error);
                                    commentTextArea.setValueStateText(that.i18nModel.getText("commentsValueState"));
                                    return;
                                } else {
                                    commentTextArea.setValueState(sap.ui.core.ValueState.None); // reset if valid
                                }

                                var userComment = commentTextArea.getVisible() ? commentTextArea.getValue().trim() : "";

                                var inboxData = {
                                    data: {
                                        AllowanceID: oModelData.AllowanceID,
                                        EmployeeID: oModelData.EmployeeID,
                                        EmployeeName: oModelData.EmployeeName,
                                        Type: "Allowance",
                                        AllowanceType: oModelData.AllowanceType,
                                        AllowanceStartDate: oModelData.AllowanceStartDate.split("T")[0],
                                        AllowanceEndDate: oModelData.AllowanceEndDate.split("T")[0],
                                        SubmittedDate: that.Formatter.formatDate(new Date()),
                                        Comments: userComment || (oModelData.comments?.[0]?.Comment || ""),
                                        TotalAmount: oModelData.TotalAmount,
                                        Status: oModelData.Status === "Send back by account" ? "Send to account" : "Submitted",
                                        Visible: commentTextArea.getVisible()
                                    },
                                    filters: {
                                        AllowanceID: oModelData.AllowanceID
                                    }
                                };

                                that.getBusyDialog();
                                that.ajaxUpdateWithJQuery("Allowance", inboxData).then((oData) => {
                                    if (oData) {
                                        that._fetchCommonData("Allowance", "FilteredAllowanceModel", {
                                            AllowanceID: that.AllowanceID,
                                        });
                                        that.ViewModel.setProperty("/status", false);
                                        that.byId("AllItem_id_ItemTable").setMode(sap.m.ListMode.None);
                                        dialog.close();
                                        MessageToast.show(that.i18nModel.getText("allowanceSubmittedStatus"));
                                        that.closeBusyDialog();
                                    } else {
                                        MessageToast.show(that.i18nModel.getText("allowanceSubmittedStatusFailed"));
                                        that.closeBusyDialog();
                                    }
                                }).catch((oError) => {
                                    dialog.close();
                                    that.closeBusyDialog();
                                    MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                                });
                            } else {
                                MessageToast.show(that.i18nModel.getText("checkboxUnselectedMessage"));
                            }
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        type: "Transparent",
                        press: function() {
                            dialog.close();
                        }
                    }),
                    afterClose: function() {
                        dialog.destroy();
                    }
                });

                dialog.open();
            },

            Exp_Frg_onChangeConverstionRate: function(oEvent) {
                var oModel = this.getView().getModel("AllowanceCreateModel");
                var oModelAllowanceCreate = oModel.getData();
                if (oModelAllowanceCreate.Currency !== "INR") {
                    var oData = parseFloat(oModelAllowanceCreate.AllowanceAmount) * parseFloat(oModelAllowanceCreate.ConversionRate);
                    oModel.setProperty("/TotalAmount", oData.toFixed(2));
                }
            },

            onShowMore: function(oEvent) {
                var oContext = oEvent.getSource().getBindingContext("ItemAllowanceModel");
                var oData = oContext.getObject();
                var oComment = oData.Comments || {}; // Assuming single comment object

                var oTimelineItem = new sap.suite.ui.commons.TimelineItem({
                    dateTime: (oData.AllowanceDate),
                    title: oData.ItemType || "Anonymous",
                    text: oComment || "No comment provided",
                    userNameClickable: false,
                    icon: "sap-icon://comment"
                });

                var oTimeline = new sap.suite.ui.commons.Timeline({
                    showHeader: false,
                    enableBusyIndicator: false,
                    width: "100%",
                    sortOldestFirst: true,
                    enableDoubleSided: false,
                    content: [oTimelineItem],
                    showHeaderBar: false
                });

                var oDialog = new sap.m.Dialog({
                    title: "Allowance Item Comment",
                    contentWidth: "25rem",
                    contentHeight: "15rem",
                    draggable: true,
                    resizable: true,
                    content: [oTimeline],
                    endButton: new sap.m.Button({
                        text: "Close",
                        type: "Transparent",
                        press: function() {
                            oDialog.close();
                            oDialog.destroy();
                        }
                    })
                });
                oDialog.open();
            },

            onSectionChange: function(oEvent) {
                var oSection = oEvent.getParameter("section");
                if (oSection.getTitle() === 'Comments') {
                    this.AL_onShowEmployeeComments(oEvent);
                }
            },

            AL_onShowEmployeeComments: function(oEvent) {
                var oView = this.getView();
                var aData = oView.getModel("FilteredAllowanceModel").getData();
                var oData = Array.isArray(aData) && aData.length > 0 ? aData[0] : {};
                var aComments = oData.comments || [];

                var aTimelineItems = aComments.reverse().map(function(oComment) {
                    return new sap.suite.ui.commons.TimelineItem({
                        dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
                        title: oComment.CommentedBy || "Anonymous",
                        text: oComment.Comment || "No comment provided",
                        userNameClickable: false,
                        icon: "sap-icon://comment"
                    });
                });
                var oTimeline = new sap.suite.ui.commons.Timeline({
                    showHeader: false,
                    enableBusyIndicator: false,
                    width: "100%",
                    sortOldestFirst: false,
                    enableDoubleSided: false,
                    content: aTimelineItems,
                    showHeaderBar: false
                });
                var oVBox = oView.byId("AllItem_id_timelineContainer");
                oVBox.removeAllItems();
                oVBox.addItem(oTimeline);
            },

            EXP_FRG_validatepaymentMode: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            }
        });
    });