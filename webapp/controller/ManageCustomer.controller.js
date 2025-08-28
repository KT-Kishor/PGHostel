sap.ui.define([
        "./BaseController", //call base controller
        "sap/ui/model/json/JSONModel", //json model
        "sap/m/MessageToast", // Import MessageToast for notifications
        "../utils/validation", //  Import formatter utility
        "sap/m/MessageBox", // Import MessageBox for alerts/confirmations
        "sap/ui/export/Spreadsheet",
    ],
    function(BaseController, JSONModel, MessageToast, utils, MessageBox, Spreadsheet) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageCustomer", {
            onInit: function() {
                this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function(oEvent) {
                var LoginFUnction = await this.commonLoginFunction("Customer");
                if (!LoginFUnction) return;
                this.getBusyDialog(); // Show busy dialog
                var ViewModel = new JSONModel({
                    update: true
                });
                this.getView().setModel(ViewModel, "ViewModel")
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model
                this.byId("MC_id_CustTable").removeSelections(true); // Clear table selection
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerCustomer")); // Set header name
                this.oValue = oEvent.getParameter("arguments").value;
                try {
                    if (this.oValue === "ManageCustomer" || this.oValue === "MSA") {
                        await this.readCallForManageCustomer("Initial");
                        this.MC_onClear(); // Clear the filter bar
                    } else {
                        await this.MC_onSearch(); // Filter function for trainee
                    }
                } catch (error) {
                    sap.m.MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog(); // Hide in all cases
                }
                this.initializeBirthdayCarousel();
                this.initLocationModels(this.getView());
            },

            //common Dialog Function
            manageCustomerDetails: function(bIsEdit) {
                var oModel;
                var data = {
                    save: false,
                    submit: true,
                    CC_id_CustInput: false,
                    selectedIndex: 0
                };
                var visibleData = new JSONModel(data); // Create a new JSON model for visibility
                this.getView().setModel(visibleData, "visiblePlay");
                if (bIsEdit) {
                    var oVisiableModel = this.getView().getModel("visiblePlay");
                    oVisiableModel.setProperty("/save", true); // Set save button visibility
                    oVisiableModel.setProperty("/submit", false); // Set submit button visibility
                    var oTable = this.byId("MC_id_CustTable").getSelectedItem();
                    if (oTable === null) {
                        return MessageBox.error(this.i18nModel.getText("msgCustomer2"));
                    } else {
                        var oData = oTable.getBindingContext("CreateCustomerModel").getObject();
                        this._originalCustomerData = JSON.parse(JSON.stringify(oData));
                        if (oData.GST)
                            this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", true);
                        if (oData.type === "IGST") {
                            this.getView().getModel("visiblePlay").setProperty("/selectedIndex", 1);
                        }
                        this.gstValue = oData.value;
                        oModel = new JSONModel(oData);
                    }
                } else {
                    this._originalCustomerData = null; // Reset original data
                    var oData = {
                        companyName: "",
                        name: "",
                        PAN: "",
                        GST: "",
                        address: "",
                        mailID: "",
                        mobileNo: "",
                        LUT: "",
                        type: "",
                        value: "0",
                        salutation: "Mr.",
                        customerEmail: "",
                        stdCode: "",
                        country: "",
                        countryCode: "",
                        state: "",
                        baseLocation: "",
                        HeadPosition: ""
                    };
                    oModel = new JSONModel(oData);
                }
                this.getView().setModel(oModel, "CustomerModel");
                if (!this.oManageCustomerDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.CreateCustomer",
                        controller: this,
                    }).then(
                        function(oManageCustomerDialog) {
                            this.oManageCustomerDialog = oManageCustomerDialog;
                            this.getView().addDependent(this.oManageCustomerDialog);
                            this.oManageCustomerDialog.open(); // Open the dialog
                        }.bind(this)
                    );
                } else {
                    this._resetDialogFields(bIsEdit); // Reset fields to original data
                    this.oManageCustomerDialog.open(); // Open the dialog
                }
            },

            _resetDialogFields: function(bIsEdit) {
                // Clear ValueStates
                ["MC_id_CustCompanyName", "MC_id_CustCustomerName", "MC_id_CustomGst",
                    "MC_id_CustomPan", "MC_id_CustMail", "MC_id_FinanceEmail", "MC_id_CustMob",
                    "MC_id_Country", "MC_id_codeModel", "MC_id_CustAddress", "MC_id_HeadPosition"
                ]
                .forEach(id => sap.ui.getCore().byId(id).setValueState("None"));

                if (bIsEdit && this._originalCustomerData) {
                    let oData = this._originalCustomerData;

                    // Defaults
                    oData.stdCode = oData.stdCode  || "";
                    oData.GST = oData.GST || "";
                    oData.LUT = oData.LUT || "";
                    oData.mobileNo = oData.mobileNo || "";
                    oData.type = oData.type  || "";
                    oData.value = oData.value  || "";
                    oData.countryCode = oData.countryCode || "";
                    oData.state = oData.state || "";
                    oData.baseLocation = oData.baseLocation || "";

                    this.getView().getModel("CustomerModel").setData(JSON.parse(JSON.stringify(oData)));

                    // --- Trigger dependent loaders in order ---
                    const oCountryBox = sap.ui.getCore().byId("MC_id_Country");
                    oCountryBox.setSelectedKey(oData.countryCode || "");
                    this.onCountry({
                        getSource: () => oCountryBox
                    }, this.getView(), "CustomerModel");

                    const oStateBox = sap.ui.getCore().byId("MC_id_State");
                    oStateBox.setSelectedKey(oData.state || "");
                    this.onStateChange({
                        getSource: () => oStateBox
                    }, this.getView(), "CustomerModel");

                    const oCityBox = sap.ui.getCore().byId("MC_id_City");
                    oCityBox.setSelectedKey(oData.baseLocation || "");

                    sap.ui.getCore().byId("MC_id_codeModel").setSelectedKey(oData.stdCode || "");

                    // RadioGroup
                    if (oData.type === "IGST") {
                        sap.ui.getCore().byId("MC_id_groupCustGst").setSelectedIndex(1);
                    } else {
                        sap.ui.getCore().byId("MC_id_groupCustGst").setSelectedIndex(0);
                    }
                }
            },


            MC_onPressClose: function() {
                this.oManageCustomerDialog.close(); // Close the dialog
                this.byId("MC_id_CustTable").removeSelections(true); // Clear table selection
                this.MC_onTableSelectionChange(); // Update button states
                this.getView().setModel(new JSONModel({}), "CustomerModel"); // Clear CustomerModel data

            },

            onRadioButtonChange: function() {
                // Get selected index of the radio button group (0 = CGST/SGST, 1 = IGST)
                const isCGST = sap.ui.getCore().byId("MC_id_groupCustGst").getSelectedIndex() === 0;
                const model = this.getView().getModel("CustomerModel");
                // Set GST value and type based on selected option
                model.setProperty("/value", isCGST ? "9" : "18"); // 9% for CGST/SGST, 18% for IGST
                model.setProperty("/type", isCGST ? "CGST/SGST" : "IGST");
            },

            // Call the function for create new Customer
            MC_onAddCustomerDetails: function() {
                this.getView().getModel("ViewModel").setProperty("/update", true);
                this.manageCustomerDetails(false);
            },

            // Call the function for edit Customer
            MC_onEditCustomerDetails: function() {
                this.getView().getModel("ViewModel").setProperty("/update", false);
                this.manageCustomerDetails(true);
            },

            // Validate Common Fields on Input
            MC_ValidateCommonFields: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateMandatoryField(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            MC_LCvalidateName: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateName(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            // Validate LUT Number on Input
            MC_ValidateLUTNo: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateLutNumber(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            // Validate STDCode on Input
            MC_ValidateComboBox: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCstrictValidationComboBox(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            // Validate GST Number on Input
            MC_ValidateGstNumber: function(oEvent) {
                const oInput = sap.ui.getCore().byId("MC_id_CustomGst");
                const sInputValue = oInput.getValue();
                const dataModel = this.getView().getModel("CustomerModel");
                const visiModel = this.getView().getModel("visiblePlay");

                // GST regex
                const testPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}Z[0-9A-Z]{1}$/;

                if (testPattern.test(sInputValue) && sInputValue) {
                    visiModel.setProperty("/CC_id_CustInput", true);

                    // Extract first 2 digits (state code)
                    const stateCode = sInputValue.substring(0, 2);

                    // If state code is 29 (Karnataka)
                    if (stateCode === "29") {
                        sap.ui.getCore().byId("MC_id_groupCustGst").setSelectedIndex(0);
                        // visiModel.setProperty("/isRadioEditable", false); // Make radios non-editable
                        dataModel.setProperty("/value", "9");
                        dataModel.setProperty("/type", "CGST/SGST");
                    } else {
                        sap.ui.getCore().byId("MC_id_groupCustGst").setSelectedIndex(1);
                        // visiModel.setProperty("/isRadioEditable", false); // Allow change
                        // visiModel.setProperty("/isRadioEditable", false); // Make radios non-editable
                        dataModel.setProperty("/value", "18");
                        dataModel.setProperty("/type", "IGST");
                    }

                    oInput.setValueState("None");
                } else if (!sInputValue) {
                    // Empty input
                    dataModel.setProperty("/value", "0");
                    dataModel.setProperty("/type", "");
                    oInput.setValueState("None");
                    visiModel.setProperty("/CC_id_CustInput", false);
                    // visiModel.setProperty("/isRadioEditable", true);
                } else {
                    // Invalid GST
                    visiModel.setProperty("/CC_id_CustInput", false);
                    oInput.setValueState("Error");
                    oInput.setValueStateText(this.i18nModel.getText("gstNoValueState"));
                    // visiModel.setProperty("/isRadioEditable", true);
                }
            },

            // Validate Mobile Number on Input
            MC_ValidateMobileNo: function(oEvent) {
                var oInput = oEvent.getSource();
                var sStdCode = sap.ui.getCore().byId("MC_id_codeModel").getValue()
                utils._LCvalidateMobileNumberWithSTD(oEvent, sStdCode);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            // Validate PAN Card on Input
            MC_ValidatePanCard: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateMandatoryField(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            // Validate Email on Input
            MC_ValidateEmail: function(oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateEmail(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
            },

            MC_onChangeCountry: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.onCountry(oEvent, this.getView(), "CustomerModel", {
                    resetIds: ["MC_id_State", "MC_id_City", "MC_id_codeModel"],
                });
            },

            MC_onChangeState: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.onStateChange(oEvent, this.getView(), "CustomerModel", {
                    resetIds: ["MC_id_City", "MC_id_codeModel"],
                });
            },

            MC_onChangeCity: function(oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                this.onCityChange(oEvent, this.getView(), "CustomerModel");
            },



            MC_OnPressMSASOW: function() {
                this.getRouter().navTo("RouteMSA"); // Navigate to MSASOW page
            },

            // Submit Customer Data
            MC_onPressSubmit: async function() {
                var that = this;
                try {
                    const STDCode = sap.ui.getCore().byId("MC_id_codeModel").getValue();
                    // Validate Mandatory Fields
                    var isMandatoryValid = (
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCompanyName"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCustomerName"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_HeadPosition"), "ID") &&
                        utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") &&
                        utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("MC_id_Country"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("MC_id_City"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID")
                    );
                    if (!isMandatoryValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    var oData = this.getView().getModel("CustomerModel").getData();
                    delete oData.currency; // Remove ID for new customer
                    var isValid = true;
                    // Optional Field Validations
                    if (oData.PAN && !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) isValid = false;
                    if (oData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) isValid = false;
                    if (oData.mobileNo && !utils._LCvalidateMobileNumberWithSTD(sap.ui.getCore().byId("MC_id_CustMob"), STDCode)) isValid = false;
                    if (oData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) isValid = false;
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
                        return;
                    }
                    this.getBusyDialog(); // Show busy dialog 
                    // Submit data 
                    await this.ajaxCreateWithJQuery("ManageCustomer", {
                            data: oData
                        }).then(function(response) {
                            if (response && response.success === true) {
                                MessageToast.show(this.i18nModel.getText("msgCustomer3"));
                                this.getView().setModel(new JSONModel({}), "CustomerModel"); // Clear CustomerModel data
                                this.oManageCustomerDialog.close();
                                return this.readCallForManageCustomer("Initial");
                            } else {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            }
                        }.bind(this))
                        .then(function() {
                            that.closeBusyDialog();
                        }).catch(function(error) {
                            that.closeBusyDialog();
                            MessageToast.show(error.message || error.responseText);
                        }.bind(this));
                } catch (error) {
                    that.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                }
            },

            // Save Edited Customer
            MC_onPressSave: async function() {
                var that = this;
                try {
                    const STDCode = sap.ui.getCore().byId("MC_id_codeModel").getValue();
                    // Validate Mandatory Fields
                    var isMandatoryValid = (
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCompanyName"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCustomerName"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_HeadPosition"), "ID") &&
                        utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") &&
                        utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("MC_id_Country"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("MC_id_City"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID")
                    );
                    if (!isMandatoryValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    var oCustomerModel = this.getView().getModel("CustomerModel");
                    var oUpdatedData = oCustomerModel.getData();
                    delete oUpdatedData.currency; // Remove currency for update
                    var oTable = this.byId("MC_id_CustTable");
                    var oSelectedItem = oTable.getSelectedItem();
                    // Ensure a customer is selected
                    if (!oSelectedItem) {
                        MessageToast.show(this.i18nModel.getText("selectCustomerToUpdate"));
                        return;
                    }
                    var sCustomerId = oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID");
                    var isValid = true;
                    // Optional Field Validations
                    if (oUpdatedData.PAN && !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) isValid = false;
                    if (oUpdatedData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) isValid = false;
                    if (oUpdatedData.mobileNo && !utils._LCvalidateMobileNumberWithSTD(sap.ui.getCore().byId("MC_id_CustMob"), STDCode)) isValid = false;
                    if (oUpdatedData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) isValid = false;
                    // Check if any mandatory fields are invalid
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
                        return;
                    }
                    this.getBusyDialog(); // Show busy dialog
                    // Send update request
                    var requestData = {
                        filters: {
                            ID: sCustomerId
                        },
                        data: oUpdatedData
                    };
                    await this.ajaxUpdateWithJQuery("/ManageCustomer", requestData).then(function(response) {
                            if (response.success === true) {
                                oTable.removeSelections(true);
                                this.oManageCustomerDialog.close();
                                this.getView().setModel(new JSONModel({}), "CustomerModel"); // Clear CustomerModel data
                                MessageToast.show(this.i18nModel.getText("msgCustomer4"));
                                this.MC_onTableSelectionChange();
                                return this.readCallForManageCustomer("Initial");
                            } else {
                                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                            }
                        }.bind(this))
                        .then(function() {
                            that.closeBusyDialog();
                        }).catch(function(error) {
                            that.closeBusyDialog();
                            MessageToast.show(error.message || error.responseText);
                        }.bind(this));
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                }
            },

            // Delete Selected Customer
            MC_onDeleteAddCustomer: function() {
                var oTable = this.byId("MC_id_CustTable");
                var oSelectedItem = oTable.getSelectedItem();
                if (!oSelectedItem) {
                    MessageBox.error(this.i18nModel.getText("deleteCustomer"));
                    return;
                }
                var sCustomerID = oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID");
                var that = this;
                this.showConfirmationDialog(this.i18nModel.getText("msgBoxConfirm"),
                    this.i18nModel.getText("confirmDeleteCustomerMessage"),
                    // onConfirm
                    function() {
                        that.ajaxDeleteWithJQuery("/ManageCustomer", {
                            filters: {
                                ID: sCustomerID
                            }
                        }).then(() => {
                            // Refresh the customer data after deletion
                            return that.readCallForManageCustomer("Initial");
                        }).then(() => {
                            that.closeBusyDialog();
                            MessageToast.show(that.i18nModel.getText("msgCustomerDeleteSuccess"));
                            that.byId("MC_id_AddCustomer").setEnabled(true);
                            oTable.removeSelections(true);
                            that.MC_onTableSelectionChange();
                        }).catch((error) => {
                            that.closeBusyDialog();
                            MessageToast.show(error.message || error.responseText);
                            oTable.removeSelections(true);
                        });
                    },
                    // onCancel
                    function() {
                        that.byId("MC_id_CustTable").removeSelections(true);
                        that.MC_onTableSelectionChange();
                    }
                );
            },

            // Clear Customer Form Selection
            MC_onClear: function() {
                var oComboBox = this.getView().byId("MC_id_CompanyName");
                if (oComboBox) oComboBox.setSelectedKey(""); // Clear combo box selection
            },

            MC_onSearch: async function() {
                var aFilterItems = this.byId("MC_id_CompanyFilter").getFilterGroupItems();
                var params = {};
                aFilterItems.forEach(function(oItem) {
                    var oControl = oItem.getControl();
                    if (oControl && oControl.getValue) {
                        var sKey = oItem.getName();
                        var sValue = oControl.getValue();
                        if (sValue) params[sKey] = sValue;
                    }
                });
                this.byId("MC_id_AddCustomer").setEnabled(true);
                this.getBusyDialog(); // Show busy dialog
                await this.readCallForManageCustomer(params).then(() => {}).catch((error) => {
                    MessageToast.show(error.message || error.responseText);
                }).finally(() => {
                    this.closeBusyDialog();
                });
            },

            readCallForManageCustomer: async function(filter) {
                this.getBusyDialog(); // <-- Open custom BusyDialog
                await this.ajaxReadWithJQuery("ManageCustomer", filter).then((oData) => {
                    var companyData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(companyData), "CreateCustomerModel");
                    if (filter === "Initial") {
                        var customererData = [...new Map(companyData.filter(item => item.companyName).map(item => [item.companyName.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(customererData), "CreateCustomerModelInitial");
                    }
                    this.closeBusyDialog(); // <-- Close custom BusyDialog
                }).catch((error) => {
                    sap.m.MessageToast.show(error.message || error.responseText);
                }).finally(() => {
                    this.closeBusyDialog(); // <-- Close custom BusyDialog
                });
            },

            // Handle Table Row Selection - Enable/Disable Buttons
            MC_onTableSelectionChange: function() {
                var aSelectedItems = this.byId("MC_id_CustTable").getSelectedItems();
                if (aSelectedItems.length > 0) {
                    this.byId("MC_id_AddCustomer").setEnabled(false);
                    this.byId("MC_id_EditCustomer").setEnabled(true);
                    this.byId("MC_id_DeleteCustomer").setEnabled(true);
                } else {
                    this.byId("MC_id_AddCustomer").setEnabled(true);
                    this.byId("MC_id_EditCustomer").setEnabled(true);
                    this.byId("MC_id_DeleteCustomer").setEnabled(true);
                }
            },

            onPressback: function() {
                this.getRouter().navTo("RouteTilePage"); // Navigate Back to Tile Page
            },

            onLogout: function() {
                this.CommonLogoutFunction(); // Navigate to Login Page
            },

            MC_DownloadTableData: function() {
                var table = this.byId("MC_id_CustTable");
                const oModelData = table.getModel("CreateCustomerModel").getData();
                const aFormattedData = oModelData.map(item => {
                    return {
                        ...item,
                    };
                });
                const aCols = [{
                        label: this.i18nModel.getText("companyname"),
                        property: "companyName",
                        type: "string"
                    },
                    {
                        label: this.i18nModel.getText("customerName"),
                        property: "name",
                        type: "string"
                    },
                    {
                        label: this.i18nModel.getText("gstNo"),
                        property: "GST",
                        type: "string"
                    },
                    {
                        label: this.i18nModel.getText("type"),
                        property: "type",
                        type: "string"
                    },
                    {
                        label: this.i18nModel.getText("percentage"),
                        property: "value",
                        type: "string"
                    },
                    {
                        label: this.i18nModel.getText("email"),
                        property: "customerEmail",
                        type: "string "
                    },
                    {
                        label: this.i18nModel.getText("mobileNo"),
                        property: "mobileNo",
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
                    fileName: "ManageCustomerDetails.xlsx"
                };
                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().then(function() {
                    MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
                }.bind(this)).finally(function() {
                    oSheet.destroy();
                });
            }
        });
    }
);