sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Spreadsheet, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AssetAssignment", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteAssetAssignment").attachMatched(this._onRouteMatched, this);
                // form.setData({ maxDate: AssignedDate, focusedDate: new Date });
            },
            _onRouteMatched() {
                this.oLoginModel = this.getView().getModel("LoginModel");
                this.getBusyDialog();
                if (!this.oLoginModel) {
                    this.getRouter().navTo("RouteLoginPage");
                }
                var form = new JSONModel({
                    formData: {
                        data: {
                            AssignEmployeeID: "",
                            AssignEmployeeName: "",
                            Type: "",
                            Model: "",
                            AssignBranch: "",
                            ReturnBranch: "",
                            AssignedByEmployeeName: this.getView().getModel("LoginModel").getProperty("/EmployeeName"),
                            EquipmentNumber: "",
                            SerialNumber: "",
                            AssetValue: "",
                            AssignedDate: new Date(),
                            Status: "",
                            ReturnDate: ""
                        },
                        filters: {}
                    },

                });
                this.commonLoginFunction("AssetAssignment");
                this._makeDatePickersReadOnly(["AA_id_Date"]);
                this._FragmentDatePickersReadOnly(["FAA_id_AssignedDate", "FAU_id_unassignDate", "FAA_id_Model"]);
                this.getView().setModel(form, "myform");
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this._fetchCommonData("IncomeAsset", "incomeModel");
                this._fetchCommonData("AssetType", "assetType");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                this.AA_CoomonReadCall();
                this.oLoginModel.setProperty("/HeaderName", "Asset Assignment Details");
                this.getModelData();
                this.closeBusyDialog();
            },
            getModelData: function () {
                this.getOwnerComponent().getModel("EmpModel");
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.CommonLogoutFunction();
            },

            AA_CoomonReadCall: function (filter) {
                this.ajaxReadWithJQuery("IncomeAsset", filter, ["AA_id_AssestTable"]).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    var filteredData = offerData.filter(item =>
                        item.Status === "Assigned" || item.Status === "Returned" && item.IsCurrent === "1"
                    );
                    this.getView().setModel(new JSONModel(filteredData), "assetModel");
                    this.closeBusyDialog();
                }).catch((oError) => {
                    this.closeBusyDialog();
                    MessageBox.error(this.i18nModel.getText("commonReadingDataError"))
                });
            },

            // setMinEndDate: function (sStartDateId, sEndDateId) {
            //     let oStartDatePicker = sap.ui.getCore().byId(sStartDateId);
            //     let oEndDatePicker = sap.ui.getCore().byId(sEndDateId);
            //     if (oStartDatePicker && oEndDatePicker) {
            //         let oStartDate = oStartDatePicker.getDateValue();
            //         let oEndDate = oEndDatePicker.getDateValue();
            //         oEndDatePicker.setMinDate(oStartDate);
            //         if (oEndDate && oEndDate < oStartDate) {
            //             oEndDatePicker.setDateValue(null);
            //         }
            //     }
            // },

            onTypeChange: function (oEvent) {
                var filter = { "Type": oEvent.getSource().getValue() }
                this.ajaxReadWithJQuery("IncomeAsset", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "incomeModel");
                    var selectedType = oEvent.getSource().getSelectedKey();
                    sap.ui.getCore().byId("FAA_id_Model").setValue("");
                    sap.ui.getCore().byId("FAA_id_EquipmentNumber").setValue("");
                    sap.ui.getCore().byId("FAA_id_SerialNumber").setValue("");
                    sap.ui.getCore().byId("FAA_id_AssetValue").setValue("");
                }).catch((oError) => {
                    MessageBox.error(this.i18nModel.getText("commonReadingDataError"))
                });
            },

            createTableSheet: function () {
                return [
                    { label: "employeeId", property: "AssignEmployeeID", type: "string" },
                    { label: "Type", property: "Type", type: "string" },
                    { label: "Model", property: "Model", type: "Number" },
                    { label: "EquipmentNumber", property: "EquipmentNumber", type: "Number" },
                    { label: "SerialNumber", property: "SerialNumber", type: "Number" },
                    { label: "AssignedBy", property: "AssignedByEmployeeName", type: "string" },
                    { label: "Branch", property: "AssignBranch", type: "string" },
                    { label: "AssignedDate", property: "AssignedDate", type: "Date" },
                    { label: "AssetValue", property: "AssetValue", type: "Number" },
                    { label: "Status", property: "Status", type: "string" },
                    { label: "ReturnDate", property: "ReturnDate", type: "Date" },
                ];
            },

            AA_onExport: function () {
                const oModel = this.byId("AA_id_AssestTable")
                    .getModel("assetModel")
                    .getData();
                if (!oModel || oModel.length === 0) {
                    MessageToast.show(this.i18nModel.getText("noData"));
                    return;
                }
                const adjustedData = oModel.map((item => ({
                    ...item, ReturnDate: (item.Status === "Assigned" || item.ReturnDate === "00-01-1900" || item.ReturnDate === "1900-01-01") ? "" : item.ReturnDate
                })));
                const aCols = this.createTableSheet();
                const oSettings = {
                    workbook: { columns: aCols, hierarchyLevel: "Level" },
                    dataSource: adjustedData,
                    fileName: "Asset_Assignment_Details.xlsx",
                    worker: false,
                };
                const oSheet = new sap.ui.export.Spreadsheet(oSettings);
                oSheet.build().finally(function () {
                    oSheet.destroy();
                });
            },


            AA_onPressAssign: function () {
                var allData = this.getView().getModel("incomeModel").getProperty("/");
                var filteredData = allData.filter(item =>
                    item.IsCurrent === "1" &&
                    (item.Status === "Available" || item.Status === "Returned")
                );
                // Extract unique types
                var uniqueTypes = [];
                var typeSet = new Set();
                filteredData.forEach(item => {
                    if (!typeSet.has(item.Type)) {
                        typeSet.add(item.Type);
                        uniqueTypes.push({ Type: item.Type }); // Format as object for ComboBox
                    }
                });
                // Set to a new JSON model bound to ComboBox
                var typeModel = new sap.ui.model.json.JSONModel(uniqueTypes);
                this.getView().setModel(typeModel, "typeModel");

                var oModel = new JSONModel(this.getView().getModel("EmpModel").getData().filter((item) => item.Role === "Admin"));
                this.getView().setModel(oModel, "AdminModel");
                var oView = this.getView();
                var oFormModel = oView.getModel("myform");

                oFormModel.setProperty("/formData/data", {
                    AssignEmployeeID: "",
                    AssignEmployeeName: "",
                    Type: "",
                    Model: "",
                    AssignBranch: "",
                    ReturnBranch: "",
                    EquipmentNumber: "",
                    SerialNumber: "",
                    AssetValue: "",
                    AssignedDate: new Date(),
                    Status: "",
                    ReturnDate: "",
                    AssignedByEmployeeName: this.oLoginModel.getProperty("/EmployeeName"),
                    AssignedByEmployeeID: this.oLoginModel.getProperty("/EmployeeID")
                });


                // var oBindingContext = oTableSelected.getBindingContext("assetModel");
                // var oSelectedData = oBindingContext.getObject();
                // this.selectedAssignData = oSelectedData;
                // oFormModel.setProperty("/formData/data", oSelectedData);
                // oFormModel.setProperty("/formData/filters", { SerialNumber: oSelectedData.SerialNumber, EquipmentNumber: oSelectedData.EquipmentNumber });
                // oFormModel.setProperty("/formData/data/AssignedByEmployeeName", this.oLoginModel.getProperty("/EmployeeName"));
                // oFormModel.setProperty("/formData/data/AssignedByEmployeeID", this.oLoginModel.getProperty("/EmployeeID"));
                // oFormModel.setProperty("/formData/data/AssignedDate", new Date());
                if (!this.FAA_Dialog) {
                    var oView = this.getView();
                    this.FAA_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AssetAssignmentCreate",
                        controller: this
                    }).then(function (FAA_Dialog) {
                        this.FAA_Dialog = FAA_Dialog;
                        oView.addDependent(this.FAA_Dialog);
                        this.FAA_Dialog.open();
                        this._FragmentDatePickersReadOnly(["FAA_id_AssignedDate", "FAA_id_Model"]);
                    }.bind(this));

                } else {
                    this.FAA_Dialog.open();
                    sap.ui.getCore().byId("FAA_id_employeeID").setSelectedKey("");
                    sap.ui.getCore().byId("FAA_id_Type").setSelectedKey("");
                    sap.ui.getCore().byId("FAA_branch_Id").setSelectedKey("");
                    sap.ui.getCore().byId("FAA_id_AssignedBy").setSelectedKey("");

                }
            },

            AA_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },

            isValidDropdownValue: function (oComboBox) {
                var sEnteredValue = oComboBox.getValue();
                var aValidValues = oComboBox.getItems().map(function (item) {
                    return item.getText();
                });
                return aValidValues.includes(sEnteredValue);
            },

            FAA_onBranchlivechange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);

            },

            FAU_onDateLiveChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);

            },

            FAA_onStrictValidationComboBox: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            onStrictValidationComboBox: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);

            },

            FM_onStrictValidationComboBox: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent)
            },

            FAU_onStrictValidationComboBox: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            FAU_validatecomments: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            onPressSave: async function () {
                var comboIds = ["FAA_id_employeeID", "FAA_id_AssignedBy", "FAA_id_Type", "FAA_branch_Id"];

                // Collect Input field IDs (not ComboBoxes)
                var inputIds = ["FAA_id_Model"];

                // Validate ComboBoxes
                var bStrictValid = comboIds.every(function (sId) {
                    var oComboBox = sap.ui.getCore().byId(sId);
                    return utils._LCstrictValidationComboBox({
                        getSource: function () { return oComboBox; },
                        getParameter: function () { return oComboBox.getValue(); }
                    });
                });

                // Validate Inputs
                var bInputValid = inputIds.every(function (sId) {
                    var oInput = sap.ui.getCore().byId(sId);
                    return oInput && oInput.getValue && oInput.getValue().trim() !== "";
                });

                try {
                    if (bStrictValid &&
                        bInputValid &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FAA_id_employeeID"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FAA_id_Type"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_Model"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FAA_branch_Id"), "ID") &&
                        utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FAA_id_AssignedBy"), "ID") &&
                        utils._LCvalidateName(sap.ui.getCore().byId("FAA_id_AssignedBy"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_AssignedDate"), "ID")) {

                        var oFormData = this.getView().getModel("myform").getProperty("/formData/data");
                        var originalStatus = this.getView().getModel("myform").getProperty("/formData/data/Status");
                        var oAssignedDate = sap.ui.getCore().byId("FAA_id_AssignedDate").getDateValue();
                        oFormData.AssignedDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oAssignedDate);
                        oFormData.Status = "Assigned";
                        oFormData.IsCurrent = 1;
                        // oFormData.ReturnDate = null;
                        this.getBusyDialog();
                        if (originalStatus === "Returned") {
                            await this.ajaxCreateWithJQuery("IncomeAsset", { data: oFormData }, ["FAA_id_FormFrag"])
                        }
                        else {
                            await this.ajaxUpdateWithJQuery("IncomeAsset", { data: oFormData, filters: { ID: this.getView().getModel("myform").getProperty("/formData/filters/ID") } }, ["FAA_id_FormFrag"]);
                        }
                        await this.AA_CoomonReadCall();

                        this.FAA_Dialog.close();
                        this.byId("AA_id_AssestTable").removeSelections(true)

                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (e) {
                    this.closeBusyDialog();

                    MessageToast.show(this.i18nModel.getText("technicalError"));

                    console.error(e);
                }
            },

            onPressClose: function () {
                this.byId("AA_id_AssestTable").removeSelections(true);
                this.getView().getModel("myform").setProperty("/formData/data", {});
                sap.ui.getCore().byId("FAA_id_employeeID").revertSelection();
                sap.ui.getCore().byId("FAA_id_employeeID").setValueState("None");
                sap.ui.getCore().byId("FAA_id_Type").setValueState("None");
                sap.ui.getCore().byId("FAA_id_Model").setValueState("None");
                sap.ui.getCore().byId("FAA_branch_Id").revertSelection();
                sap.ui.getCore().byId("FAA_branch_Id").setValueState("None");
                sap.ui.getCore().byId("FAA_id_AssignedBy").setValueState("None");
                sap.ui.getCore().byId("FAA_id_AssignedDate").setValueState("None");
                this.FAA_Dialog.close();
            },

            AA_onPressClear: function () {
                var aFilterItems = this.byId("AA_id_FilterBarAsset").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl(); // Get the associated control
                    if (oControl) {
                        if (oControl.setValue) {
                            oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                        }
                        if (oControl.setSelectedKey) {
                            oControl.setSelectedKey(""); // Reset selection for dropdowns
                        }
                        if (oControl.setSelected) {
                            oControl.setSelected(false); // Reset selection for Checkboxes
                        }
                    }
                });
            },

            AA_onSearch: function () {
                this.getBusyDialog();
                var aFilterItems = this.byId("AA_id_FilterBarAsset").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "AssignedDate") {
                            params["AssignedStartDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0]));
                            params["AssignedEndDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[1]));
                        } else {
                            params[sValue] = oControl.getValue();
                        }
                    }
                });
                this.AA_CoomonReadCall(params);
                this.closeBusyDialog();

            },

            AA_onOpenUnassign: function () {
                var oTableSelected = this.byId("AA_id_AssestTable").getSelectedItem();
                if (oTableSelected) {
                    var oFormModel = this.getView().getModel("myform");
                    var oBindingContext = oTableSelected.getBindingContext("assetModel");
                    if (oBindingContext) {
                        var oSelectedData = oBindingContext.getObject();

                        if (oSelectedData.Status && oSelectedData.Status === "Returned") {
                            MessageToast.show(this.i18nModel.getText("thisAssetIsAlreadyUnassignedAndcannotBeUnassignedAgain"));
                            return;
                        }

                        oFormModel.setProperty("/formData/data", JSON.parse(JSON.stringify(oSelectedData)));
                        oFormModel.setProperty("/formData/filters", {
                            ID: oSelectedData.ID
                        });

                        if (!this._unassignDialog) {
                            this._unassignDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetUnassignDialog", this);
                            this.getView().addDependent(this._unassignDialog);
                            this._FragmentDatePickersReadOnly(["FAU_id_unassignDate", "FAA_id_Model"]);
                        }

                        this._unassignDialog.open();

                    } else {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("tableBindingContextNotFound"));
                        return;

                    }
                }
                else {
                    MessageToast.show(this.i18nModel.getText("pleaseSelectTheRowToUnassign"));
                }
            },

            onCancelReturn: function () {
                this.byId("AA_id_AssestTable").removeSelections(true)
                this._unassignDialog.close();

            },

            FAS_onchange: function (oEvent) {
                if (utils._LCstrictValidationComboBox(oEvent)) {
                    // Find selected employee by EmployeeID
                    var selectedEmployee = this.getView().getModel("EmpModel").getData().find(function (emp) {
                        return emp.EmployeeID === sap.ui.getCore().byId("FAA_id_employeeID").getSelectedKey();
                    });
                    this.getView().getModel("myform").setProperty("/formData/data/AssignEmployeeName", selectedEmployee.EmployeeName);
                }
            },

            onVHDClose: function () {
                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.close();
                }
            },

            onVHDPick: function (oEvent) {
                var oSelectedItem = oEvent.getSource();
                var oBindingContext = oSelectedItem.getBindingContext("filteredAssetDetails");

                if (!oBindingContext) {
                    return;
                }

                var oSelectedData = oBindingContext.getObject();

                var oFrag = sap.ui.getCore();

                oFrag.byId("FAA_id_Model").setValue(oSelectedData.Model);
                oFrag.byId("FAA_id_Model").setValueState("None");

                var formData = this.getView().getModel("myform");
                formData.setProperty("/formData/data/EquipmentNumber", oSelectedData.EquipmentNumber);
                formData.setProperty("/formData/data/SerialNumber", oSelectedData.SerialNumber);
                formData.setProperty("/formData/data/Status", oSelectedData.Status);
                formData.setProperty("/formData/data/AssetValue", (oSelectedData.AssetValue).toString());
                formData.setProperty("/formData/data/Currency", oSelectedData.Currency);
                formData.setProperty("/formData/filters/ID", oSelectedData.ID);

                oFrag.byId("FDP_id_ValueHelpDialog").close()
            },

            onOpenVHD: function () {
                var oView = this.getView();
                var oCore = sap.ui.getCore();
                var oTypeSelected = oCore.byId("FAA_id_Type").getSelectedKey();

                var allData = this.getView().getModel("incomeModel").getProperty("/");
                var filteredData = allData.filter(item => item.IsCurrent === "1" && item.Status === "Available" || item.IsCurrent === "1" && item.Status === "Returned");

                var filteredModel = new sap.ui.model.json.JSONModel(filteredData);
                oView.setModel(filteredModel, "filteredAssetDetails");

                if (!this._oValueHelpDialog) {
                    this._oValueHelpDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetDetailsPopup", this);
                    this.getView().addDependent(this._oValueHelpDialog);
                }
                this._oValueHelpDialog.open();
            },

            onSaveReturn: async function () {
                var oDate = sap.ui.getCore().byId("FAU_id_unassignDate").getValue();
                var oTableSelected = this.byId("AA_id_AssestTable");
                var selected = oTableSelected.getSelectedItem();
                if (selected) {
                    var context = selected.getBindingContext("assetModel");
                    var selectedData = context.getObject();
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAU_id_unassignDate"), "ID")) {
                        selectedData.ReturnDate = oDate;
                        selectedData.Status = "Returned";
                        this.getBusyDialog();
                        var id = selected.getBindingContext("assetModel").getObject().ID;
                        await this.ajaxUpdateWithJQuery("IncomeAsset", { data: selectedData, filters: { "ID": id } });
                        this.AA_CoomonReadCall()
                        this._unassignDialog.close();
                        oTableSelected.removeSelections();
                        this.closeBusyDialog();

                    }
                }
            },

            onDialogClose: function () {
                this._unassignDialog.destroy();
                this._unassignDialog = null;
            },
        }
        )
    });
