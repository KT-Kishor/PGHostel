sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast"
], function (BaseController, utils, MessageBox, Spreadsheet, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.HostelFeatures", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteHostelFeatures").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            try {
                var LoginFUnction = await this.commonLoginFunction("ManageAmenities");
                if (!LoginFUnction) return;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // Main form model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    BranchCode: "",
                    FacilityName: "",
                    Description: "",
                    ID: ""
                }), "HostelFeaturesModel");

                // Upload model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    Photo1: "",
                    Photo1Type: "",
                    Photo1Name: ""
                }), "UploadModel");

                // Token model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    tokens: []
                }), "tokenModel");

                this.onClearAndSearch("HF_id_FilterbarEmployee");
                await this._loadBranchCode()
                await this.Onsearch("true");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchID = aBranchCodes;
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
                filters.BranchID = oExistingModel.BranchCode;
            }
            this.getBusyDialog()
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        HM_AddHostelFeature: function () {
            const oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(),
                    "sap.ui.com.project1.fragment.HostelFeatures", this);
                oView.addDependent(this.ARD_Dialog);
            }

            oView.getModel("HostelFeaturesModel").setData({
                BranchCode: "",
                FacilityName: "",
                Description: "",
                ID: "",
                Type: ""
            });

            oView.getModel("UploadModel").setData({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: ""
            });

            oView.getModel("tokenModel").setData({
                tokens: []
            });

            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        HM_EditHostelFeature: function () {
            const oTable = this.byId("HF_HostelFeatureTable");
            const oSelected = oTable.getSelectedItems();

            if (oSelected.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("MSediterr"));
                return;
            }

            if (oSelected.length > 1) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoedit"));
                return;
            }

            const oData = oSelected[0].getBindingContext("HostelFeatures").getObject();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(this.getView().getId(),
                    "sap.ui.com.project1.fragment.HostelFeatures", this);
                this.getView().addDependent(this.ARD_Dialog);
            }

            this.getView().getModel("HostelFeaturesModel").setData(oData);

            // Load image into upload model
            this.getView().getModel("UploadModel").setData({
                Photo1: oData.Photo1 || "",
                Photo1Type: oData.Photo1Type || "",
                Photo1Name: oData.Photo1Name || ""
            });

            // Add existing file to tokens
            const aTokens = oData.Photo1Name ? [{
                key: oData.Photo1Name,
                text: oData.Photo1Name
            }] : [];

            this.getView().getModel("tokenModel").setData({
                tokens: aTokens
            });

            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        HF_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
            this.byId("HFF_id_BranchCode").setValueState("None");
            this.byId("HF_HostelFeatureTable").removeSelections(true);
        },

        onNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityNameChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onHostelbranchChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        HF_onsavebuttonpress: async function () {
            const oView = this.getView();
            const oHostelFeaturesModel = oView.getModel("HostelFeaturesModel");
            const Payload = oHostelFeaturesModel.getData();
            const oUpload = oView.getModel("UploadModel").getData();
            const aHostelData = oView.getModel("HostelFeatures").getData();

            //  Mandatory field validation
            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("HFF_id_BranchCode")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HFF_id_FacilityName")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("HFF_id_Amenities")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("HFF_id_Description")), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            //  Duplicate check
            var bDuplicate = aHostelData.some(function (facility) {
                if (Payload.ID && facility.ID === Payload.ID) return false; // Skip comparing the same record during update
                return (
                    facility.BranchCode === Payload.BranchCode &&
                    facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase()
                );
            });

            if (bDuplicate) {
                sap.m.MessageToast.show(this.i18nModel.getText("facilitywiththeSameNameAlreadyExists"));
                return;
            }

            if (Payload.Type === "Others") {
                if (!oUpload.Photo1 || !oUpload.Photo1Name || !oUpload.Photo1Type) {
                    sap.m.MessageToast.show("Please upload at least 1 image for 'Others' type.");
                    return;
                }
            }

            this.getBusyDialog()
            try {
                const oPayload = {
                    BranchCode: Payload.BranchCode,
                    FacilityName: Payload.FacilityName,
                    Description: Payload.Description,
                    Photo1: oUpload.Photo1,
                    Photo1Type: oUpload.Photo1Type,
                    Photo1Name: oUpload.Photo1Name,
                    Type: Payload.Type
                };

                if (Payload.ID) {
                    // UPDATE
                    await this.ajaxUpdateWithJQuery("HM_HostelFeatures", {
                        data: {
                            ID: Payload.ID,
                            ...oPayload
                        },
                        filters: {
                            ID: Payload.ID
                        }
                    });
                    this.ARD_Dialog.close();
                    sap.m.MessageToast.show(this.i18nModel.getText("amenitiesUpdatedSuccessfully"));
                } else {
                    // CREATE
                    await this.ajaxCreateWithJQuery("HM_HostelFeatures", {
                        data: oPayload
                    });
                    this.ARD_Dialog.close();
                    sap.m.MessageToast.show(this.i18nModel.getText("amenitiesAddedSuccessfully"));
                }

                await this.Onsearch("true");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message);
            } finally {
                this.closeBusyDialog()
            }
        },

        onFacilityFileChange: function (oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;
            const oReader = new FileReader();
            oReader.onload = (e) => {
                const base64 = e.target.result.split(",")[1];

                this.getView().getModel("UploadModel").setData({
                    Photo1: base64,
                    Photo1Type: oFile.type,
                    Photo1Name: oFile.name
                });

                this.getView().getModel("tokenModel").setData({
                    tokens: [{
                        key: oFile.name,
                        text: oFile.name
                    }]
                });
            };
            oReader.readAsDataURL(oFile);
        },

        onTokenDelete: function (oEvent) {
            this.getView().getModel("UploadModel").setData({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: ""
            });
            this.getView().getModel("tokenModel").setData({
                tokens: []
            });
        },

        Onsearch: function (flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            var oView = this.getView();
            var oTable = oView.byId("HF_HostelFeatureTable");
            var oBinding = oTable.getBinding("items");

            var sFacilityName = oView.byId("HF_id_FacilityName").getSelectedKey() ||
                oView.byId("HF_id_FacilityName").getValue();

            let aBranchCodes = [];

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode.split(",").map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role === "Admin") {
                filters = { BranchCode: aBranchCodes };
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters.BranchCode = oExistingModel.BranchCode;
            }

            if (sFacilityName) filters.FacilityName = sFacilityName;
            this.getBusyDialog()
            return this.ajaxReadWithJQuery("HM_HostelFeatures", filters).then((oData) => {
                let response = Array.isArray(oData.data) ? oData.data : [oData.data];

                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                // Map BranchCode to BranchName directly in response
                response = response.map(bed => {
                    const branch = branchData.find(br => br.BranchID === bed.BranchCode);
                    return {
                        ...bed,
                        BranchName: branch ? branch.Name : bed.BranchID
                    };
                });

                if (!this._originalBedData || flag === "true") {
                    this._originalBedData = response;
                }

                if (Object.keys(filters).length === 0) {
                    const model = new sap.ui.model.json.JSONModel(this._originalBedData);
                    this.getView().setModel(model, "HostelFeatures");
                    this._populateUniqueFilterValues(this._originalBedData);
                    return;
                }

                const filteredData = response;
                const model = new sap.ui.model.json.JSONModel(filteredData);
                this.getView().setModel(model, "HostelFeatures");
                this._populateUniqueFilterValues(this._originalBedData);
            }).catch((err) => {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }).finally(() => {
                this.closeBusyDialog()
            });
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                HF_id_FacilityName: new Set(),
            };

            data.forEach(item => {
                uniqueValues.HF_id_FacilityName.add(item.FacilityName);
            });

            let oView = this.getView();
            ["HF_id_FacilityName"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        HM_DeleteHostelFeature: async function () {
            var oTable = this.byId("HF_HostelFeatureTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete"));
                return;
            }

            var that = this;

            // Build facility names for confirmation message
            var sNames = aSelectedItems.map(item => {
                var oData = item.getBindingContext("HostelFeatures").getObject();
                return oData.FacilityName;
            }).join(", ");

            MessageBox.confirm(
                `Are you sure you want to Delete the Selected Amenities: ${sNames}?`, {
                icon: MessageBox.Icon.WARNING,
                title: "Confirm Deletion",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.NO,
                styleClass: "myUnifiedBtn",
                onClose: async function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        try {
                            that.getBusyDialog()

                            // Collect all delete promises
                            const aDeletePromises = aSelectedItems.map(async (item) => {
                                var oData = item.getBindingContext("HostelFeatures").getObject();
                                await that.ajaxDeleteWithJQuery("HM_HostelFeatures", {
                                    filters: {
                                        ID: oData.ID
                                    }
                                });
                            });

                            // Wait for all deletions to complete
                            await Promise.all(aDeletePromises);
                            await that.Onsearch("true"); // refresh table
                        } catch (err) {
                            that.closeBusyDialog()
                            sap.m.MessageToast.show(err.message || err.responseText);
                        } finally {
                            that.closeBusyDialog()
                            sap.m.MessageToast.show(that.i18nModel.getText("hostelFeatureDeletedSuccessfully"));
                            oTable.removeSelections(true);
                        }
                    } else {
                        oTable.removeSelections(true);
                    }
                }
            }
            );
        },

        _resetFacilityValueStates: function () {
            ["HFF_id_FacilityName", "HFF_id_Description"].forEach(id => {
                const oField = this.byId(id);
                if (oField) oField.setValueState("None");
            });
        },

        FC_onPressClear: function () {
            this.getView().byId("HF_id_FacilityName").setSelectedKey("")
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("HostelFeatures").setData({});
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        HF_viewroom: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("HostelFeatures");
            var oData = oContext.getObject();

            if (!oData.Photo1 || !oData.Photo1.length) {
                sap.m.MessageBox.information(
                    "No image is uploaded.",
                    {
                        title: "Information",
                        styleClass: "myUnifiedBtn"
                    }
                );
                return;
            }

            var sBase64 = oData.Photo1.replace(/\s/g, "");
            if (sBase64 && !sBase64.startsWith("data:image")) {
                sBase64 = "data:image/jpeg;base64," + sBase64;
            }
            var oImage = new sap.m.Image({
                src: sBase64,
                densityAware: false,
                decorative: false,
                width: "100%",
                height: "100%",
                style: "object-fit: cover; display:block; margin:0; padding:0;"
            });
            var oDialog = new sap.m.Dialog({
                title: "Amenities",
                contentWidth: "50%",
                contentHeight: "60%",
                horizontalScrolling: false,
                verticalScrolling: false,
                content: [oImage],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });
            oDialog.addStyleClass("ImageDialogNoPadding");
            oDialog.open();
        },

        onAmenitieTypeChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        createTableSheet: function () {
            return [{
                label: "Property Name",
                property: "BranchName",
                type: "string"
            },
            {
                label: "Amenities Name",
                property: "FacilityName",
                type: "string"
            },
            {
                label: "Type",
                property: "Type",
                type: "string"
            },
            {
                label: "Description",
                property: "Description",
                type: "string"
            }
            ]
        },

        HF_onDownload: function () {
            const oModel = this.byId("HF_HostelFeatureTable").getModel("HostelFeatures").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Amenities Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Amenities_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingAmenitiesDetails"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },
    });
});