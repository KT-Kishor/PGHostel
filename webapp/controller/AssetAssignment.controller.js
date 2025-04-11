sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AssetAssignment", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteAssetAssignment").attachMatched(this._onRouteMatched, this);
                var form = new JSONModel({
                    formData: {
                        data: {
                            EmployeeId: "",
                            EmployeeName: "",
                            Type: "",
                            Model: "",
                            Branch: "",
                            AssignedBy: "Bhagya",
                            EquipmentNumber: "",
                            SerialNumber: "",
                            AssignedValue: "",
                            AssignedDate: new Date(),
                            Status: "",
                            ReturnDate: ""
                        }
                    },

                });
                this.getView().setModel(form, "myform");

            },
            _onRouteMatched() {
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this._fetchCommonData("IncomeAsset", "incomeModel");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.AA_CoomonReadCall("Initial");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Asset Assignment Details");
                this.getModelData();
            },
            getModelData: function () {
             this.getOwnerComponent().getModel("EmpModel");
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },

            AA_CoomonReadCall: function (filter) {
                this.ajaxReadWithJQuery("AssetAssignment", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "assetModel");
                    if (filter === "Initial") {
                        const uniqueBranches = [
                            ...new Map(
                                offerData
                                    .filter(item => item.Branch && item.Branch.trim() !== "")
                                    .map(item => [item.Branch.trim(), {
                                        Branch: item.Branch.trim(),
                                        branchCode: item.branchCode
                                    }])
                            ).values()
                        ];
                        this.getView().setModel(new JSONModel(uniqueBranches), "uniqueBranchModel");
                        const uniqueTypes = [
                            ...new Map(
                                offerData
                                    .filter(item => item.Type && item.Type.trim() !== "")
                                    .map(item => [item.Type.trim(), {
                                        Type: item.Type.trim(),
                                    }])
                            ).values()
                        ];
                        this.getView().setModel(new JSONModel(uniqueTypes), "uniqueTypeModel");
                        offerData = [...new Map(offerData.filter(item => item.EmployeeName && item.EmployeeName.trim() !== "").map(item => [item.EmployeeName.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(offerData), "assetModelInitial");
                    }
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.i18nModel.getText("commonReadingDataError"))
                });
            },

            onTypeChange: function (oEvent) {
                var filter = { "Type": oEvent.getSource().getValue() }
                this.ajaxReadWithJQuery("IncomeAsset", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getOwnerComponent().setModel(new JSONModel(offerData), "incomeModel");
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.i18nModel.getText("commonReadingDataError"))
                });
            },

            // BB_CoomonReadCall: function (filter) {
            //     this.ajaxReadWithJQuery("IncomeAsset", filter).then((oData) => {
            //         var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
            //         this.getOwnerComponent().setModel(new JSONModel(offerData), "incomeModel");

            // if (filter === "Initial") {
            //     offerData = [...new Map(offerData.filter(item => item.EmployeeName && item.EmployeeName.trim() !== "").map(item => [item.EmployeeName.trim(), item])).values()];
            //     this.getView().setModel(new JSONModel(offerData), "assetModelInitial");
            // }

            // var allData = this.getView().getModel("assetModelInitial").getProperty("/");

            // var uniqueTypes = [...new Map(allData
            //     .filter(item => item.Type)
            //     .map(item => [item.Type.trim(), { Type: item.Type.trim() }])
            // ).values()];
            // this.getView().setModel(new JSONModel(uniqueTypes), "incomeModel");
            //         sap.ui.core.BusyIndicator.hide();
            //     }).catch((oError) => {
            //         sap.ui.core.BusyIndicator.hide();
            //         MessageBox.error(this.i18nModel.getText("commonReadingDataError"))
            //     });
            // },

            AA_onPressAssign: function () {
                var oCore = sap.ui.getCore();
                var oTable = this.byId("AA_id_AssestTable");
                var aSelectedContexts = oTable.getSelectedContexts();

                if (aSelectedContexts.length > 0) {
                    var oSelectedData = aSelectedContexts[0].getObject();

                    if (oSelectedData.Status) {
                        sap.m.MessageToast.show("Selected row can't be assigned.");
                        this.byId("AA_id_AssestTable").removeSelections(true);
                        return;
                    }
                }
                if (!this.FAA_Dialog) {
                    var oView = this.getView();
                    this.FAA_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AssetAssignmentCreate",
                        controller: this
                    }).then(function (FAA_Dialog) {
                        this.FAA_Dialog = FAA_Dialog;
                        oView.addDependent(this.FAA_Dialog);
                        this.byId("AA_id_AssestTable").removeSelections(true);
                        this.FAA_Dialog.open();
                    }.bind(this));

                } else {

                    this.FAA_Dialog.open();
                }                
                this.getView().getModel("myform").setProperty("/formData/data/AssignedBy", "Bhagya");
                this.getView().getModel("myform").setProperty("/formData/data/AssignedDate", new Date());
            },

            onPressSave: async function () {
                var table = this.byId("AA_id_AssestTable");
                var selected = table.getSelectedItem();
                console.log(selected);

                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_employeeID"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_Type"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_Model"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_branch_Id"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_AssignedBy"), "ID") &&
                        utils._LCvalidateName(sap.ui.getCore().byId("FAA_id_AssignedBy"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FAA_id_AssignedDate"), "ID")) {
                        var oPayLoad = {
                            "EmployeeId": sap.ui.getCore().byId("FAA_id_employeeID").getValue(),
                            "EmployeeName": sap.ui.getCore().byId("FAA_id_Name").getValue(),
                            "Type": sap.ui.getCore().byId("FAA_id_Type").getSelectedKey(),
                            "Model": sap.ui.getCore().byId("FAA_id_Model").getValue(),
                            "EquipmentNumber": sap.ui.getCore().byId("FAA_id_EquipmentNumber").getValue(),
                            "SerialNumber": sap.ui.getCore().byId("FAA_id_SerialNumber").getValue(),
                            "AssignedBy": sap.ui.getCore().byId("FAA_id_AssignedBy").getValue(),
                            "Branch": sap.ui.getCore().byId("FAA_branch_Id").getSelectedKey(),
                            "AssignedDate": sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(sap.ui.getCore().byId("FAA_id_AssignedDate").getDateValue()),
                            "AssignedValue": sap.ui.getCore().byId("FAA_id_AssetValue").getValue(),
                            "Status": "Assigned",
                            "ReturnDate": ""
                        };
                        if (!selected) {
                            await this.ajaxCreateWithJQuery("AssetAssignment", { data: oPayLoad });
                        }
                        else {
                            var id = selected.getBindingContext("assetModel").getObject().ID;
                            await this.ajaxUpdateWithJQuery("AssetAssignment", { data: oPayLoad, filters:{ "ID": id }});
                        }
                        await this.AA_CoomonReadCall("AssetAssignment");
                        this.FAA_Dialog.close();

                    } else {
                        MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }
                } catch (e) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));

                    console.error(e);
                }
            },

            onPressClose: function () {
                this.byId("AA_id_AssestTable").removeSelections(true);
                this.getView().getModel("myform").setProperty("/formData/data", {});
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
                var aFilterItems = this.byId("AA_id_FilterBarAsset").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "AssignedDate") {
                            params["startDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0]));
                        } else {
                            params[sValue] = oControl.getValue();
                        }
                    }
                });
                this.AA_CoomonReadCall(params);
                // var params = {};
                // aFilterItems.forEach(function (oItem) {
                //   var oControl = oItem.getControl(); // Get the associated control
                //   var sValue = oItem.getName();
                //   if (oControl && oControl.getValue()) {
                //     params[sValue] = oControl.getValue();
                //   }
                // });
                // this._fetchCommonData("AssetAssignment", "assetModel", params);
                // this.AA_CoomonReadCall(params);
            },



            AA_onPressEdit: function () {
                var oView = this.getView();
                var oTable = this.byId("AA_id_AssestTable");
                var oTableSelected = oTable.getSelectedItem();

                if (!oTableSelected) {
                    MessageToast.show("Please select the row to Update");
                    return;
                }
                // var oSelectedData = oTableSelected.getBindingContext().getObject();
                var oModel = oView.getModel("assetModel");
                var oFormModel = oView.getModel("myform");

                var oBindingContext = oTableSelected.getBindingContext("assetModel");
                if (oBindingContext) {
                    var oSelectedData = oBindingContext.getObject();

                    if (oSelectedData.Status === "Unassigned") {
                        MessageToast.show("Cannot Re-assign for Un-sssigned");
                        oTable.removeSelections();
                        return;
                    }
                    oFormModel.setProperty("/formData/data", JSON.parse(JSON.stringify(oSelectedData)));
                    oFormModel.setProperty("/formData/filters", {
                        ID: oSelectedData.ID
                    });
                } else {
                    return;
                }
                if (!this.FAA_Dialog) {
                    this.FAA_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AssetAssignmentCreate",
                        controller: this
                    }).then(function (FAA_Dialog) {
                        this.FAA_Dialog = FAA_Dialog;
                        oView.addDependent(this.FAA_Dialog);
                        this.FAA_Dialog.open();
                    }.bind(this));

                } else {
                    this.FAA_Dialog.open();
                }
            },

            AA_onOpenUnassign: function () {
                var oTableSelected = this.byId("AA_id_AssestTable").getSelectedItem();
                if (oTableSelected) {
                    var oFormModel = this.getView().getModel("myform");
                    var oBindingContext = oTableSelected.getBindingContext("assetModel");
                    if (oBindingContext) {
                        var oSelectedData = oBindingContext.getObject();

                        oFormModel.setProperty("/formData/data", JSON.parse(JSON.stringify(oSelectedData)));

                        oFormModel.setProperty("/formData/filters", {
                            ID: oSelectedData.ID
                        });
                        console.log(oFormModel.getData());
                        if (!this._unassignDialog) {
                            this._unassignDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetUnassignDialog", this);
                            this.getView().addDependent(this._unassignDialog);
                            // this._FragmentDatePickersReadOnly(["unassignDate"])
                        }
                        this._unassignDialog.open();
                    } else {
                        MessageToast.show("Table Binding Context Not Found");
                        return;
                    }
                }
                else {
                    MessageToast.show("Please select the row to Unassign");
                }
            },

            onCancelUnassign: function () {
                this.byId("AA_id_AssestTable").removeSelections(true)
                this._unassignDialog.close();

            },

            FAS_onchange: function () {

                var oEmpCombo = sap.ui.getCore().byId("FAA_id_employeeID"); // User ID input field
                var selectedKey = oEmpCombo.getSelectedKey(); // Get selected user ID

                if (!selectedKey) {
                    oEmpCombo.setValueState("Error");

                    return;
                } else {
                    oEmpCombo.setValueState("None");
                }

                var oEmpModel = this.getView().getModel("assetModelInitial"); // Fetch employee model
                if (!oEmpModel) {
                    return;
                }

                var aEmployees = oEmpModel.getProperty("/"); // Get employee data array

                // Find selected employee by EmployeeID
                var selectedEmployee = aEmployees.find(function (emp) {
                    return emp.EmployeeId === selectedKey;
                });

                if (selectedEmployee) {
                    this.getView().getModel("myform").setProperty("/formData/data/EmployeeName", selectedEmployee.EmployeeName);
                }

            },

            onVHDClose: function () {
                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.close();
                }
            },

            onVHDPick: function (oEvent) {
                var oSelectedItem = oEvent.getSource();
                var oBindingContext = oSelectedItem.getBindingContext("incomeModel");

                if (!oBindingContext) {
                    return;
                }

                var oSelectedData = oBindingContext.getObject();

                var oFrag = sap.ui.getCore();

                oFrag.byId("FAA_id_Model").setValue(oSelectedData.Model);
                oFrag.byId("FAA_id_Model").setValueState("None");

                var formData = this.getView().getModel("myform");
                formData.setProperty("/formData/data/EquipmentNumber", oSelectedData.EqNo);
                formData.setProperty("/formData/data/SerialNumber", oSelectedData.SlNo);
                formData.setProperty("/formData/data/AssignedValue", (oSelectedData.AssetValue).toString());

                oFrag.byId("idValueHelpDialog").close()
            },

            onOpenVHD: function () {
                var oView = this.getView();
                var oCore = sap.ui.getCore();
                var oTypeSelected = oCore.byId("FAA_id_Type").getSelectedKey();

                var allData = this.getView().getModel("incomeModel").getProperty("/");
                var filteredData = allData.filter(item => item.Type === oTypeSelected);

                var filteredModel = new sap.ui.model.json.JSONModel(filteredData);
                oView.setModel(filteredModel, "filteredAssetDetails");

                if (!this._oValueHelpDialog) {
                    this._oValueHelpDialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.AssetDetailsPopup", this);
                    this.getView().addDependent(this._oValueHelpDialog);
                }
                this._oValueHelpDialog.open();
            },

            onSaveUnassign: async function () {
                var oTableSelected = this.byId("AA_id_AssestTable").getSelectedItem();
                var oDateTime = sap.ui.getCore().byId("unassignDate").getDateValue();

                if (oDateTime) {
                    oDateTime.setDate(oDateTime.getDate());
                }

                // this.byId("AA_id_AssestTable").removeSelections(true)

                if (!oDateTime) {
                    // this.getView().byId("AA_id_AssestTable").setBusy(false);
                    MessageToast.show("Please select a Date.");
                    sap.ui.getCore().byId("unassignDate").setValueState("Error");
                    return;
                }

                var oFormModel = this.getView().getModel("myform");
                oFormModel.setProperty("/formData/data/Status", "Unassigned");
                oFormModel.setProperty("/formData/data/ReturnDate", oDateTime);

                await this.ajaxCreateWithJQuery("AssetAssignment", { data: oFormModel.getProperty("/formData/data") });
                MessageToast.show("Unassign saved successfully!");
                this._unassignDialog.close();
                // this._fetchAssetData();
                // this._fetchData();
            },

            onDialogClose: function () {
                this._unassignDialog.destroy();
                this._unassignDialog = null;
            },
        })
    });