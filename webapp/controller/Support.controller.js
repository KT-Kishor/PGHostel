sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/export/Spreadsheet",
], function (BaseController, Formatter, JSONModel, BusyIndicator, MessageToast, utils, Spreadsheet) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Support", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteSupportDetails").attachMatched(this._onRouteMatched, this);

        },

        _onRouteMatched: async function (oEvent) {
            var LoginFUnction = await this.commonLoginFunction("ManageVendor");
            if (!LoginFUnction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().byId("SP_id_RaisedBy").setSelectedKey("")
            this.getView().byId("SP_id_Status").setSelectedKey("")
            this.CD_read()
        },

        SP_onPressClear: function () {
            this.getView().byId("SP_id_RaisedBy").setSelectedKey("")
            this.getView().byId("SP_id_Status").setSelectedKey("")
        },

        CD_read: async function () {
            const SRaisedBy = this.byId("SP_id_RaisedBy").getSelectedKey()
                || this.byId("SP_id_RaisedBy").getValue();

            const SStatus = this.byId("SP_id_Status").getSelectedKey()
                || this.byId("SP_id_Status").getValue();



            let filters = {};

            if (SRaisedBy) filters.RaisedBy = SRaisedBy;
            if (SStatus) filters.Status = SStatus;
            this.getBusyDialog()
            await this.ajaxReadWithJQuery("HM_Support", filters).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];

                if (!this._originalRoomdata) {
                    this._originalRoomdata = oFCIAerData;
                }
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "SupportModel");
                this._populateUniqueFilterValues(this._originalRoomdata);

            })
            this.closeBusyDialog()
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                SP_id_RaisedBy: new Set(),
                SP_id_Status: new Set()
            };
            data.forEach(item => {

                if (item.RaisedBy && item.RaisedBy.trim()) {
                    uniqueValues.SP_id_RaisedBy.add(item.RaisedBy.trim());
                }
                if (item.Status) {
                    uniqueValues.SP_id_Status.add(item.Status.trim());
                }
            });
            let oView = this.getView();

            ["SP_id_RaisedBy", "SP_id_Status"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(
                        new sap.ui.core.Item({
                            key: value,
                            text: value
                        })
                    );
                });
            });
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        SP_resolve: function () {
            var table = this.byId("idSupportTable");
            var selected = table.getSelectedItem();

            if (!selected) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoresolve"));
                return;
            }
            var oContext = selected.getBindingContext("SupportModel");
            var Data = oContext.getObject();

            if (Data.Status === "Resolved") {
                MessageToast.show(this.i18nModel.getText("alreadyResolved"));
                return;
            }
            if (!this.SP_Dialog) {
                this.SP_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Support", this);
                this.getView().addDependent(this.SP_Dialog);
            }
            this.SP_Dialog.open();
            this._FragmentDatePickersReadOnly(["SP_id_ResolutionDate"])
            sap.ui.getCore().byId("SP_id_Description").setValue("").setValueState("None");
            sap.ui.getCore().byId("SP_id_ResolutionDate").setValue(this.Formatter.formatDate(new Date())).setValueState("None");

        },

        supportCancel: function () {
            this.byId("idSupportTable").removeSelections();
            this.SP_Dialog.close();
        },

        onDescInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        supportSave: function () {
            if (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("SP_id_Description"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("SP_id_ResolutionDate"), "ID")
            ) {
                var table = this.byId("idSupportTable");
                var selected = table.getSelectedItem();

                if (!selected) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoresolve"));
                    return;
                }
                var oContext = selected.getBindingContext("SupportModel");
                var SPData = oContext.getObject();
                var Payload = {
                    "TicketID": SPData.TicketID,
                    "IssueName": SPData.IssueName,
                    "IssueType": SPData.IssueType,
                    "IssueDescription": SPData.IssueDescription,
                    "RaisedBy": SPData.RaisedBy,
                    "Email": SPData.Email,
                    "ResolvedDescription": sap.ui.getCore().byId("SP_id_Description").getValue(),
                    "Status": "Resolved",
                    "ResolvedDate": sap.ui.getCore().byId("SP_id_ResolutionDate").getValue()
                }
                this.getBusyDialog()
                this.ajaxUpdateWithJQuery("HM_Support", {
                    data: Payload,
                    filters: {
                        TicketID: SPData.TicketID
                    },
                }).then(async (oData) => {
                    MessageToast.show("Support Request Updated Successfully");
                    await this.CD_read();
                    this.SP_Dialog.close();
                }).catch((oError) => {
                    MessageToast.show("Error while updating support request");
                }).finally(() => {
                    this.closeBusyDialog();
                });
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }
        },

        createTableSheet: function () {
            return [
                {
                    label: "Issue Name",
                    property: "IssueName",
                    type: "string"
                },
                {
                    label: "Issue Type",
                    property: "IssueType",
                    type: "string"
                },

                {
                    label: "Issue Description",
                    property: "IssueDescription",
                    type: "string"
                },
                {
                    label: "Raised By",
                    property: "RaisedBy",
                    type: "string"
                },
                {
                    label: "Email",
                    property: "Email",
                    type: "string"
                },
                {
                    label: "Created Date",
                    property: "CreatedDate",
                    type: "string"
                },
                {
                    label: "Status",
                    property: "Status",
                    type: "string"
                },
                {
                    label: "Resolved Date",
                    property: "ResolvedDate",
                    type: "string"
                },
            ]
        },

        S_onDownload: function () {
            const oModel = this.byId("idSupportTable").getModel("SupportModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => {

                let resolvedDate = "";
                let createdDate = "";

                if (item.ResolvedDate && item.ResolvedDate !== "null" && item.ResolvedDate !== "1899-11-30") {
                    const d = new Date(item.ResolvedDate);
                    if (d.getFullYear() > 1900) {
                        resolvedDate = Formatter.formatDate(item.ResolvedDate);
                    }
                }

                if (item.CreatedDate) {
                    const d2 = new Date(item.CreatedDate);
                    if (d2.getFullYear() > 1900) {
                        createdDate = Formatter.formatDate(item.CreatedDate);
                    }
                }

                return {
                    ...item,
                    ResolvedDate: resolvedDate,
                    CreatedDate: createdDate
                };
            });
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Support_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingSupport"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },
    });
});