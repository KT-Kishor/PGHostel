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
            },
            _onRouteMatched: async function () {
                var LoginFunction = await this.commonLoginFunction("AssetAssignment");
                if (!LoginFunction) return;
                this.oLoginModel = this.getView().getModel("LoginModel");
                this.getBusyDialog();
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
                            ReturnDate: "",
                            ReturnEmpName: "",
                            ReturnEmpID: "",
                            Description: ""
                        },
                        filters: {}
                    },

                });
                // await this._fetchCommonData("EmployeeDetailsData", "empModel");
                this.commonLoginFunction("AssetAssignment");
                this._makeDatePickersReadOnly(["AA_id_Date"]);
                this._FragmentDatePickersReadOnly(["FAA_id_AssignedDate", "FAU_id_unassignDate", "FAA_id_Model"]);
                this.getView().setModel(form, "myform");
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this._fetchCommonData("IncomeAsset", "incomeModel");
                this._fetchCommonData("AssetType", "assetType");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                var oModel = new JSONModel(this.getView().getModel("EmpModel").getData().filter((item) => item.Role === "Admin" || item.Role === "IT Manager" || item.Role === "IT Consultant"));
                this.getView().setModel(oModel, "AdminModel");
                this.AA_CoomonReadCall();
                this.oLoginModel.setProperty("/HeaderName", "Asset Assignment");
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

            AA_onNavClick: function (oEvent) {
                var Slno = oEvent.getSource().getBindingContext("assetModel").getObject().SerialNumber;
                var onav = this.getOwnerComponent().getRouter()
                onav.navTo("AssetObjectPage", {
                    sPath: Slno, Name: "Asset"
                })
            },

            createTableSheet: function () {
                return [
                    { label: "Employee ID", property: "AssignEmployeeID", type: "string" },
                    { label: "Employee Name", property: "AssignEmployeeName", type: "string" },
                    { label: "Type", property: "Type", type: "string" },
                    { label: "Model", property: "Model", type: "Number" },
                    { label: "Equipment Number", property: "EquipmentNumber", type: "Number" },
                    { label: "Serial Number", property: "SerialNumber", type: "Number" },
                    { label: "Assigned By Name", property: "AssignedByEmployeeName", type: "string" },
                    { label: "Assigned By ID", property: "AssignedByEmployeeID", type: "string" },
                    { label: "Assign Branch", property: "AssignBranch", type: "string" },
                    { label: "Assigned Date", property: "AssignedDate", type: "Date" },
                    { label: "Asset Value", property: "AssetValue", type: "Number" },
                    { label: "Status", property: "Status", type: "string" },
                    { label: "Return Date", property: "ReturnDate", type: "Date" },
                    { label: "Return Branch", property: "ReturnBranch", type: "string" },
                    { label: "Returned Employee ID", property: "ReturnEmpID", type: "string" },
                    { label: "Returned Employee Name", property: "ReturnEmpName", type: "string" },
                    { label: "Comments", property: "Comments", type: "string" },
                ];
            },

            AA_onDownload: function () {
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
                MessageToast.show(this.i18nModel.getText("assetAssignDownload"))
                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(function () {
                    oSheet.destroy();
                });
            },


            AA_onPressAssign: async function () {
                try {
                    var response = await this.ajaxReadWithJQuery("IncomeAsset", {});
                    if (response.success) {
                        this.getOwnerComponent().setModel(new JSONModel(response.data), "incomeModel");
                    }
                }
                catch (e) {
                    console.log(e);
                    MessageToast.show(this.i18nModel.getText("Error"));
                }
                this._dialogMode = "Assign";
                var oView = this.getView();
                var oFormModel = oView.getModel("myform");
                let oNewData = {
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
                    AssignedByEmployeeID: this.oLoginModel.getProperty("/EmployeeID"),
                    isEdit: false
                };
                oFormModel.setProperty("/formData/data", oNewData);
                // oFormModel.setProperty("/formData/data/isEdit", false);
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
                if (!this.FAA_Dialog) {
                    var oView = this.getView();
                    this.FAA_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AssetAssignmentCreate",
                        controller: this
                    }).then(function (FAA_Dialog) {
                        this.FAA_Dialog = FAA_Dialog;
                        oView.addDependent(this.FAA_Dialog);
                        this.FAA_Dialog.open();
                        var aAssignEditable = [
                            "FAA_id_employeeID",
                            "FAA_id_Type",
                            "FAA_id_Model",
                            "FAA_id_AssignedDate"
                        ];
                        var aAllFields = [
                            "FAA_id_employeeID",
                            "FAA_id_Type",
                            "FAA_id_Model",
                            "FAA_branch_Id",
                            "FAA_id_AssetValue",
                            "FAA_id_SerialNumber",
                            "FAA_id_EquipmentNumber",
                            "FAA_id_AssignedDate"
                        ];
                        aAllFields.forEach(id => {
                            var oControl = sap.ui.getCore().byId(id);
                            if (oControl) {
                                oControl.setEditable(aAssignEditable.includes(id));
                            }
                        });
                        this._FragmentDatePickersReadOnly(["FAA_id_AssignedDate", "FAA_id_Model"]);
                    }.bind(this));

                } else {
                    this.FAA_Dialog.open();
                    sap.ui.getCore().byId("FAA_id_employeeID").setSelectedKey("");
                    sap.ui.getCore().byId("FAA_id_Type").setSelectedKey("");
                    sap.ui.getCore().byId("FAA_id_Model").setSelectedKey("");
                    sap.ui.getCore().byId("FAA_branch_Id").setSelectedKey("");
                    var aAssignEditable = [
                        "FAA_id_employeeID",
                        "FAA_id_Type",
                        "FAA_id_Model",
                        "FAA_id_AssignedDate"
                    ];
                    var aAllFields = [
                        "FAA_id_employeeID",
                        "FAA_id_Type",
                        "FAA_id_Model",
                        "FAA_branch_Id",
                        "FAA_id_AssetValue",
                        "FAA_id_SerialNumber",
                        "FAA_id_EquipmentNumber",
                        "FAA_id_AssignedDate"
                    ];
                    aAllFields.forEach(id => {
                        var oControl = sap.ui.getCore().byId(id);
                        if (oControl) {
                            oControl.setEditable(aAssignEditable.includes(id));
                        }
                    });

                }
            },

            AA_onPressEdit: async function () {
                var oTable = this.byId("AA_id_AssestTable");
                var oSelectedItem = oTable.getSelectedItem();

                if (!oSelectedItem) {
                    MessageToast.show(this.i18nModel.getText("assestAssignPleaseSelectTheRowToEdit"));
                    return;
                }
                var oBindingContext = oSelectedItem.getBindingContext("assetModel");
                var oSelectedData = oBindingContext.getObject();

                if (oSelectedData.Status === "Returned") {
                    MessageToast.show(this.i18nModel.getText("assestAssignEditNotAllowedReturned"));
                    return;
                }
                var oAssignedDate = new Date(oSelectedData.AssignedDate);
                // var oToday = new Date();
                // var oDiffDays = Math.floor((oToday - oAssignedDate) / (1000 * 60 * 60 * 24));

                // if (oDiffDays > 2) {
                //     MessageToast.show(this.i18nModel.getText("assestAssignEditNotAllowed"));
                //     return;
                // }
                var oFormModel = this.getView().getModel("myform");
                let oClonedData = Object.assign({}, oSelectedData);
                oClonedData.isEdit = true;
                oFormModel.setProperty("/formData/data", oClonedData);
                oFormModel.setProperty("/formData/filters", { ID: oSelectedData.ID });

                // oFormModel.setProperty("/formData/data/isEdit", true);
                // oFormModel.setProperty("/formData/data", Object.assign({}, oSelectedData));
                if (!this.FAA_Dialog) {
                    this.FAA_Dialog = await sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AssetAssignmentCreate",
                        controller: this
                    });
                    this.getView().addDependent(this.FAA_Dialog);
                }
                this.FAA_Dialog.open();
                var aEditableFields = [
                    "FAA_id_AssignedDate"
                ];
                var aAllFields = [
                    "FAA_id_employeeID",
                    "FAA_id_Type",
                    "FAA_id_Model",
                    "FAA_branch_Id",
                    "FAA_id_AssetValue",
                    "FAA_id_SerialNumber",
                    "FAA_id_EquipmentNumber",
                    "FAA_id_AssignedBy",
                    "FAA_id_AssignedDate"
                ];
                aAllFields.forEach(id => {
                    var oControl = sap.ui.getCore().byId(id);
                    if (oControl) {
                        oControl.setEditable(aEditableFields.includes(id));
                    }
                });
                var oAssignedDateControl = sap.ui.getCore().byId("FAA_id_AssignedDate");
                if (oAssignedDateControl) {
                    oAssignedDateControl.setMinDate(oAssignedDate);
                }
            },

            FAA_onEmpIDChange: function (oEvent) {
                if (utils._LCstrictValidationComboBox(oEvent)) {
                    // Find selected employee by EmployeeID
                    var selectedEmployee = this.getView().getModel("EmpModel").getData().find(function (emp) {
                        return emp.EmployeeID === sap.ui.getCore().byId("FAA_id_employeeID").getSelectedKey();
                    });
                    this.getView().getModel("myform").setProperty("/formData/data/AssignEmployeeName", selectedEmployee.EmployeeName);
                }
            },

            FAA_onTypeChange: async function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
                sap.ui.getCore().byId("FAA_id_Model").setBusy(true);
                try {
                    var response = await this.ajaxReadWithJQuery("IncomeAsset", { "Type": oEvent.getSource().getValue() });
                    if (response.success) {
                        this.getOwnerComponent().setModel(new JSONModel(response.data), "incomeModel");
                    }
                }
                catch (e) {
                    console.log(e);
                    MessageToast.show(this.i18nModel.getText("Error"));
                }
                sap.ui.getCore().byId("FAA_id_Model").setBusy(false);
            },

            FAA_onTypeSelectionChange: function () {
                const properties = ["Model", "EquipmentNumber", "SerialNumber", "AssetValue"];
                properties.forEach(prop => {
                    this.getView().getModel("myform").setProperty(`/formData/data/${prop}`, "");
                });
            },

            FAA_onModelChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            FAA_onBranchChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },

            FAA_onChangeAssignedBy: function (oEvent) {
                if (utils._LCstrictValidationComboBox(oEvent)) {
                    this.getView().getModel("myform").setProperty("/formData/data/AssignedByEmployeeID", oEvent.getSource().getSelectedItem().getAdditionalText());
                }
            },

            FAU_onDateLiveChange: function (oEvent) {
                var oDate = oEvent.getSource().getDateValue();
                if (oDate) {
                    var sFormatted = oDate.toLocaleDateString("en-CA");
                    this.getView().getModel("myform").setProperty("/formData/data/ReturnDate", sFormatted);
                }
            },

            FAU_onReturnBranchChange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },

            FAU_validatecomments: function (oEvent) {
                var oInput = oEvent.getSource();
                utils._LCvalidateMandatoryField(oEvent);
                if (oInput.getValue() === "") oInput.setValueState("None");
            },

            FAA_onPressSave: async function () {
                if (this._checkValidation()) {
                    try {
                        var oFormData = this.getView().getModel("myform").getProperty("/formData/data");
                        delete oFormData.isEdit
                        var originalStatus = oFormData.Status;
                        var oAssignedDate = sap.ui.getCore().byId("FAA_id_AssignedDate").getDateValue();
                        oFormData.AssignedDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oAssignedDate);
                        oFormData.Status = "Assigned";
                        oFormData.IsCurrent = 1
                        oFormData.Description = this.getView().getModel("myform").getProperty("/formData/data/Description");
                        this.getBusyDialog();

                        if (originalStatus === "Returned") {
                            await this.ajaxCreateWithJQuery("IncomeAsset", { data: oFormData }, ["FAA_id_FormFrag"]);
                        } else {
                            await this.ajaxUpdateWithJQuery("IncomeAsset", {
                                data: oFormData,
                                filters: { ID: this.getView().getModel("myform").getProperty("/formData/filters/ID") }
                            }, ["FAA_id_FormFrag"]);
                        }

                        this.AA_onSearch();
                        this.FAA_Dialog.close();
                        this.byId("AA_id_AssestTable").removeSelections(true);

                    } catch (e) {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("technicalError"));
                        console.error(e);
                    }
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }

            },

            FAA_onPressClose: function () {
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

            FAU_onChangeReturnTo: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent)
                var oComboBox = oEvent.getSource();
                var oReturnEmpID = oComboBox.getSelectedKey();
                var oReturnEmpName = oComboBox.getSelectedItem()?.getText();

                var oFormModel = this.getView().getModel("myform");
                oFormModel.setProperty("/formData/data/ReturnEmpID", oReturnEmpID);
                oFormModel.setProperty("/formData/data/ReturnEmpName", oReturnEmpName);
            },

            AA_onOpenUnassign: function () {
                var oTableSelected = this.byId("AA_id_AssestTable").getSelectedItem();
                if (oTableSelected) {
                    var oFormModel = this.getView().getModel("myform");
                    var oBindingContext = oTableSelected.getBindingContext("assetModel");

                    if (oBindingContext) {
                        var oSelectedData = oBindingContext.getObject();

                        if (oSelectedData.Status && oSelectedData.Status === "Returned") {
                            MessageToast.show(this.i18nModel.getText("thisAssetIsReturned"));
                            return;
                        }
                        oFormModel.setProperty("/formData/data", oSelectedData);
                        oFormModel.setProperty("/formData/filters", {
                            ID: oSelectedData.ID
                        });
                        oFormModel.setProperty("/formData/data/ReturnDate", new Date(oSelectedData.AssignedDate));
                        oFormModel.setProperty("/formData/data/ReturnEmpID", this.oLoginModel.getProperty("/EmployeeID"));
                        oFormModel.setProperty("/formData/data/ReturnEmpName", this.oLoginModel.getProperty("/EmployeeName"));

                        if (!this._unassignDialog) {
                            this._unassignDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetUnassignDialog", this);
                            this.getView().addDependent(this._unassignDialog);
                            this._FragmentDatePickersReadOnly(["FAU_id_unassignDate"]);
                        }
                        this._unassignDialog.open();
                        sap.ui.getCore().byId("FAU_id_unassignDate").setMinDate(new Date(oSelectedData.AssignedDate));

                    } else {
                        this.closeBusyDialog();
                        MessageToast.show(this.i18nModel.getText("tableBindingContextNotFound"));
                        return;
                    }
                } else {
                    MessageToast.show(this.i18nModel.getText("pleaseSelectTheRowToUnassign"));
                }
            },

            FAU_onCancelReturn: function () {
                this.byId("AA_id_AssestTable").removeSelections(true)
                var oModel = this.getView().getModel("myform");
                oModel.setProperty("/formData/data/ReturnBranch", "");
                oModel.setProperty("/formData/data/Comments", "");
                this._unassignDialog.close();

            },

            FDP_onVHDClose: function () {
                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.close();
                }
            },

            FDP_onVHDPick: function (oEvent) {
                var oSelectedItem = oEvent.getSource();
                var oBindingContext = oSelectedItem.getBindingContext("filteredAssetDetails");
                if (!oBindingContext) {
                    return;
                }
                var oSelectedData = oBindingContext.getObject();
                var formData = this.getView().getModel("myform");
                formData.setProperty("/formData/data/Model", oSelectedData.Model);
                formData.setProperty("/formData/data/EquipmentNumber", oSelectedData.EquipmentNumber);
                formData.setProperty("/formData/data/SerialNumber", oSelectedData.SerialNumber);
                formData.setProperty("/formData/data/Status", oSelectedData.Status);
                formData.setProperty("/formData/data/AssetValue", (oSelectedData.AssetValue).toString());
                formData.setProperty("/formData/data/Currency", oSelectedData.Currency);
                formData.setProperty("/formData/data/Description", oSelectedData.Description);
                var oAssignedDate;
                var oMinDate;
                if (oSelectedData.Status === "Returned" && oSelectedData.ReturnDate) {
                    oAssignedDate = new Date(oSelectedData.ReturnDate);
                    oMinDate = new Date(oSelectedData.ReturnDate);
                } else {
                    oAssignedDate = new Date(oSelectedData.AssetCreationDate);
                    oMinDate = new Date(oSelectedData.AssetCreationDate);
                }
                if (oSelectedData.Status === "Returned" && oSelectedData.ReturnDate) {
                    var oMinDate = new Date(oSelectedData.ReturnDate);
                } else {
                    var oMinDate = new Date(oSelectedData.AssetCreationDate);
                }
                sap.ui.getCore().byId("FAA_id_AssignedDate").setMinDate(oMinDate);
                var sBranch = "";
                if (oSelectedData.Status === "Returned" && oSelectedData.ReturnBranch) {
                    sBranch = oSelectedData.ReturnBranch;
                } else {
                    sBranch = oSelectedData.PickedBranch;
                }
                formData.setProperty("/formData/data/AssignBranch", sBranch);
                formData.setProperty("/formData/filters/ID", oSelectedData.ID);
                sap.ui.getCore().byId("FDP_id_ValueHelpDialog").close();
                sap.ui.getCore().byId("FAA_id_Model").setValueState("None");
            },

            FAA_onOpenVHD: function () {
                var oView = this.getView();
                var oCore = sap.ui.getCore();
                var oTypeSelected = oCore.byId("FAA_id_Type").getSelectedKey();
                if (!oTypeSelected) {
                    // Set empty model to show no data
                    var emptyModel = new sap.ui.model.json.JSONModel([]);
                    oView.setModel(emptyModel, "filteredAssetDetails");

                    if (!this._oValueHelpDialog) {
                        this._oValueHelpDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetDetailsPopup", this);
                        this.getView().addDependent(this._oValueHelpDialog);
                    }

                    this._oValueHelpDialog.open();
                    return;
                }
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

            FAU_onSaveReturn: async function () {
                var oCore = sap.ui.getCore();
                var oFormDataModel = this.getView().getModel("myform").getProperty("/formData");
                if (utils._LCstrictValidationComboBox(oCore.byId("FAU_id_returnTo"), "ID") && utils._LCstrictValidationComboBox(oCore.byId("FAU_id_branch"), "ID") && utils._LCvalidateMandatoryField(oCore.byId("FAU_id_Comments"), "ID")) {
                    this.getBusyDialog();
                    oFormDataModel.data.Status = "Returned";
                    delete oFormDataModel.data.isEdit
                    await this.ajaxUpdateWithJQuery("IncomeAsset", oFormDataModel);
                    this.closeBusyDialog();
                    this.AA_onSearch();
                    this._unassignDialog.close();
                    this.byId("AA_id_AssestTable").removeSelections(true);
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            _checkValidation: function () {
                var oCore = sap.ui.getCore();
                var bIsEdit = this.getView().getModel("myform").getProperty("/formData/data/isEdit");
                console.log(" isEdit flag inside validation:", bIsEdit);

                if (bIsEdit) {
                    return true;
                }
                // if (this.getView().getModel("myform").getProperty("/formData/data/isEdit")) {
                //     return true
                // }
                if (
                    utils._LCstrictValidationComboBox(oCore.byId("FAA_id_employeeID"), "ID") &&
                    utils._LCstrictValidationComboBox(oCore.byId("FAA_id_Type"), "ID") &&
                    utils._LCvalidateMandatoryField(oCore.byId("FAA_id_Model"), "ID") &&
                    utils._LCstrictValidationComboBox(oCore.byId("FAA_branch_Id"), "ID") &&
                    utils._LCstrictValidationComboBox(oCore.byId("FAA_id_AssignedBy"), "ID")) {
                    return true
                }
                else {
                    return false
                }
            },

            onDialogClose: function () {
                this._unassignDialog.destroy();
                this._unassignDialog = null;
            },
        }
        )
    });