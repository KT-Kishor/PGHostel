sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/export/Spreadsheet",
], function (BaseController, Formatter, JSONModel, MessageToast, utils, Spreadsheet) {
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
         getGroupHeader: function (oGroup) {
                    return this.getStyledGroupHeader(oGroup);
                },

        SP_onPressClear: function () {
            this.getView().byId("SP_id_RaisedBy").setSelectedKey("")
            this.getView().byId("SP_id_Status").setSelectedKey("")
        },

        CD_read: async function () {
            const SRaisedBy = this.byId("SP_id_RaisedBy").getSelectedKey() ||
                this.byId("SP_id_RaisedBy").getValue();

            const SStatus = this.byId("SP_id_Status").getSelectedKey() ||
                this.byId("SP_id_Status").getValue();

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
            var oResolutionDate = sap.ui.getCore().byId("SP_id_ResolutionDate");
            var oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            oResolutionDate.setMinDate(oToday);
            oResolutionDate.setDateValue(null).setValue("").setValueState("None");
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
                    await this.CD_read();
                    this.SP_Dialog.close();
                }).catch((oError) => {
                    MessageToast.show("Error while updating support request");
                }).finally(() => {
                    this.closeBusyDialog();
                    MessageToast.show("Support Request Updated Successfully");
                });
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }
        },

        SP_assign: async function () {
            var oTable = this.byId("idSupportTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoAssign"));
                return;
            }

            var oData = oSelected.getBindingContext("SupportModel").getObject();

            // Assignment is allowed only for tickets that are still Open.
            var sStatus = String(oData.Status || "").trim().toLowerCase();
            if (sStatus !== "open") {
                if (sStatus === "assigned") {
                    MessageToast.show(this.i18nModel.getText("alreadyAssigned"));
                } else if (sStatus === "resolved") {
                    MessageToast.show(this.i18nModel.getText("alreadyResolved"));
                } else {
                    MessageToast.show(this.i18nModel.getText("wecannotAssign"));
                }
                return;
            }

            var oView = this.getView();

            try {
                if (!this.SP_AssignDialog) {
                    this.SP_AssignDialog = await sap.ui.core.Fragment.load({
                        id: oView.getId(),
                        name: "sap.ui.com.project1.fragment.Support_Assign",
                        controller: this
                    });
                    oView.addDependent(this.SP_AssignDialog);
                }
            } catch (oError) {
                console.error("Failed to load assign support dialog", oError);
                MessageToast.show(this.i18nModel.getText("assignSupportFailed"));
                return;
            }

            var oCombo = this.byId("SA_id_Employee");
            if (oCombo) {
                oCombo.setSelectedKey("").setValue("").setValueState("None");
                this._applyAssignEmployeeFilter(oCombo);
            }

            var oDatePicker = this.byId("SA_id_AssignedDate");
            if (oDatePicker) {
                oDatePicker.setDateValue(new Date());
            }

            this.SP_AssignDialog.open();

            // Load the DevEmployee list while the dialog is open so the
            // ComboBox always receives the filtered HM_LoginUser result.
            await this._loadAssignEmployees();

            var oAssignModel = oView.getModel("AssignEmployeeModel");
            if (oAssignModel) {
                oAssignModel.setProperty("/ticketId", oData.TicketID || "");
            }
        },

        // Loads employees once per session from HM_LoginUser (Role = DevEmployee)
        // and exposes them as AssignEmployeeModel>/employees for the assign dialog.
        _loadAssignEmployees: function () {
            var oView = this.getView();

            if (this._bAssignEmployeesLoaded) {
                return Promise.resolve();
            }

            this.getBusyDialog();

            return this.ajaxReadWithJQuery("HM_LoginUser", { Role: "DevEmployee" })
                .then(function (oResponse) {
                    var aRows = Array.isArray(oResponse.data)
                        ? oResponse.data
                        : (oResponse.data ? [oResponse.data] : []);
                    var oSeen = {};
                    var aEmployees = [];

                    aRows.forEach(function (oRow) {
                        if (!oRow) {
                            return;
                        }
                        var sEmail = (oRow.EmailID || "").trim();
                        var sUserId = (oRow.UserID || "").trim();
                        var sUserName = (oRow.UserName || "").trim();
                        var sKey = sEmail || sUserId || sUserName;

                        if (!sKey || oSeen[sKey]) {
                            return;
                        }
                        oSeen[sKey] = true;

                        aEmployees.push({
                            Key: sKey,
                            EmailID: sEmail,
                            UserID: sUserId,
                            UserName: sUserName,
                            DisplayName: sUserName || sEmail || sUserId
                        });
                    });

                    aEmployees.sort(function (a, b) {
                        return String(a.DisplayName).localeCompare(String(b.DisplayName));
                    });

                    oView.setModel(new JSONModel({ employees: aEmployees, ticketId: "" }), "AssignEmployeeModel");
                    this._bAssignEmployeesLoaded = true;
                }.bind(this))
                .catch(function (oError) {
                    console.error("Failed to load DevEmployee list from HM_LoginUser", oError);
                    oView.setModel(new JSONModel({ employees: [], ticketId: "" }), "AssignEmployeeModel");
                    MessageToast.show(this.i18nModel.getText("loadEmployeeFailed"));
                }.bind(this))
                .finally(function () {
                    this.closeBusyDialog();
                }.bind(this));
        },

        // Let the employee ComboBox type-ahead match either the UserName
        // (item text) or the EmailID (additionalText), instead of the default
        // starts-with match on the display text only.
        _applyAssignEmployeeFilter: function (oCombo) {
            if (!oCombo || !oCombo.setFilterFunction) {
                return;
            }
            oCombo.setFilterFunction(function (sTerm, oItem) {
                var sNeedle = String(sTerm || "").toLowerCase();
                var sName = String(oItem.getText() || "").toLowerCase();
                var sEmail = String(oItem.getAdditionalText() || "").toLowerCase();
                return sName.indexOf(sNeedle) !== -1 || sEmail.indexOf(sNeedle) !== -1;
            });
        },

        onAssignEmployeeChange: function (oEvent) {
            var oCombo = oEvent.getSource();

            if (!oCombo.getValue()) {
                oCombo.setValueState("None");
                return;
            }

            utils._LCstrictValidationComboBox(oCombo, "ID");
        },

        supportAssignSave: function () {
            var oCombo = this.byId("SA_id_Employee");

            if (!utils._LCstrictValidationComboBox(oCombo, "ID")) {
                MessageToast.show(this.i18nModel.getText("selectEmployee"));
                return;
            }

            var sValue = oCombo.getValue();
            var oItem = oCombo.getItems().find(function (oEmployeeItem) {
                return oEmployeeItem.getText() === sValue || oEmployeeItem.getKey() === sValue;
            });
            var sAssignedTo = oItem ? oItem.getKey() : (oCombo.getSelectedKey() || sValue);

            // AssignedName carries the employee's UserName from HM_LoginUser.
            var sAssignedName = "";
            var oItemContext = oItem && oItem.getBindingContext("AssignEmployeeModel");
            if (oItemContext) {
                sAssignedName = oItemContext.getObject().UserName || "";
            }
            if (!sAssignedName) {
                sAssignedName = oItem ? oItem.getText() : sValue;
            }

            var oSelected = this.byId("idSupportTable").getSelectedItem();
            if (!oSelected) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoAssign"));
                return;
            }

            var oData = oSelected.getBindingContext("SupportModel").getObject();
            var oPayload = {
                "TicketID": oData.TicketID,
                "IssueName": oData.IssueName,
                "IssueType": oData.IssueType,
                "IssueDescription": oData.IssueDescription,
                "RaisedBy": oData.RaisedBy,
                "Email": oData.Email,
                "Status": "Assigned",
                "AssignedTo": sAssignedTo,
                "AssignedName": sAssignedName,
                "AssignedDate": new Date().toISOString().split("T")[0]
            };

            this.getBusyDialog();
            this.ajaxUpdateWithJQuery("HM_Support", {
                data: oPayload,
                filters: {
                    TicketID: oData.TicketID
                },
            }).then(async () => {
                await this.CD_read();
                this.SP_AssignDialog.close();
                MessageToast.show(this.i18nModel.getText("assignSupportSuccess"));
            }).catch(() => {
                MessageToast.show(this.i18nModel.getText("assignSupportFailed"));
            }).finally(() => {
                this.closeBusyDialog();
            });
        },

        supportAssignCancel: function () {
            this.byId("idSupportTable").removeSelections();
            this.SP_AssignDialog.close();
        },

        HF_viewroom: async function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("SupportModel");
            var oRowData = oContext.getObject();
            var filter = {
                TicketID: oRowData.TicketID
            };
            this.getBusyDialog();

            this.ajaxReadWithJQuery("HM_Supportdata", filter)
                .then((oData) => {
                    this.closeBusyDialog();

                    if (!oData.data || oData.data.length === 0) {
                        sap.m.MessageBox.information("No data found");
                        return;
                    }
                    const record = oData.data[0];
                    let aImages = [];

                    if (record.Photo1) {
                        aImages.push({
                            src: record.Photo1,
                            type: record.Photo1Type
                        });
                    }
                    if (record.Photo2) {
                        aImages.push({
                            src: record.Photo2,
                            type: record.Photo2Type
                        });
                    }
                    if (record.Photo3) {
                        aImages.push({
                            src: record.Photo3,
                            type: record.Photo3Type
                        });
                    }
                    if (aImages.length === 0) {
                        sap.m.MessageBox.information("No images uploaded.");
                        return;
                    }
                    // Convert Base64 images
                    const aCarouselImages = aImages.map(function (img) {
                        let base64 = img.src.replace(/\s/g, "");

                        if (!base64.startsWith("data:image")) {
                            base64 = "data:" + img.type + ";base64," + base64;
                        }
                        return new sap.m.FlexBox({
                            width: "100%",
                            height: "100%",
                            alignItems: "Center",
                            justifyContent: "Center",
                            renderType: "Bare",
                            items: [
                                new sap.m.Image({
                                    src: base64,
                                    densityAware: false,
                                    decorative: false,
                                }).addStyleClass("supportCarouselImage")
                            ]
                        }).addStyleClass("supportCarouselImagePage");
                    });
                    this._openImageDialog(aCarouselImages);
                })
                .catch((err) => {
                    this.closeBusyDialog();
                    sap.m.MessageBox.error("Failed to load images");
                });
        },

        _openImageDialog: function (aImages) {
            // Create Carousel
            var oCarousel = new sap.m.Carousel({
                pages: aImages,
                width: "100%",
                height: "100%",
                showPageIndicator: false
            }).addStyleClass("supportImageCarousel");
            this._oDialog = new sap.m.Dialog({
                title: "Support Images",
                contentWidth: "80vw",
                contentHeight: "80vh",
                resizable: true,
                draggable: true,
                verticalScrolling: false,
                content: [oCarousel],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: () => {
                        this._oDialog.close();
                    }
                }).addStyleClass("myUnifiedBtn"),
                afterClose: () => {
                    this._oDialog.destroy();
                }
            }).addStyleClass("supportImageDialog");
            this._oDialog.open();
        },

        createTableSheet: function () {
            return [{
                label: "Status",
                property: "Status",
                type: "string"
            },
            {
                label: "Ticket ID",
                property: "TicketID",
                type: "string"
            },
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
                label: "Assigned To",
                property: "AssignedToDisplay",
                type: "string"
            },
            {
                label: "Assigned Date",
                property: "AssignedDate",
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
                let assignedDate = "";
                if (item.AssignedDate) {
                    const d3 = new Date(item.AssignedDate);
                    if (d3.getFullYear() > 1900) {
                        assignedDate = Formatter.formatDate(item.AssignedDate);
                    }
                }
                return {
                    ...item,
                    ResolvedDate: resolvedDate,
                    CreatedDate: createdDate,
                    AssignedToDisplay: Formatter.formatAssignedNameAndEmail(item.AssignedName, item.AssignedTo),
                    AssignedDate: assignedDate
                };
            });
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Support Details"
                    }
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
