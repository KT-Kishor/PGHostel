sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
      "../model/formatter"
], function (BaseController, utils, MessageToast,
    Spreadsheet,Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Bed_Details", {
          Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBedDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            try {
                this.commonLoginFunction();
                var model = new sap.ui.model.json.JSONModel({
                    BranchCode: "",
                    Name: "",
                    ACType: "",
                });
                this.getView().setModel(model, "BedModel")
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oTokenModel = new sap.ui.model.json.JSONModel({
                    tokens: []
                });

                const oUploaderData = new sap.ui.model.json.JSONModel({
                    attachments: []
                });

                this.getView().setModel(oTokenModel, "tokenModel");
                this.getView().setModel(oUploaderData, "UploaderData");
                this.onClearAndSearch("BD_id_FilterbarEmployee");
                await this._loadBranchCode()
                await this.Onsearch()
                this.Customerdata()
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
        Customerdata:function(){
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
                filters.BranchCode = aBranchCodes;
                filters.Role ="Admin";
            }else{
                filters.BranchCode = "";
            }
            this.ajaxReadWithJQuery("HM_Customer", filters).then((response) => {
                    
                        const oModel = new sap.ui.model.json.JSONModel(response.Customers);
                        this.getView().setModel(oModel, "HostelModel");

                        sap.ui.core.BusyIndicator.hide();
                    }).catch(() => sap.ui.core.BusyIndicator.hide());
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
                filters.Role ="Admin";
            }else{
                filters.BranchID = "";
            }
            sap.ui.core.BusyIndicator.show(0);
            try {
                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);

                const aBranches = Array.isArray(oResponse?.data) ?
                    oResponse.data :
                    (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "BranchModel");

            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        HM_RoomDetails: function (oEvent) {
            if (this.ARD_Dialog) {
                this.ARD_Dialog.destroy();
                this.ARD_Dialog = null;
            }
            this.byId("id_BedTable").removeSelections();
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
            oView.getModel("BedModel").setData({})

            // Clear tokens and upload data for new record
            oView.getModel("tokenModel").setData({
                tokens: []
            });

            oView.getModel("UploaderData").setData({
                attachments: [],
                isFileUploaded: false
            });

            var aControls = this.ARD_Dialog.findAggregatedObjects(true, function (oControl) {
                return oControl instanceof sap.m.Input ||
                    oControl instanceof sap.m.ComboBox ||
                    oControl instanceof sap.m.Select ||
                    oControl instanceof sap.m.TextArea;
            });

            aControls.forEach(function (oControl) {
                oControl.setValueState("None");
            });
            this.ARD_Dialog.open();
        },

        onNoOfPersonInputLiveChange: function (oEvent) {
            utils.onNumber(oEvent.getSource(), "ID");
        },

        onLivehange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        BT_onsavebuttonpress: async function () {
            var oView = this.getView();
            var Payload = oView.getModel("BedModel").getData();
            const oUploaderData = oView.getModel("UploaderData");
            const attachments = oUploaderData.getProperty("/attachments") || [];

            if (
                utils._LCstrictValidationComboBox(oView.byId("BD_id_RoomType12"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("BD_idBedType"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("BD_id_Roomtype"), "ID") &&
                utils.onNumber(oView.byId("BD_id_Person"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("BD_id_MaxBeds"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("BD_id_DepositAmount"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("BD_id_DepositCurrency"), "ID")&&
                utils._LCvalidateMandatoryField(oView.byId("BD_id_Description"), "ID")
            ) {
                var Attachment = oView.getModel("tokenModel").getData();
                if (!Attachment.tokens || Attachment.tokens.length === 0) {
                    return sap.m.MessageToast.show(this.i18nModel.getText("pleaseUploadatLeastOneImage"));
                }

                if (attachments.length === 0) {
                    sap.m.MessageBox.error(this.i18nModel.getText("pleaseUploadatLeastOneImage"));
                    return;
                }
                if (attachments.length > 5) {
                    sap.m.MessageBox.error(this.i18nModel.getText("youcanUploadMaximumof5ImagesOnly"));
                    return;
                }

                var aBedDetails = oView.getModel("BedDetails").getData() || "";
                var bDuplicate = aBedDetails.some(function (bed) {
                    // skip the same record in edit mode
                    if (Payload.ID && bed.ID === Payload.ID) {
                        return false;
                    }
                    return (
                        bed.Name.trim().toLowerCase() === Payload.Name.trim().toLowerCase() &&
                        bed.BranchCode === Payload.BranchCode &&
                        bed.ACType === Payload.ACType
                    );
                });

                if (bDuplicate) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText("bedwithSameBedTypeBranchCodeACTypeAlreadyExists")
                    );
                    return;
                }

                // File validation
                const oData = {
                    data: {
                        Name: Payload.Name.trim(),
                        BranchCode: Payload.BranchCode.split('-')[0],
                        ACType: Payload.ACType,
                        NoOfPerson: Payload.NoOfPerson.trim(),
                        MaxBeds: Payload.MaxBeds.trim(),
                        Deposit: Payload.Deposit.trim(),
                        DepositCurrency: Payload.DepositCurrency,
                        Description: Payload.Description
                    },
                    Attachment: {}
                };

                attachments.slice(0, 5).forEach((file, index) => {
                    const num = index + 1;
                    oData.Attachment[`Photo${num}`] = file.content || "";
                    oData.Attachment[`Photo${num}Name`] = file.filename || "";
                    oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                });

                for (let i = attachments.length + 1; i <= 5; i++) {
                    oData.Attachment[`Photo${i}`] = "";
                    oData.Attachment[`Photo${i}Name`] = "";
                    oData.Attachment[`Photo${i}Type`] = "";
                }
                oData.Attachment.BranchCode = Payload.BranchCode

                try {
                    sap.ui.core.BusyIndicator.show(0);
                    await this.ajaxCreateWithJQuery("HM_BedType", {
                        data: oData
                    });
                    oView.getModel("UploaderData").setData({
                        attachments: []
                    });
                    oView.getModel("tokenModel").setData({
                        tokens: []
                    });
                    await this.Onsearch("true");
                    sap.m.MessageToast.show(this.i18nModel.getText("bedsavedsuccessfully"));
                    this.ARD_Dialog.close();
                    if (this.ARD_Dialog) {
                        this.ARD_Dialog.destroy();
                        this.ARD_Dialog = null;
                    }
                } catch (err) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show(err.message || err.responseText);
                }
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }
        },

        onTokenDelete: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("tokenModel");
            const oUploaderData = oView.getModel("UploaderData");

            let aTokens = oModel.getProperty("/tokens") || [];
            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            const oListItem = oEvent.getParameter("listItem");
            if (oListItem) {
                const oCtx = oListItem.getBindingContext("UploaderData");
                const sFileName = oCtx.getProperty("filename");

                aAttachments = aAttachments.filter(file => file.filename !== sFileName);
                aTokens = aTokens.filter(token => token.key !== sFileName);
            }
            const aDeletedTokens = oEvent.getParameter("tokens");
            if (aDeletedTokens) {
                aDeletedTokens.forEach((oDeletedToken) => {
                    const sKey = oDeletedToken.getKey();
                    aTokens = aTokens.filter(token => token.key !== sKey);
                    aAttachments = aAttachments.filter(file => file.filename !== sKey);
                });
            }
            oModel.setProperty("/tokens", aTokens);
            oUploaderData.setProperty("/attachments", aAttachments);
            this.byId("BT_id_FileUploader").clear();
        },

        onFacilityFileChange: function (oEvent) {
            const oFiles = oEvent.getParameter("files");
            if (!oFiles || oFiles.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            // Block if already 5 files uploaded
            if (aAttachments.length >= 5) {
                sap.m.MessageToast.show(this.i18nModel.getText("youcanUploadMaximumof5ImagesOnly"));
                return;
            }

            // Only allow remaining slots
            const iAvailableSlots = 5 - aAttachments.length;
            const aSelectedFiles = Array.from(oFiles).slice(0, iAvailableSlots);

            aSelectedFiles.forEach((oFile) => {
                const MAX_SIZE = 2 * 1024 * 1024; // 2MB
                if (oFile.size > MAX_SIZE) {
                    sap.m.MessageToast.show(
                        "File size must be Less than 2 MB.\nSelected file size: " +
                        (oFile.size / 1024 / 1024).toFixed(2) + " MB"
                    );

                    //  Reset the FileUploader input
                    oEvent.getSource().clear();
                    return;
                }
                const bIsDuplicate = aAttachments.some(att =>
                    att.filename === oFile.name // filename duplicate
                );

                if (bIsDuplicate) {
                    sap.m.MessageToast.show(`"${oFile.name}" is Already Uploaded.`);
                    return;
                }

                // Validate file type
                if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                    sap.m.MessageToast.show(this.i18nModel.getText("onlyimagefilesareallowed"));
                    return;
                }

                const oReader = new FileReader();
                oReader.onload = (e) => {
                    const sBase64 = e.target.result.split(",")[1];

                    // Final Duplicate Check using file content
                    const bContentDuplicate = aAttachments.some(att => att.content === sBase64);
                    if (bContentDuplicate) {
                        sap.m.MessageToast.show(this.i18nModel.getText("thisimageisalreadyuploaded"));
                        return;
                    }

                    // Add attachment
                    aAttachments.push({
                        content: sBase64,
                        fileType: oFile.type,
                        filename: oFile.name,
                        size: this.formatFileSize(oFile.size)
                    });

                    // Add token
                    aTokens.push({
                        key: oFile.name,
                        text: oFile.name
                    });

                    oUploaderData.setProperty("/attachments", aAttachments);
                    oTokenModel.setProperty("/tokens", aTokens);
                };

                oReader.readAsDataURL(oFile);
            });
        },

        formatFileSize: function (bytes) {
            if (!bytes) return "0 Bytes";
            const sizes = ["Bytes", "KB", "MB", "GB"];
            let i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
        },

        BT_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
            if (this.ARD_Dialog) {
                this.ARD_Dialog.destroy();
                this.ARD_Dialog = null;
            }
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("BedDetails").setData({});
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("BedDetails").setData({});
        },

        Onsearch: function (flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];


            var oView = this.getView();
            var oTable = oView.byId("id_BedTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() ||
                oView.byId("PO_id_CustomerName").getValue();
            var sCustomerID = oView.byId("PO_id_CompanyName").getSelectedKey() ||
                oView.byId("PO_id_CompanyName").getValue();

            let aBranchCodes = [];



          if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            }else   if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role === "Admin") {
                filters = { BranchCode: aBranchCodes };
                filters.Role ="Admin";

            }else{
                filters = { BranchCode: "" };

            }

            if (sCustomerName) filters.Name = sCustomerName;
            if (sCustomerID) filters.ACType = sCustomerID;

            sap.ui.core.BusyIndicator.show(0);

            return this.ajaxReadWithJQuery("HM_BedType", filters)
                .then((oData) => {

                    const response = Array.isArray(oData.data) ? oData.data : [oData.data];

                    if (!response || response.length === 0) {
                        this._originalBedData = [];
                        const emptyModel = new sap.ui.model.json.JSONModel([]);
                        this.getView().setModel(emptyModel, "BedDetails");
                        return;
                    }

                    if (!this._originalBedData || flag === "true" || flag === undefined || this._originalBedData.length === 0) {
                        this._originalBedData = response;
                    }


                    if (Object.keys(filters).length === 0) {
                        const model = new sap.ui.model.json.JSONModel(this._originalBedData);
                        this.getView().setModel(model, "BedDetails");

                        this._populateUniqueFilterValues(this._originalBedData);
                        return;
                    }

                    const filteredData = response;

                    const model = new sap.ui.model.json.JSONModel(filteredData);
                    this.getView().setModel(model, "BedDetails");

                    this._populateUniqueFilterValues(this._originalBedData);
                })
                .catch((err) => {
                    console.error("Error in search", err);
                    sap.m.MessageBox.error(this.i18nModel.getText("failedtoLoadBedDetails"));
                })
                .finally(() => {
                    sap.ui.core.BusyIndicator.hide();
                });
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                PO_id_CustomerName: new Set(),
                PO_id_CompanyName: new Set(),

            };

            data.forEach(item => {
                uniqueValues.PO_id_CustomerName.add(item.Name);
                uniqueValues.PO_id_CompanyName.add(item.ACType);
            });

            let oView = this.getView();
            ["PO_id_CustomerName", "PO_id_CompanyName"].forEach(field => {
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

        HM_onSearch: function () {
            var oView = this.getView();
            var oTable = oView.byId("id_BedTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() || oView.byId("PO_id_CustomerName").getValue();
            var sCustomerID = oView.byId("PO_id_CompanyName").getSelectedKey() || oView.byId("PO_id_CompanyName").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BranchCode", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });
            oBinding.filter(oCombinedFilter);
        },

        PO_onPressClear: function () {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("")
            this.getView().byId("PO_id_CompanyName").setSelectedKey("")
        },

        onbranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        onNameInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        onColumnListItemPress: function (oEvent) {
            var BEdID = oEvent.getSource().getBindingContext("BedDetails").getObject().ID;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("RouteRoomImages", {
                sPath: BEdID
            })
        },

       HM_DeleteDetails: function () {
    var CustData = this.getView().getModel("HostelModel").getData();
    var table = this.byId("id_BedTable");
    var aSelectedItems = table.getSelectedItems();

    // No selection
    if (aSelectedItems.length === 0) {
        sap.m.MessageToast.show(
            this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete")
        );
        return;
    }

    var aAssignedBeds = [];
    var aDeletableBeds = [];

    // Split assigned & non-assigned beds
    aSelectedItems.forEach(item => {
        var oBed = item.getBindingContext("BedDetails").getObject();

        var bAssigned = CustData.some(cust =>
            cust.BranchCode === oBed.BranchCode &&
            cust.BedType === (oBed.Name + " - " + oBed.ACType) &&
            cust.Status === "Assigned"
        );

        if (bAssigned) {
            aAssignedBeds.push(oBed.Name);
        } else {
            aDeletableBeds.push({
                name: oBed.Name,
                item: item
            });
        }
    });

    // Single selection & assigned → stop
    if (aSelectedItems.length === 1 && aAssignedBeds.length === 1) {
        sap.m.MessageBox.warning(
            "Cannot delete! Selected bed is already assigned."
        );
        return;
    }

    // All selected beds are assigned
    if (aDeletableBeds.length === 0) {
        sap.m.MessageBox.warning(
            "All selected beds are already assigned and cannot be deleted."
        );
        return;
    }

    // Show only non-assigned bed names in confirm dialog
    var sBedNames = aDeletableBeds
        .map(bed => bed.name)
        .join(", ");

    sap.m.MessageBox.confirm(
        `Are you sure you want to delete the following bed(s): ${sBedNames}?`,
        {
            title: "Confirm Deletion",
            icon: sap.m.MessageBox.Icon.WARNING,
            actions: [
                sap.m.MessageBox.Action.OK,
                sap.m.MessageBox.Action.CANCEL
            ],
            onClose: async function (sAction) {
                if (sAction === sap.m.MessageBox.Action.OK) {
                    sap.ui.core.BusyIndicator.show(0);
                    try {
                        const deletePromises = aDeletableBeds.map(bedObj => {
                            const data = bedObj.item
                                .getBindingContext("BedDetails")
                                .getObject();

                            return $.ajax({
                                url: "https://rest.kalpavrikshatechnologies.com/HM_BedType",
                                method: "DELETE",
                                contentType: "application/json",
                                data: JSON.stringify({
                                    filters: { ID: data.ID }
                                }),
                                headers: {
                                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                                }
                            });
                        });

                        await Promise.all(deletePromises);
                        await this.Onsearch("true");

                        sap.m.MessageToast.show(
                            this.i18nModel.getText("selectedBedDeletedSuccessfully")
                        );
                    } catch (error) {
                        console.error("Delete failed:", error);
                        sap.m.MessageBox.error(
                            this.i18nModel.getText("errorwhileDeletingBedPleaseTryAgain")
                        );
                    } finally {
                        sap.ui.core.BusyIndicator.hide();
                        table.removeSelections(true);
                    }
                }
            }.bind(this)
        }
    );
},
  onDepositCurrency: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        BD_onDownload: function () {
            const oModel = this.byId("id_BedTable").getModel("BedDetails").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                MaxBeds: item.MaxBeds ? String(item.MaxBeds) : "",
                NoOfPerson: item.NoOfPerson ? String(item.NoOfPerson) : "",
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Bed_Details.xlsx",
                worker: false,
            };
            MessageToast.show(this.i18nModel.getText("downloadingRoomDetails"));
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "Branch Code",
                property: "BranchCode",
                type: "string"
            },
            {
                label: "Bed Type",
                property: "Name",
                type: "string"
            },
            {
                label: "Room Type",
                property: "ACType",
                type: "string"
            },
            {
                label: "Max No of Rooms",
                property: "MaxBeds",
                type: "string"
            },
            {
                label: "No of Persons",
                property: "NoOfPerson",
                type: "string"
            },
            {
                label: "Description",
                property: "Description",
                type: "string"
            }
            ]
        },
    });
});