sap.ui.define([
    "./BaseController",
    "sap/ui/export/Spreadsheet"
], (BaseController, Spreadsheet) => {
    "use strict";

    return BaseController.extend("table.com.table.controller.MaintainData", {
        onInit() {
            this.getRouter().getRoute("MaintainData").attachMatched(this._onRouteMatched, this);

        },
        _onRouteMatched: async function () {
            var that = this
            var LoginFUnction = await this.commonLoginFunction("MaintainData");
            if (!LoginFUnction) return;
            that.i18nModel = that.getView().getModel("i18n").getResourceBundle()
            that.getView().getModel("LoginModel").setProperty("/HeaderName", that.i18nModel.getText("pageTitle"));

            const listItem = new sap.ui.model.json.JSONModel({
                ListData: [
                    { key: 1, title: "Country" },
                    { key: 2, title: "State" },
                    { key: 3, title: "City" },
                    { key: 4, title: "TaxCalculation" },
                    { key: 5, title: "Contract" }
                ]
            });
            this.getView().setModel(listItem, "listNameData")
            this.onEntitySelect(null, "Country");
        },

        onEntitySelect: async function (oEvent, entity) {
            var oItem;
            if (oEvent && oEvent.getParameter("listItem")) {
                oItem = oEvent.getParameter("listItem");
                this.sTitle = oItem.getTitle();
            } else {
                this.sTitle = entity;
            }

            var oDetailContainer = this.byId("detailContainer");
            oDetailContainer.removeAllItems();

            this.getBusyDialog();
            let data = await this.ajaxReadWithJQuery(this.sTitle, "");
            let BmodelData = data.data;
            this.closeBusyDialog();

            const dataModelSt = new sap.ui.model.json.JSONModel(BmodelData)
            this.getView().setModel(dataModelSt, "dataModel")

            if (BmodelData) {

                // Create Table
                var oTable = new sap.m.Table({
                    inset: false,
                    growing: true,
                    growingScrollToLoad: true,
                    mode: sap.m.ListMode.None,
                    sticky: ["ColumnHeaders"],   // keeps headers visible while scrolling
                    autoPopinMode: true,         // enables pop-in of columns on small screens
                    demandPopin: true,           // automatically moves extra columns into pop-in
                    fitContainer: true,          // makes table fill the container
                    width: "100%"
                });

                if (BmodelData && BmodelData.length > 0) {
                    //Extract property names from first object
                    var aFields = Object.keys(BmodelData[0]);

                    // Create columns dynamically
                    aFields.forEach(function (sField) {
                        oTable.addColumn(new sap.m.Column({
                            header: new sap.m.Label({ text: sField })
                        }));
                    });

                    var aCells = [];
                    aFields.forEach(function (sField) {
                        aCells.push(new sap.m.Text({ text: `{dataModel>` + sField + "}" }));
                    });

                    var oTemplate = new sap.m.ColumnListItem({
                        cells: aCells
                    });

                    //Bind table
                    oTable.bindItems({
                        path: `dataModel>/`,
                        template: oTemplate
                    });
                }

                //Add Table to Detail
                oDetailContainer.addItem(oTable);
            }
        },
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
        },

        onLogout: function () {
            this.CommonLogoutFunction(); // Navigate to login page
        },
        MD_AddButtonPress: function () {
            let getModel = this.getView().getModel("dataModel");

            let oView = this.getView()
            if (!this.oUpdatePass) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.MaintainData",
                    controller: this,
                }).then(
                    function (oUpdatePass) {
                        this.oUpdatePass = oUpdatePass;
                        oView.addDependent(this.oUpdatePass);
                        this.oUpdatePass.open();
                        this.commonFiledInput();
                    }.bind(this)
                );
            } else {
                this.oUpdatePass.open();
                this.commonFiledInput()
            }
        },
        MD_onCancelButtonPress: function () {
            if (this.oUpdatePass) {
                this.oUpdatePass.close();
            }
        },

        commonFiledInput: function () {

            let getModel = this.getView().getModel("dataModel");
            let oFields = Object.keys(getModel.getData()[0]);
            var oForm = sap.ui.getCore().byId("dynamicForm"); // Suppose in XML you kept <VBox id="dynamicForm" />

            var oDynamicData = {};
            oFields.forEach(function (sField) {
                oDynamicData[sField] = ""; // initialize empty
            });

            // Create a JSONModel for form data
            var oDynamicModel = new sap.ui.model.json.JSONModel(oDynamicData);
            this.getView().setModel(oDynamicModel, "formModel");

            // Clear old content
            oForm.removeAllItems();

            // Loop through fields
            oFields.forEach(function (sField) {
                // Create Label
                var oLabel = new sap.m.Label({
                    text: sField,                 // field name as label
                    labelFor: sField + "_input"   // associate with input
                });

                // Create Input
                var oInput = new sap.m.Input({
                    value: "{formModel>/" + sField + "}"
                    // id: sField + "_input",        // unique id
                    // placeholder: "Enter " + sField
                });

                // Add to layout
                oForm.addItem(oLabel);
                oForm.addItem(oInput);
            })
        },
        MD_UploadButtonPress: function () {
            let getModel = this.getView().getModel("dataModel");
           
            let oView = this.getView()
            if (!this.oLeaveDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.AddHolidayList",
                    controller: this,
                }).then(function (oLeaveDialog) {
                    this.oLeaveDialog = oLeaveDialog;
                    oView.addDependent(this.oLeaveDialog);
                    this.oLeaveDialog.setTitle("Upload country data");
                    this.oLeaveDialog.open();
                    sap.ui.getCore().byId("ALH_id_Date").setVisible(false);

                }.bind(this));
            } else {
                this.oLeaveDialog.open();
                this.oLeaveDialog.setTitle("Upload country data");
                sap.ui.getCore().byId("ALH_id_Date").setVisible(false);
            }
        },
        LOH_onUpload: function (oEvent) {
            var oFile = oEvent.getParameter("files")[0];
            if (oFile) {
                var reader = new FileReader();

                reader.onload = async function (e) {
                    // Convert file into array buffer
                    var data = new Uint8Array(e.target.result);

                    // Read workbook
                    var workbook = XLSX.read(data, { type: 'array' });

                    // Take first sheet
                    var sheetName = workbook.SheetNames[0];
                    var sheet = workbook.Sheets[sheetName];

                    // Convert sheet → JSON
                    this.jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                }.bind(this);

                reader.readAsArrayBuffer(oFile);
            }
        },

        LOH_onPressSubmit: async function () {
            let that = this
            let fileUploaderInput = sap.ui.getCore().byId("ALH_id_LocFileUpload").getValue();
            if (!fileUploaderInput) {
                sap.m.MessageToast.show(that.i18nModel.getText("messagePleseelectfile"));
                return;
            }

            const datafromexcel = { data: this.jsonData };
            that.getBusyDialog();

            for (let i = 0; i < datafromexcel.data.length; i++) {
                let row = datafromexcel.data[i];
                try {
                    // post one row at a time
                    await that.ajaxCreateWithJQuery(that.sTitle, { data: row });
                    // console.log("Row saved:");
                } catch (error) {
                    // console.log("Skipping duplicate error row:");
                    // continue to next row without stopping
                    continue;
                }
            }
            that.LOH_onPressClose();
            that.closeBusyDialog();
        },

        LOH_onPressClose: function () {
            sap.ui.getCore().byId("ALH_id_LocFileUpload").setValue("");
            this.oLeaveDialog.close();
            this.oLeaveDialog.destroy();
            this.oLeaveDialog = null;
        },
        MD_DownloadButtonPress: function () {

            let getModel = this.getView().getModel("dataModel");
            if (!getModel) {
                sap.m.MessageToast.show("Please select table");
                return;
            }
            // Get dynamic field names (columns)
            var aFields = Object.keys(getModel.getData()[0]); 

            // Create column config dynamically
            var aCols = aFields.map(function (sField) {
                return {
                    label: sField,    // Excel Column Name
                    property: sField, // Property from data
                    type: "string"    // You can adjust (string, number, date)
                };
            });

            // Configure Spreadsheet
            var oSettings = {
                workbook: { columns: aCols },
                dataSource: [],
                fileName: "Excel_Template.xlsx"
            };

            // Create and save Excel
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    sap.m.MessageToast.show("Excel file has been downloaded!");
                })
                .finally(function () {
                    oSheet.destroy();
                });
        },
        MD_onSaveButtonPress: function () {
            var that = this
            let formData = this.getView().getModel("formModel")
            let datafromexcel = { data: formData.getData() };

            this.getBusyDialog();
            that.ajaxCreateWithJQuery(this.sTitle, datafromexcel).then((res) => {
                that.closeBusyDialog()
                that.LOH_onPressClose();
                sap.m.MessageToast.show("Data saved successfully");
            }).catch((error) => {
                sap.m.MessageToast.show("Already exist record");
                that.closeBusyDialog();
                that.LOH_onPressClose();
            });
        }
    });
});