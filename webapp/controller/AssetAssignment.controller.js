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
                    this._fetchCommonData("AssetType", "Type");

                this.commonLoginFunction("AssetAssignment");
                this._makeDatePickersReadOnly(["AA_id_Date"]);
                this.onClearAndSearch("AA_id_FilterBarAsset");// Clear and search function
                this._FragmentDatePickersReadOnly(["FAA_id_AssignedDate", "FAU_id_unassignDate", "FAA_id_Model"]);
                this.getView().setModel(form, "myform");
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                if (!this.getView().getModel("incomeModel")) {
                    this._fetchCommonData("IncomeAsset", "incomeModel");
                    this._fetchCommonData("AssetType", "assetType");
                }
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var oModel = new JSONModel(this.getView().getModel("EmpModel").getData().filter((item) => item.Role === "Admin" || item.Role === "IT Manager" || item.Role === "IT Consultant"));
                this.getView().setModel(oModel, "AdminModel");
                this.AA_CoomonReadCall();
                this.oLoginModel.setProperty("/HeaderName", "Asset Assignment");
                this.getModelData();
                this.closeBusyDialog();
                if (this.oLoginModel.getProperty("/Role") === "IT Consultant") {
                    var oModel = new JSONModel(this.getView().getModel("EmpModel").getData().filter((item) => item.BranchCode === this.oLoginModel.getProperty("/BranchCode")));
                    this.getView().setModel(oModel, "EmpModel");
                }
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
                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                var branch = loginModel.getProperty("/BranchCode");
                var role = loginModel.getProperty("/Role");
                var baseLocationData = this.getView().getModel("BaseLocationModel").getData();
                var cityFromBranch = "";
                if (baseLocationData && Array.isArray(baseLocationData)) {
                    var branchEntry = baseLocationData.find(item => item.branchCode === branch);
                    if (branchEntry) {
                        cityFromBranch = branchEntry.city;
                    }
                }
                this.ajaxReadWithJQuery("IncomeAsset", filter, ["AA_id_AssestTable"]).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    var filteredData = offerData.filter(item => {
                        var statusCondition = (item.Status === "Assigned" || item.Status === "Returned") && item.IsCurrent === "1";
                        var roleCondition = true;
                        if (role === "IT Consultant") {
                            roleCondition = item.AssignBranch === cityFromBranch;
                        }
                        return statusCondition && roleCondition;
                    });
                    this.getView().setModel(new JSONModel(filteredData), "assetModel");
                    this.closeBusyDialog();
                }).catch((oError) => {
                    this.closeBusyDialog();
                    MessageBox.error(this.i18nModel.getText("commonReadingDataError"));
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

            onShowMore: function (oEvent) {
                var oBindingContext = oEvent.getSource().getBindingContext("assetModel");
                var sFullText = oBindingContext.getProperty("Comments");

                var formattedReferenceData = `
                    <div style="padding: 15px; word-wrap: break-word; max-width: 100%; overflow-wrap: anywhere;">
                        <p>${sFullText}</p>
                    </div>`;

                var oDialog = new sap.m.Dialog({
                    title: this.getView().getModel("i18n").getProperty("comments"),
                    draggable: true,
                    resizable: true,
                    contentWidth: "500px",
                    contentHeight: "auto",
                    content: new sap.ui.core.HTML({
                        content: formattedReferenceData
                    }),
                    beginButton: new sap.m.Button({
                        text: this.getView().getModel("i18n").getProperty("close"),
                        press: function () {
                            oDialog.close();
                        }
                    })
                });
                oDialog.open();
            },

            AA_onPressAssign: async function () {
                // var params;
                // (this.oLoginModel.getProperty("/Role") === "IT Consultant") ? params = { PickedBranch: this.oLoginModel.getProperty("/BranchName"), ReturnBranch: this.oLoginModel.getProperty("/BranchName") } : params = {};
                // try {
                //     var response = await this.ajaxReadWithJQuery("IncomeAsset", params);
                //     if (response.success) {
                //         this.getOwnerComponent().setModel(new JSONModel(response.data), "incomeModel");
                //     }
                // }
                // catch (e) {
                //     console.log(e);
                //     MessageToast.show(this.i18nModel.getText("Error"));
                // }
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
                if (!oFormModel) {
                    oFormModel = new sap.ui.model.json.JSONModel({ formData: { data: {} } });
                    oView.setModel(oFormModel, "myform");
                }
                oFormModel.setProperty("/formData/data", oNewData);
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
                var oFormModel = this.getView().getModel("myform");
                let oClonedData = Object.assign({}, oSelectedData);
                oClonedData.isEdit = true;
                oFormModel.setProperty("/formData/data", oClonedData);
                oFormModel.setProperty("/formData/filters", { ID: oSelectedData.ID });
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
                    // Get minDate from AssetCreationDate
                    var sAssetCreationDate = oSelectedData.AssetCreationDate;
                    var oMinDate = sAssetCreationDate ? new Date(sAssetCreationDate) : null;
                    var oMaxDate = new Date();
                    if (oMinDate) {
                        oAssignedDateControl.setMinDate(oMinDate);
                    }
                    oAssignedDateControl.setMaxDate(oMaxDate);
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
                var params;
                (this.oLoginModel.getProperty("/Role") === "IT Consultant") ? params = { PickedBranch: this.oLoginModel.getProperty("/BranchName"), ReturnBranch: this.oLoginModel.getProperty("/BranchName") } : params = {};
                try {
                    var response = await this.ajaxReadWithJQuery("IncomeAsset", params);
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
                        var oAssignedDate = new Date(sap.ui.getCore().byId("FAA_id_AssignedDate").getDateValue());
                        var sAssetCreationDate = this.getView().getModel("myform").getProperty("/formData/data/AssetCreationDate");
                        if (sAssetCreationDate) {
                            var oAssetCreationDate = new Date(sAssetCreationDate);
                            oAssetCreationDate.setHours(0, 0, 0, 0);
                            if (oAssignedDate < oAssetCreationDate) {
                                MessageToast.show("Assigned Date cannot be before Asset Creation Date.");
                                return;
                            }
                           
                        }
                        delete oFormData.isEdit
                        var originalStatus = oFormData.Status;
                        var oAssignedDate = sap.ui.getCore().byId("FAA_id_AssignedDate").getDateValue();
                        oFormData.AssignedDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oAssignedDate);
                        oFormData.Status = "Assigned";
                        oFormData.IsCurrent = 1
                        oFormData.Description = this.getView().getModel("myform").getProperty("/formData/data/Description");
                        this.getBusyDialog();
                        if (originalStatus === "Returned") {
                            // oFormData.AssetCreationDate;
                            oFormData.PickedEmployeeName;
                            oFormData.PickedEmployeeID;
                            oFormData.PickedBranch;
                            oFormData.AssetCreationDate = oFormData.ReturnDate;
                            delete oFormData.ReturnDate
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

             AA_onSearch: async function () {
                try {
                    this.getBusyDialog();
                    var aFilterItems = this.byId("AA_id_FilterBarAsset").getFilterGroupItems();
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
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
                    await this.AA_CoomonReadCall(params); // read call for trainee after filter
                } catch (error) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
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
                        oFormModel.setProperty("/formData/data/ReturnBranch", oSelectedData.AssignBranch);
                        var role = this.oLoginModel.getProperty("/Role");
                        if (!this._unassignDialog) {
                            this._unassignDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetUnassignDialog", this);
                            this.getView().addDependent(this._unassignDialog);
                            this._FragmentDatePickersReadOnly(["FAU_id_unassignDate"]);
                        }
                        this._unassignDialog.open();
                        var oAssignedDate = new Date(oSelectedData.AssignedDate);
                        var oMinDate = new Date(oAssignedDate);
                        oMinDate.setDate(oMinDate.getDate() - 15);
                        var oMaxDate = new Date(oAssignedDate);
                        oMaxDate.setDate(oMaxDate.getDate() + 15);
                        var oReturnDatePicker = sap.ui.getCore().byId("FAU_id_unassignDate");
                        oReturnDatePicker.setMinDate(oMinDate);
                        oReturnDatePicker.setMaxDate(oMaxDate);
                        if (role === "Admin" || role === "IT Manager") {
                            var allAdmins = this.getView().getModel("AdminModel").getProperty("/");
                            var oAssignedBranch = oSelectedData.AssignBranch; // e.g., "Kalaburagi"
                            var baseLocationData = this.getView().getModel("BaseLocationModel").getData();
                            var allowedRoles = ["Admin",
                                "IT Manager",
                                "IT Consultant"];
                            var filteredAdmins = allAdmins.filter(emp => {
                                var empBranchCode = emp.BranchCode;
                                var branchEntry = baseLocationData.find(item => item.branchCode === empBranchCode);
                                var empCity = branchEntry ? branchEntry.city : "";

                                return empCity === oAssignedBranch && allowedRoles.includes(emp.Role);
                            });
                            var oFilteredModel = new sap.ui.model.json.JSONModel(filteredAdmins);
                            sap.ui.getCore().byId("FAU_id_returnTo").setModel(oFilteredModel, "AdminModel");
                        }

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
                formData.setProperty("/formData/data/AssetCreationDate", oSelectedData.AssetCreationDate);
                formData.setProperty("/formData/data/PickedEmployeeName", oSelectedData.PickedEmployeeName);
                formData.setProperty("/formData/data/PickedEmployeeID", oSelectedData.PickedEmployeeID);
                formData.setProperty("/formData/data/PickedBranch", oSelectedData.PickedBranch);
                formData.setProperty("/formData/data/ReturnDate", oSelectedData.ReturnDate);

                var oAssignedDate;
                var oMinDate;
                var today = new Date();
                today.setHours(0, 0, 0, 0);
                if (oSelectedData.Status === "Returned" && oSelectedData.ReturnDate) {
                    oAssignedDate = new Date(oSelectedData.ReturnDate);
                    oMinDate = new Date(oSelectedData.ReturnDate);
                } else {
                    oAssignedDate = new Date(oSelectedData.AssetCreationDate);
                    oMinDate = new Date(oSelectedData.AssetCreationDate);
                }
                var oDatePicker = sap.ui.getCore().byId("FAA_id_AssignedDate");
                oDatePicker.setMinDate(oMinDate);         //allow assigning from asset creation or return date
                oDatePicker.setMaxDate(null);
                sap.ui.getCore().byId("FAA_id_AssignedDate").setMinDate(oMinDate);
                if (today < oMinDate) {
                    oDatePicker.setDateValue(oMinDate);
                    // sap.ui.getCore().byId("FAA_id_AssignedDate").setDateValue(oMinDate);
                }
                else {
                    oDatePicker.setDateValue(today);
                    // sap.ui.getCore().byId("FAA_id_AssignedDate").setDateValue(today);
                }
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


            FAA_onOpenVHD:async function () {
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
                  await  this.ajaxReadWithJQuery("IncomeAsset", "IsCurrent=1").then((oData) => {
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                // var allData = oView.getModel("incomeModel").getProperty("/");
                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                var branch = loginModel.getProperty("/BranchCode");
                var role = loginModel.getProperty("/Role");
                var baseLocationData = oView.getModel("BaseLocationModel").getData();
                var cityFromBranch = "";
                if (Array.isArray(baseLocationData)) {
                    var branchEntry = baseLocationData.find(item => item.branchCode === branch);
                    if (branchEntry) {
                        cityFromBranch = branchEntry.city;
                    }
                }
                var filteredData = [];
                if (role === "Admin" || role === "IT Manager") {
                    filteredData = oFCIAerData.filter(item =>
                        item.IsCurrent === "1" &&
                        (item.Status === "Available" || item.Status === "Returned") &&
                        item.Type === oTypeSelected
                    );
                } else if (role === "IT Consultant") {
                    filteredData = oFCIAerData.filter(item =>
                        item.IsCurrent === "1" &&
                        (item.Status === "Available" || item.Status === "Returned") &&
                        item.PickedBranch === cityFromBranch &&
                        item.Type === oTypeSelected
                    );
                }
                var filteredModel = new sap.ui.model.json.JSONModel(filteredData);
                oView.setModel(filteredModel, "filteredAssetDetails");
   })
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

                if (bIsEdit) {
                    return true;
                }
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

            formatReturnBranchText: function (sDate) {
                var sDateStr = sDate ? String(sDate):""; 
                if (!sDate || sDateStr === "1899-11-30T00:00:00" || sDateStr === "1899-11-30" || sDateStr.includes("1899-11-30")) {
                    return "Return Date:";
                }
                const oFormatter = this.getView().getController().Formatter;
                return "Date: " + oFormatter.formatDate(sDate);
            }
        })
    });