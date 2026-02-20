sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "../utils/validation"
], function(
    BaseController, Formatter, MessageBox, JSONModel, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Bed_Images", {
        Formatter: Formatter,
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteRoomImages").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function(oEvent) {
            try {
                var Layout = this.byId("ObjectPageLayout");
                Layout.setSelectedSection(this.byId("purchaseOrderHeaderSection1"));

                var model = new sap.ui.model.json.JSONModel({
                    Edit: false,
                    save: false

                });
                this.getView().setModel(model, "editable")
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var BedImageModel = new sap.ui.model.json.JSONModel({
                    BranchCode: "",
                    Name: "",
                    ACType: "",

                });
                this.getView().setModel(BedImageModel, "BedImageModel")

                 

                this.BedID = oEvent.getParameter("arguments").sPath;
                await this._loadBranchCode()
                await this.Onsearch()
                  var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomtype",
                "idR",
                "id_MaxBeds",
                "id_Description"
            ];

            aInputIds.forEach(function (sId) {
                var oInput = this.getView().byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            }.bind(this));
                await this.refershModel(this.BedID)
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {}
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
            } else if (oExistingModel.Role === "SuperAdmin" ) {
                    filters.BranchID = "";
            } else{
                filters.BranchID = oExistingModel.BranchCode;
            }
            sap.ui.core.BusyIndicator.show(0);
            try {
                 this.commonLoginFunction();

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

        Onsearch: function() {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedDetails")
            })
        },
          onDepositCurrency: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        refershModel: async function (sBedID) {
            sap.ui.core.BusyIndicator.show(0);
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BedType", {
                    ID: sBedID
                });

                const aData = Array.isArray(oResponse?.data)
                    ? oResponse.data
                    : [oResponse.data];

                const oBedData = aData[0] || {};

                // 1️⃣ Set main Bed data
                this.getView().getModel("BedImageModel").setData(oBedData);

                // 2️⃣ Prepare image array
                let aDisplayImages = [];

                for (let i = 1; i <= 5; i++) {
                    const sPhoto = oBedData[`Photo${i}`];
                    const sName  = oBedData[`Photo${i}Name`];
                    const sType  = oBedData[`Photo${i}Type`];

                    if (sPhoto) {
                        aDisplayImages.push({
                            src: `data:${sType || "image/jpeg"};base64,${sPhoto}`,
                            fileName: sName || `Photo${i}`,
                            fileType: sType || "image/jpeg",
                            isPlaceholder: false
                        });
                    }
                }

                // 3️⃣ Normalize placeholders (ALWAYS pad to 5)
                const MAX_IMAGES = 5;
                const realImagesCount = aDisplayImages.length;

                for (let i = realImagesCount; i < MAX_IMAGES; i++) {
                    aDisplayImages.push({
                        isPlaceholder: true
                    });
                }

                // 4️⃣ Set DisplayImagesModel
                const oDisplayModel = new sap.ui.model.json.JSONModel({
                    DisplayImages: aDisplayImages
                });

                this.getView().setModel(oDisplayModel, "DisplayImagesModel");

            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onAddItemButtonPress: function() {
            var oTable = this.byId("idTable");
            var oModel = oTable.getModel("BedImageModel");
            var aData = oModel.getData();

            // Add new empty record for upload
            aData.push({
                FileName: "",
                FileContent: ""
            });

            oModel.setData(aData);
        },

        BI_onEditButtonPress: function() {
            const oView = this.getView();
            oView.getModel("editable").setProperty("/Edit", true);

            const oModel = oView.getModel("DisplayImagesModel");
            let aImages = oModel.getProperty("/DisplayImages") || [];

            // Count actual images (non-placeholder)
            const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;

            // Decide how many placeholders to show
            const maxImages = 5; // total slots to show
            let placeholdersNeeded = maxImages - realImagesCount;

            // Remove existing placeholders
            aImages = aImages.filter(img => !img.isPlaceholder);

            // Add required placeholders
            for (let i = 0; i < placeholdersNeeded; i++) {
                aImages.push({
                    isPlaceholder: true
                });
            }

            // Update the model
            oModel.setProperty("/DisplayImages", aImages);
        },

        BI_onButtonPress: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails");
        },

        onbranchChange: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        onNameInputLiveChange: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
        onNumber: function (oEvent) {
            utils.onNumber(oEvent.getSource(), "ID");
        },

        BT_onsavebuttonpress: async function() {
            var oView = this.getView();
            var Payload = oView.getModel("BedImageModel").getData();
            var DisplayImagesModel = oView.getModel("DisplayImagesModel").getData();
            if (
                utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("idBedType"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("idRoomtype"), "ID") &&
                utils.onNumber(oView.byId("idR"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("id_MaxBeds"), "ID") &&
                utils.onNumber(oView.byId("id_DepositAmount"), "ID") &&
                 utils._LCstrictValidationComboBox(oView.byId("id_DepositCurrency"), "ID") &&

                utils._LCvalidateMandatoryField(oView.byId("id_Description"), "ID")
            ) {
                var aBedDetails = oView.getModel("BedDetails").getData();


              var attachments = oView.getModel("DisplayImagesModel").getData().DisplayImages || [];

                var uploadedImages = attachments.filter(function (item) {
                    return !item.isPlaceholder;
                });

                // Validation: at least one image required
                if (uploadedImages.length === 0) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseUploadatLeastOneImage"));
                    return;
                }
                var bDuplicate = aBedDetails.some(function(bed) {
                    if (Payload.ID && bed.ID === Payload.ID) return false;
                    return (
                        bed.Name.trim().toLowerCase() === Payload.Name.trim().toLowerCase() &&
                        bed.BranchCode === Payload.BranchCode &&
                        bed.ACType === Payload.ACType
                    );
                });

                if (bDuplicate) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText("bedwithSameBedTypeBranchCodeACTypeAlreadyExists"
                    ));
                    return;
                }

                const toBase64 = (file) => {
                    return new Promise((resolve, reject) => {
                        if (file.src && file.src.startsWith("data:")) {
                            // Already base64
                            resolve(file.src.split(",")[1]);
                        } else if (file.file && file.file instanceof File) {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result.split(",")[1]);
                            reader.onerror = (error) => reject(error);
                            reader.readAsDataURL(file.file);
                        } else {
                            resolve(null);
                        }
                    });
                };

                sap.ui.core.BusyIndicator.show(0);
                // Wait for all image conversions
                const convertedImages = await Promise.all(DisplayImagesModel.DisplayImages.map(toBase64));

                // Payload preparation
                const oData = {
                    data: {
                        BranchCode: Payload.BranchCode,
                        Name: Payload.Name.trim(),
                        ACType: Payload.ACType,
                        NoOfPerson: Payload.NoOfPerson.trim(),
                        MaxBeds: Payload.MaxBeds.trim(),
                        Deposit: Payload.Deposit.trim(),
                        DepositCurrency: Payload.DepositCurrency,
                        Description: Payload.Description    

                    },
                    Attachment: {
                        BranchCode: Payload.BranchCode
                    }
                };

                // Add images (up to 3)
                DisplayImagesModel.DisplayImages.slice(0, 5).forEach((file, index) => {
                    const num = index + 1;
                    oData.Attachment[`Photo${num}`] = convertedImages[index] || "";
                    oData.Attachment[`Photo${num}Name`] = file.fileName || "";
                    oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                });

                // Fill empty placeholders if less than 3
                for (let i = DisplayImagesModel.DisplayImages.length + 1; i <= 5; i++) {
                    oData.Attachment[`Photo${i}`] = "";
                    oData.Attachment[`Photo${i}Name`] = "";
                    oData.Attachment[`Photo${i}Type`] = "";
                }

                var payloadWithoutID = {
                    ...oData
                };
                delete payloadWithoutID.ID;
                sap.ui.core.BusyIndicator.show(0);
                if (Payload.ID) {
                    await this.ajaxUpdateWithJQuery("HM_BedType", {
                        data: payloadWithoutID,
                        filters: {
                            ID: Payload.ID
                        },
                    });
                    await this.refershModel(Payload.ID)
                    this.getView().getModel("editable").setProperty("/Edit", false)

                } else {
                    await this.ajaxCreateWithJQuery("HM_BedType", {
                        data: payloadWithoutID
                    });
                }
                await this.Onsearch();
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(this.i18nModel.getText("bedsavedsuccessfully"));
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }
        },

        onDeleteImage: function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext("DisplayImagesModel");
            const sFileName = oContext.getProperty("fileName");

            const oModel = this.getView().getModel("DisplayImagesModel");
            let aImages = oModel.getProperty("/DisplayImages") || [];

            // STEP 1: Remove ONLY the clicked image
            const index = aImages.findIndex(img => img.fileName === sFileName);

            if (index !== -1) {
                aImages.splice(index, 1); // Delete ONLY one item
            }

            // STEP 2: Remove all placeholders
            const realImages = aImages.filter(img => !img.isPlaceholder);

            // STEP 3: Add placeholders until list reaches 5 items
            const maxImages = 5;
            const placeholdersNeeded = maxImages - realImages.length;

            const finalImages = [...realImages];

            for (let i = 0; i < placeholdersNeeded; i++) {
                finalImages.push({
                    isPlaceholder: true,
                    fileName: null
                });
            }

            // STEP 4: Update Model
            oModel.setProperty("/DisplayImages", finalImages);
        },

        onFileSelected: function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;
            const MAX_SIZE = 2 * 1024 * 1024; // 2MB
            if (oFile.size > MAX_SIZE) {
                sap.m.MessageToast.show(
                    "File Size must be less than 2 MB.\nSelected File Size: " +
                    (oFile.size / 1024 / 1024).toFixed(2) + " MB"
                );

                // reset uploader field
                oEvent.getSource().clear();
                return;
            }

            const oReader = new FileReader();
            oReader.onload = (oLoadEvent) => {
                const sBase64 = oLoadEvent.target.result;
                const oModel = this.getView().getModel("DisplayImagesModel");
                let aImages = oModel.getProperty("/DisplayImages") || [];

                const aRealImages = aImages.filter(img => !img.isPlaceholder);
                const bFileNameDuplicate = aRealImages.some(img => img.fileName === oFile.name);
                if (bFileNameDuplicate) {
                    sap.m.MessageToast.show(`"${oFile.name}" is already Added.`);
                    return;
                }

                const bContentDuplicate = aRealImages.some(img => img.src === sBase64);
                if (bContentDuplicate) {
                    sap.m.MessageToast.show(this.i18nModel.getText("thisImageisalreadyAdded"));
                    return;
                }

                const iPlaceholderIndex = aImages.findIndex(img => img.isPlaceholder);
                const oNewImage = {
                    src: sBase64,
                    fileName: oFile.name,
                    fileType: oFile.type,
                    isPlaceholder: false
                };

                if (iPlaceholderIndex !== -1) {
                    aImages.splice(iPlaceholderIndex, 1, oNewImage);
                } else {
                    aImages.push(oNewImage);
                }

                const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;
                if (realImagesCount < 5) {
                    if (!aImages.some(img => img.isPlaceholder)) {
                        aImages.push({
                            isPlaceholder: true
                        });
                    }
                } else {
                    aImages = aImages.filter(img => !img.isPlaceholder);
                }

                oModel.setProperty("/DisplayImages", aImages);
            };

            oReader.readAsDataURL(oFile);
        },

        onImagePress: function(oEvent) {
            var oSource = oEvent.getSource();
            var sImageSrc = oSource.getSrc();

            var oContext = oSource.getBindingContext("DisplayImagesModel");
            var sFileName = oContext ? oContext.getProperty("fileName") : "Image Preview";

            if (!this._oImageDialog) {

                // FlexBox that fills the dialog fully
                var oFlex = new sap.m.FlexBox({
                    width: "100%",
                    height: "100%",
                    renderType: "Div",
                    justifyContent: "Center",
                    alignItems: "Center",
                    items: [
                        new sap.m.Image({
                            id: this.createId("previewImage"),
                            densityAware: false,
                            width: "100%",
                            height: "100%",
                            style: "object-fit: cover; display:block; margin:0; padding:0;"
                        })
                    ]
                });

                this._oImageDialog = new sap.m.Dialog({
                    title: sFileName,
                    contentWidth: "50%",
                    contentHeight: "60%",
                    draggable: true,
                    resizable: true,
                    horizontalScrolling: false,
                    verticalScrolling: false,
                    contentPadding: "0rem",
                    content: [oFlex],

                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function() {
                            this._oImageDialog.close();
                        }.bind(this)
                    }).addStyleClass("myUnifiedBtn"),

                    afterClose: function() {
                        this._oImageDialog.destroy();
                        this._oImageDialog = null;
                    }.bind(this)
                });
                this.getView().addDependent(this._oImageDialog);
            } else {
                this._oImageDialog.setTitle(sFileName);
            }

            // Set clicked image
            this.byId("previewImage").setSrc(sImageSrc);
            this._oImageDialog.open();
        }
    });
});